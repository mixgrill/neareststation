/**
 * バイナリコーデックのインターフェース
 * @template T 変換元、変換先の型
 */
export interface BinaryCodec<T> {
  /**
   * 指定された DataView の指定オフセット位置にオブジェクトを書き込みます。
   */
  encode?(object: T, view: DataView, offset: number, littleEndian?: boolean): number;

  /**
   * 指定された DataView の指定オフセット位置からオブジェクトを読み出します。
   * 読み込んだバイト数を返す、または次の読み込み位置を管理する設計にすると便利です。
   */
  decode(view: DataView, offset: number, littleEndian?: boolean): T;
}