export interface IOFunctions {
    getUsedSize():bigint;
    getAllocatedSize():bigint;
    /** 同期する */
    sync():Promise<void>;
     /**
     * 該当アドレスからサイズ分のデータを読み出す。
     * @param address アドレス
     * @param size サイズ
     * @param dest 転送先
     * @return 転送したバイト数のプロミス
     */
    read(address:bigint, size:number, dest:Uint8Array):Promise<number>

    /**
     * 該当アドレスにサイズ分のデータを書き出す
     * @param address アドレス
     * @param size サイズ
     * @param src 転送元
     * @return 転送したバイト数
     * @throws OutOfUsedAddressException 使用済みではない領域にアクセスしようとした場合にthrow
     */
    write(address:bigint, size:number, src:Uint8Array):Promise<number>;

    /**
     * 該当アドレスからサイズ分の領域が確保済みかどうか判定する。
     * @param address アドレス
     * @param size サイズ
     * @return 確保済みの場合true
     */
    isAllocated(address:bigint, size:number):boolean;

    /**
     * フリー領域を取得し使用済みにする。
     * @param size サイズ
     * @param align 境界指定 0x40 64 byte境界、0x1000 4096 byte境界
     * @return フリー領域の先頭アドレス
     * @throws OutOfAllocatedAddressException 割当済み領域のうち未使用領域のサイズが確保しようとした領域に満たないときthrow
     */
    getFree(size:number, align:number):bigint;

    /**
     * 割当済み領域ー（使用済み領域align考慮）を返す
     * @param align アラインメント  
     */
    getRemainSize(align:number):bigint;
    /**
     * 記憶域を2倍に拡張する
     */
    expand():Promise<void>;
    /**
     * 割当済み領域を使用済み領域まで縮小する
     */
    shrink():Promise<void>;
}