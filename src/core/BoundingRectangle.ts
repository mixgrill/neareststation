export class BoundingRectangle{
  public readonly minX: number;
  public readonly minY: number;
  public readonly maxX: number;
  public readonly maxY: number;
  // 大量生成時のオーバーヘッドを避けるため、静的バッファ（8バイト）を使い回す
  private static readonly buffer = new ArrayBuffer(8);
  private static readonly view = new DataView(BoundingRectangle.buffer);
  public static readonly NEVER_WRAP:BoundingRectangle  = new BoundingRectangle(
          +Infinity,
          +Infinity,
          -Infinity,
          -Infinity
  );
  public static readonly ANY_WRAP:BoundingRectangle = new BoundingRectangle(
          -Infinity,
          -Infinity,
          +Infinity,
          +Infinity
  );
  public static intersect(a:BoundingRectangle,b:BoundingRectangle):BoundingRectangle|null{
    const minX = Math.max(a.minX, b.minX);
    const maxX = Math.min(a.maxX, b.maxX);
    const minY = Math.max(a.minY, b.minY);
    const maxY = Math.min(a.maxY, b.maxY);
    if (minX <= maxX && minY <= maxY){
      return new BoundingRectangle(minX,minY,maxX,maxY);
    }else{
      return null;
    }
  }
  public static enclose(a:BoundingRectangle,b:BoundingRectangle):BoundingRectangle|null{
    const minX = Math.min(a.minX, b.minX);
    const maxX = Math.max(a.maxX, b.maxX);
    const minY = Math.min(a.minY, b.minY);
    const maxY = Math.max(a.maxY, b.maxY);
    if (minX <= maxX && minY <= maxY){
      return new BoundingRectangle(minX,minY,maxX,maxY);
    }else{
      return null;
    }
  }
  constructor(minX: number, minY: number, maxX: number, maxY: number) {
    if (Number.isNaN(minX) || Number.isNaN(minY) ||
    Number.isNaN(maxX) || Number.isNaN(maxY)) {
        throw new Error("NaN is not allowed");
    }
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  }
  /**
   * number（IEEE 754 double）の 64 ビットバイナリ表現を 16 桁の Hex 文字列に変換
   */
  private static doubleToHex(value: number): string {
    BoundingRectangle.view.setFloat64(0, value, false); // ビッグエンディアンで設定
    const high = BoundingRectangle.view.getUint32(0, false).toString(16).padStart(8, '0');
    const low = BoundingRectangle.view.getUint32(4, false).toString(16).padStart(8, '0');
    return high + low;
  }
  public getKey():string{
    // 4 つの座標の 64bit バイナリ（Hex）をハイフン等で結合
    return `${BoundingRectangle.doubleToHex(this.minX)}-` +
           `${BoundingRectangle.doubleToHex(this.minY)}-` +
           `${BoundingRectangle.doubleToHex(this.maxX)}-` +
           `${BoundingRectangle.doubleToHex(this.maxY)}`;
  }
}