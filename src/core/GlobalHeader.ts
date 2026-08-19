import type { BoundingRectangle } from "./BoundingRectangle";

/**
 * グローバルヘッダ
 */
export class GlobalHeader {
    /*
     * GlobalHeaderの想定物理構造
     * 0x00-0x03 magic 'rtbf'
     * 0x04-0x07 version 32bit int 1 を設定する予定
     * 0x08-0x1F セクション１（内部ノード格納用エリア）の位置サイズ情報 64bit*3
     *   0x08-0x0F セクション１＝内部ノード格納用のファイルの先頭をゼロとしたときの位置 64bit
     *   0x10-0x17 セクション１＝内部ノード格納用のサイズ 64bit
     *   0x18-0x1F セクション１＝内部ノード格納用の使用サイズ 64bit
     * 0x20-0x37 セクション２（葉ノード格納用エリア）の位置サイズ情報 64bit*3
     *   0x20-0x27 セクション２＝葉ノード格納用のファイルの先頭をゼロとしたときの位置 64bit
     *   0x28-0x2F セクション２＝葉ノード格納用のサイズ 64bit
     *   0x30-0x37 セクション２＝葉ノード格納用の使用サイズ 64bit
     * 0x38-0x4F セクション３（拡張情報格納用エリア）の位置サイズ情報  64bit*3
     *   0x38-0x3F セクション３＝拡張情報格納用のファイルの先頭をゼロとしたときの位置 64bit
     *   0x40-0x47 セクション３＝拡張情報格納用のサイズ 64bit
     *   0x48-0x4F セクション３＝拡張情報格納用の使用サイズ 64bit
     * 0x50-0x7F ルートノードの境界矩形保持領域
     *   0x50-0x57 下限X
     *   0x58-0x5F 上限X
     *   0x60-0x67 下限Y
     *   0x68-0x6F 上限Y
     *   0x70-0x77 予約（今の所3次元に拡張するつもりがないが拡張することを考えて予約）
     *   0x78-0x7F 予約（今の所3次元に拡張するつもりがないが拡張することを考えて予約）
     */
    public static readonly RTBF_MAGIC="rtbf";
    /**
     * マジック値 "rtbf" 4bytes
     */
    public readonly magic: string;

    /**
     * RTBFのバージョン値
     */
    public readonly version: number;

    /**
     * セクション１＝内部ノード格納用のファイルの先頭をゼロとしたときの位置 64bit
     */
    public readonly section1Start:bigint;

    /**
     * セクション１＝内部ノード格納用のサイズ 64bit
     */
    public readonly section1AllocSize:bigint;

    /**
     * セクション１＝内部ノード格納用の使用サイズ 64bit
     */
    public readonly section1UsedSize:bigint;

    /**
     * セクション２＝葉ノード格納用のファイルの先頭をゼロとしたときの位置 64bit
     */
    public readonly section2Start:bigint;

    /**
     * セクション２＝葉ノード格納用のサイズ 64bit
     */
    public readonly section2AllocSize:bigint;

    /**
     * セクション２＝葉ノード格納用の使用サイズ 64bit
     */
    public readonly section2UsedSize:bigint;

    /**
     * セクション３＝拡張情報格納用のファイルの先頭をゼロとしたときの位置 64bit
     */
    public readonly section3Start:bigint;

    /**
     * セクション３＝拡張情報格納用のサイズ 64bit
     */
    public readonly section3AllocSize:bigint;

    /**
     * セクション３＝拡張情報格納用の使用サイズ 64bit
     */
    public readonly section3UsedSize:bigint;

    /**
     * ルートノードの境界矩形領域
     */
    public readonly rootMbr:BoundingRectangle;
    /**
    /**
     * コンストラクタ
     * @param magic 'rtbf'
     * @param version RTBFのバージョン
     * @param section1Start 内部ノード格納用のファイルの先頭をゼロとしたときの位置
     * @param section1AllocSize 内部ノード格納用のサイズ
     * @param section1UsedSize 内部ノード格納用の使用サイズ
     * @param section2Start 葉ノード格納用のファイルの先頭をゼロとしたときの位置
     * @param section2AllocSize 葉ノード格納用のサイズ
     * @param section2UsedSize 葉ノード格納用の使用サイズ
     * @param section3Start 拡張情報格納用のファイルの先頭をゼロとしたときの位置
     * @param section3AllocSize 拡張情報格納用のサイズ
     * @param section3UsedSize 拡張情報格納用の使用サイズ
     * @param rootMbr ルートノードの境界矩形領域
     */
    public constructor(
            magic: string,
            version: number,
            section1Start:bigint,
            section1AllocSize:bigint,
            section1UsedSize:bigint,
            section2Start:bigint,
            section2AllocSize: bigint,
            section2UsedSize:bigint,
            section3Start:bigint,
            section3AllocSize:bigint,
            section3UsedSize:bigint,
            rootMbr:BoundingRectangle) {
        if (GlobalHeader.RTBF_MAGIC != magic){
            throw new Error("magic は 'rtbf' でなければいけません。");
        }
        this.magic = magic;
        this.version = version;
        this.section1Start = section1Start;
        this.section1AllocSize = section1AllocSize;
        this.section1UsedSize = section1UsedSize;
        this.section2Start = section2Start;
        this.section2AllocSize = section2AllocSize;
        this.section2UsedSize = section2UsedSize;
        this.section3Start = section3Start;
        this.section3AllocSize = section3AllocSize;
        this.section3UsedSize = section3UsedSize;
        this.rootMbr = rootMbr;
    }
}