import { BoundingRectangle } from "./BoundingRectangle";
import { ContentSpecifier } from "./ContentSpecifier";
export class BRecord{
    public static readonly BRECORD_MAX_DATA_SIZE = 7;
    public static readonly BRECORD_BINARY_SIZE = 64;
    /*
     * BRecordの想定物理構造
     * BRecordは64bytes以内に収まる必要がある。
     * 4096BytesのBBlock中に64個のBRecordを詰め込む。
     * 0x00-0x2F 境界矩形領域
     *   0x00-0x07 下限X 8bytes
     *   0x08-0x0F 上限X 8bytes
     *   0x10-0x17 下限Y 8bytes
     *   0x18-0x1F 上限Y 8bytes
     *   0x20-0x27 予約（今の所3次元に拡張するつもりがないが拡張することを考えて予約）8bytes
     *   0x28-0x2F 予約（今の所3次元に拡張するつもりがないが拡張することを考えて予約）8bytes
     * 0x30-0x37 BRecordの内容指定子(address) 8bytes
     * 0x38-0x3F 自由データ領域 これで64byte
     *   0x38 自由データデータサイズ 1 byte
     *   0x39-3F 自由データ本体 7 bytes
     */
    /**
     * 境界矩形
     */
    public readonly mbr: BoundingRectangle;
    /**
     * コンテンツ指定（アドレス）
     */
    public readonly contentSpec: ContentSpecifier;

    /**
     * データサイズ
     */
    public readonly dataSize: number;

    /**
     * データ
     */
    public readonly data: ArrayBuffer;
    
    public static readonly STORABLE_CONTENT_TYPES: ReadonlySet<bigint> = new Set([
        ContentSpecifier.CONTENT_TYPE_B, ContentSpecifier.CONTENT_TYPE_L, ContentSpecifier.CONTENT_TYPE_EMPTY
    ]);

    public static readonly EMPTY_RECORD = new BRecord(new BoundingRectangle(0,0,0,0), ContentSpecifier.create(ContentSpecifier.CONTENT_TYPE_EMPTY,0n,0n),0,new ArrayBuffer())
    public constructor(mbr:BoundingRectangle, contentSpec: ContentSpecifier, dataSize: number, data: ArrayBuffer){
        if (!BRecord.STORABLE_CONTENT_TYPES.has(contentSpec.contentType)){
            throw new Error("BRecordに格納不能なcontentTypeが指定された")
        }
        if (dataSize < 0){
            throw new Error("dataSize は0以上でなければなりません");
        }
        if (dataSize > BRecord.BRECORD_MAX_DATA_SIZE){
            throw new Error("dataSize はBRECORD_MAX_DATA_SIZE以下でなければなりません");
        }
        this.mbr = mbr;
        this.contentSpec = contentSpec;
        this.dataSize = dataSize;
        // 改善点: 常に最大サイズ(7バイト)の固定長バッファを確保する
        this.data = new ArrayBuffer(BRecord.BRECORD_MAX_DATA_SIZE);

        if (dataSize > 0) {
            const destView = new Uint8Array(this.data);
            const srcView = new Uint8Array(data, 0, dataSize);
            
            // 必要なデータ長だけをコピーする。
            // 転送されなかった残りの領域は、ArrayBufferの仕様により自動的に 0x00 で初期化される
            destView.set(srcView); 
        }
    }
    public getKey():string{
        return `${this.mbr.getKey()}-${this.contentSpec.getKey()}`
    }
}