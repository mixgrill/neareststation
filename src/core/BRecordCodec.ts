import type { BinaryCodec } from "./BinaryCodec";
import { BRecord } from "./BRecord";
import { BoundingRectangleCodec } from "./BoundingRectangleCodec";
import { ContentSpecifierCodec } from "./ContentSpecifierCodec";

export class BRecordCodec implements BinaryCodec<BRecord> {
    private readonly mbrCodec = new BoundingRectangleCodec();
    private readonly contentSpecCodec = new ContentSpecifierCodec();

    public encode(object: BRecord, view: DataView, offset: number, littleEndian?: boolean): number {
        // 0x00-0x1F (32 bytes): 境界矩形領域 (BoundingRectangle)
        // BoundingRectangle は内部で 8bytes × 4 = 32bytes を消費する
        this.mbrCodec.encode(object.mbr, view, offset, littleEndian);
        
        // 0x20-0x2F (16 bytes): 予約領域 (将来の3次元拡張用等)
        // ゴミデータが残らないよう明示的にゼロクリアしておく
        view.setBigInt64(offset + 32, 0n, littleEndian);
        view.setBigInt64(offset + 40, 0n, littleEndian);

        // 0x30-0x37 (8 bytes): BRecordの内容指定子 (ContentSpecifier)
        this.contentSpecCodec.encode(object.contentSpec, view, offset + 48, littleEndian);

        // 0x38 (1 byte): 自由データサイズ
        view.setUint8(offset + 56, object.dataSize);

        // 0x39-0x3F (7 bytes): 自由データ本体
        // コンストラクタで data は常に 7 バイトに固定されているため、ループ処理なしで一括コピー
        const destArr = new Uint8Array(view.buffer, view.byteOffset + offset + 57, BRecord.BRECORD_MAX_DATA_SIZE);
        const srcArr = new Uint8Array(object.data);
        destArr.set(srcArr);

        // 総書き込みサイズ: 64 bytes
        return BRecord.BRECORD_BINARY_SIZE;
    }

    public decode(view: DataView, offset: number, littleEndian?: boolean): BRecord {
        // 0x00-0x1F: 境界矩形
        const mbr = this.mbrCodec.decode(view, offset, littleEndian);
        
        // 0x20-0x2F (offset + 32 〜 47) は予約領域なので読み飛ばす

        // 0x30-0x37: 内容指定子
        const contentSpec = this.contentSpecCodec.decode(view, offset + 48, littleEndian);

        // 0x38: 自由データサイズ
        const dataSize = view.getUint8(offset + 56);

        // 0x39-0x3F: 自由データ本体
        // BRecord生成用に7バイトのバッファを用意し、DataViewの裏にあるバッファから直接一括コピー
        const data = new ArrayBuffer(BRecord.BRECORD_MAX_DATA_SIZE);
        const destArr = new Uint8Array(data);
        const srcArr = new Uint8Array(view.buffer, view.byteOffset + offset + 57, BRecord.BRECORD_MAX_DATA_SIZE);
        destArr.set(srcArr);

        // 復元したデータを使ってインスタンス化
        return new BRecord(mbr, contentSpec, dataSize, data);
    }
}