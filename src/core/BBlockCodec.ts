import type { BinaryCodec } from "./BinaryCodec";
import { BBlock } from "./BBlock";
import { BRecord } from "./BRecord";
import { BRecordCodec } from "./BRecordCodec";
import { ContentSpecifier } from "./ContentSpecifier";

export class BBlockCodec implements BinaryCodec<BBlock> {
    private readonly recordCodec = new BRecordCodec();

    /**
     * BBlock のバイナリサイズ (64 bytes × 64個 = 4096 bytes / 4KB)
     */
    public static readonly B_BLOCK_BINARY_SIZE = BRecord.BRECORD_BINARY_SIZE * BBlock.B_BLOCK_MAX_MEMBER;

    public encode(object: BBlock, view: DataView, offset: number, littleEndian?: boolean): number {
        let currentOffset = offset;
        let writtenCount = 0;

        // 1. 存在する BRecord を順次書き込み (最大64個)
        for (const record of object.members.values()) {
            this.recordCodec.encode(record, view, currentOffset, littleEndian);
            currentOffset += BRecord.BRECORD_BINARY_SIZE;
            writtenCount++;
        }

        // 2. 64個に満たない余白領域を BRecord.EMPTY_RECORD で埋める
        for (let i = writtenCount; i < BBlock.B_BLOCK_MAX_MEMBER; i++) {
            this.recordCodec.encode(BRecord.EMPTY_RECORD, view, currentOffset, littleEndian);
            currentOffset += BRecord.BRECORD_BINARY_SIZE;
        }

        // 全体で必ず 4096 バイトを消費する
        return BBlockCodec.B_BLOCK_BINARY_SIZE;
    }

    public decode(view: DataView, offset: number, littleEndian?: boolean): BBlock {
        const block = new BBlock();
        let currentOffset = offset;

        // 固定で64個分の BRecord を順次デコード
        for (let i = 0; i < BBlock.B_BLOCK_MAX_MEMBER; i++) {
            const record = this.recordCodec.decode(view, currentOffset, littleEndian);
            
            // 空レコード（CONTENT_TYPE_EMPTY）は除外して、有効なレコードのみ add する
            if (record.contentSpec.contentType !== ContentSpecifier.CONTENT_TYPE_EMPTY) {
                block.add(record);
            }

            currentOffset += BRecord.BRECORD_BINARY_SIZE;
        }

        return block;
    }
}