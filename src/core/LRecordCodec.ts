import type { BinaryCodec } from "./BinaryCodec";
import { LRecord } from "./LRecord";
import { ContentSpecifierCodec } from "./ContentSpecifierCodec";

export class LRecordCodec implements BinaryCodec<LRecord> {
    private readonly contentSpecCodec = new ContentSpecifierCodec();

    public static readonly LRECORD_BINARY_SIZE = 64;

    public encode(object: LRecord, view: DataView, offset: number, littleEndian?: boolean): number {
        // 0x00-0x07 (8 bytes): dataSize (bigint)
        view.setBigInt64(offset, object.dataSize, littleEndian);

        // 0x08-0x0F (8 bytes): 拡張領域へのポインタ (ContentSpecifier)
        this.contentSpecCodec.encode(object.extContentSpec, view, offset + 8, littleEndian);

        // 0x10-0x3F (48 bytes): 自由データ領域 (常に 48 バイト固定)
        const destArr = new Uint8Array(view.buffer, view.byteOffset + offset + 16, LRecord.LRECORD_MAX_DATA_SIZE);
        const srcArr = new Uint8Array(object.data);
        destArr.set(srcArr);

        return LRecordCodec.LRECORD_BINARY_SIZE; // 64 bytes
    }

    public decode(view: DataView, offset: number, littleEndian?: boolean): LRecord {
        // 0x00-0x07 (8 bytes): dataSize (bigint)
        const dataSize = view.getBigInt64(offset, littleEndian);

        // 0x08-0x0F (8 bytes): 拡張領域へのポインタ
        const extContentSpec = this.contentSpecCodec.decode(view, offset + 8, littleEndian);

        // 0x10-0x3F (48 bytes): 自由データ本体
        const data = new ArrayBuffer(LRecord.LRECORD_MAX_DATA_SIZE);
        const destArr = new Uint8Array(data);
        const srcArr = new Uint8Array(view.buffer, view.byteOffset + offset + 16, LRecord.LRECORD_MAX_DATA_SIZE);
        destArr.set(srcArr);

        return new LRecord(dataSize, extContentSpec, data);
    }
}