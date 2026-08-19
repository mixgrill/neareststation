import type { BinaryCodec } from "./BinaryCodec";
import { BoundingRectangle } from "./BoundingRectangle"

export class BoundingRectangleCodec implements BinaryCodec<BoundingRectangle>{
    encode(object: BoundingRectangle, view: DataView, offset: number, littleEndian?: boolean): number {
        view.setFloat64(offset, object.minX, littleEndian);
        view.setFloat64(offset + 8, object.maxX, littleEndian);
        view.setFloat64(offset + 16, object.minY, littleEndian);
        view.setFloat64(offset + 24, object.maxY, littleEndian);
        
        // 書き込んだバイト数（8バイト × 4 = 32バイト）を返す
        // ※BinaryCodecの仕様上、次の書き込み開始位置（offset + 32）を返すルールの場合は変更してください
        return 32;
    }
    decode(view: DataView, offset: number, littleEndian?: boolean): BoundingRectangle {
        const minX = view.getFloat64(offset, littleEndian);
        const maxX = view.getFloat64(offset + 8, littleEndian);
        const minY = view.getFloat64(offset + 16, littleEndian);
        const maxY = view.getFloat64(offset + 24, littleEndian);
    
        return new BoundingRectangle(minX, minY, maxX, maxY);
    }
}