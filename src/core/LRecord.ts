import { ContentSpecifier } from "./ContentSpecifier";

export class LRecord {
    /**
     * LRecordのdata使用領域 + 拡張領域のdata使用量
     * 8 bytes
     */
    public readonly dataSize: bigint;
    
    /**
     * 拡張領域へのポインタ
     *  8 bytes
     */
    public readonly extContentSpec: ContentSpecifier;
    /**
     * LRecord データサイズ
     */
    public static readonly LRECORD_MAX_DATA_SIZE = 48;
    /**
     * データ領域 常に48bytes固定
     */
    public readonly data: ArrayBuffer;

    /**
     * コンストラクタ
     * @param dataSize データサイズ 
     * @param extContentSpec 拡張領域のアドレス
     * @param data データ
     */
    public constructor(dataSize: bigint, extContentSpec: ContentSpecifier, data: ArrayBuffer) {
        this.dataSize = dataSize;
        if (dataSize < 0) {
            throw new Error("dataSize は0以上でなければならない");
        }
        if (dataSize <= LRecord.LRECORD_MAX_DATA_SIZE) {
            if (extContentSpec.contentType != ContentSpecifier.CONTENT_TYPE_EMPTY) {
                throw new Error("データ長がLRecordのData長のサイズ以下のときは空のコンテンツしか設定できません");
            }
        } else if (dataSize > LRecord.LRECORD_MAX_DATA_SIZE) {
            if (extContentSpec.contentType != ContentSpecifier.CONTENT_TYPE_EXTRA) {
                throw new Error("データ長がLRecordのData長のサイズ以上のときは拡張コンテンツしか指定できません");
            }
        }
        this.extContentSpec = extContentSpec;

        // 常に最大サイズ（48バイト）の固定長バッファを確保
        this.data = new ArrayBuffer(LRecord.LRECORD_MAX_DATA_SIZE);

        if (dataSize > 0) {
            const allocDataSize = dataSize > LRecord.LRECORD_MAX_DATA_SIZE ? LRecord.LRECORD_MAX_DATA_SIZE : Number(dataSize);
            const destView = new Uint8Array(this.data);
            const srcView = new Uint8Array(data, 0, allocDataSize);
            
            // 必要なデータ長だけをコピー（残りの領域は 0x00 でパディングされる）
            destView.set(srcView);
        }
    }
}