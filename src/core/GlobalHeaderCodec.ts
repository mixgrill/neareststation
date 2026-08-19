import type { BinaryCodec } from "./BinaryCodec";
import { GlobalHeader } from "./GlobalHeader";
import { BoundingRectangleCodec } from "./BoundingRectangleCodec"; // 依存するCodecをインポート

export class GlobalHeaderCodec implements BinaryCodec<GlobalHeader> {
    // 内部で利用する BoundingRectangle 用のコーデック
    private readonly mbrCodec = new BoundingRectangleCodec();

    public encode(object: GlobalHeader, view: DataView, offset: number, littleEndian?: boolean): number {
        // 0x00-0x03 (4 bytes): magic 'rtbf'
        const magicStr = object.magic;
        for (let i = 0; i < 4; i++) {
            // 文字列長が足りない場合は 0x00 でパディング（Javaの byte[] 初期値と同じ挙動）
            view.setUint8(offset + i, i < magicStr.length ? magicStr.charCodeAt(i) : 0);
        }

        // 0x04-0x07 (4 bytes): version (32bit int)
        view.setInt32(offset + 4, object.version, littleEndian);

        // 0x08-0x1F (24 bytes): セクション1
        view.setBigInt64(offset + 8, object.section1Start, littleEndian);
        view.setBigInt64(offset + 16, object.section1AllocSize, littleEndian);
        view.setBigInt64(offset + 24, object.section1UsedSize, littleEndian);

        // 0x20-0x37 (24 bytes): セクション2
        view.setBigInt64(offset + 32, object.section2Start, littleEndian);
        view.setBigInt64(offset + 40, object.section2AllocSize, littleEndian);
        view.setBigInt64(offset + 48, object.section2UsedSize, littleEndian);

        // 0x38-0x4F (24 bytes): セクション3
        view.setBigInt64(offset + 56, object.section3Start, littleEndian);
        view.setBigInt64(offset + 64, object.section3AllocSize, littleEndian);
        view.setBigInt64(offset + 72, object.section3UsedSize, littleEndian);

        // 0x50- (32 bytes想定): ルートノードの境界矩形 (BoundingRectangleCodec へ委譲)
        this.mbrCodec.encode(object.rootMbr, view, offset + 80, littleEndian);

        // 0x70-0x7F (16 bytes): 予約領域を 0埋め (拡張用)
        view.setBigInt64(offset + 112, 0n, littleEndian);
        view.setBigInt64(offset + 120, 0n, littleEndian);

        // 合計書き込みサイズ (128 bytes = 0x80) を返す
        return 128;
    }

    public decode(view: DataView, offset: number, littleEndian?: boolean): GlobalHeader {
        // 0x00-0x03: magic
        let magic = "";
        for (let i = 0; i < 4; i++) {
            const b = view.getUint8(offset + i);
            if (b !== 0) { // 0x00 埋めされている場合は文字列に含めない
                magic += String.fromCharCode(b);
            }
        }

        // 0x04-0x07: version
        const version = view.getInt32(offset + 4, littleEndian);

        // 0x08-0x1F: セクション1
        const section1Start = view.getBigInt64(offset + 8, littleEndian);
        const section1AllocSize = view.getBigInt64(offset + 16, littleEndian);
        const section1UsedSize = view.getBigInt64(offset + 24, littleEndian);

        // 0x20-0x37: セクション2
        const section2Start = view.getBigInt64(offset + 32, littleEndian);
        const section2AllocSize = view.getBigInt64(offset + 40, littleEndian);
        const section2UsedSize = view.getBigInt64(offset + 48, littleEndian);

        // 0x38-0x4F: セクション3
        const section3Start = view.getBigInt64(offset + 56, littleEndian);
        const section3AllocSize = view.getBigInt64(offset + 64, littleEndian);
        const section3UsedSize = view.getBigInt64(offset + 72, littleEndian);

        // 0x50-: ルートノードの境界矩形 (BoundingRectangleCodec へ委譲)
        const rootMbr = this.mbrCodec.decode(view, offset + 80, littleEndian);

        // コンストラクタで復元
        return new GlobalHeader(
            magic, version,
            section1Start, section1AllocSize, section1UsedSize,
            section2Start, section2AllocSize, section2UsedSize,
            section3Start, section3AllocSize, section3UsedSize,
            rootMbr
        );
    }
}