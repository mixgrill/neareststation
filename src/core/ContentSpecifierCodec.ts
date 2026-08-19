import type { BinaryCodec } from "./BinaryCodec";
import { ContentSpecifier } from "./ContentSpecifier";

export class ContentSpecifierCodec implements BinaryCodec<ContentSpecifier> {
    
    public encode(object: ContentSpecifier, view: DataView, offset: number, littleEndian?: boolean): number {
        // ContentSpecifier の実体である address (bigint) を 64bit(8バイト) として書き込む
        view.setBigInt64(offset, object.address, littleEndian);
        
        // 書き込んだバイト数（8バイト）を返す
        return 8; 
    }

    public decode(view: DataView, offset: number, littleEndian?: boolean): ContentSpecifier {
        // 64bit(8バイト) の bigint としてアドレスを読み出す
        const address = view.getBigInt64(offset, littleEndian);
        
        // privateコンストラクタを回避して create() で復元するため、
        // 読み込んだアドレス値から各パラメータをマスクを使って抽出する
        const contentType = address & ContentSpecifier.CONTENT_TYPE_MASK;
        const block = address & ContentSpecifier.BLOCK_MASK;
        const contentOffset = address & ContentSpecifier.OFFSET_MASK; // 引数の offset と名前が被るためリネーム
        
        // ファクトリメソッド経由でインスタンスを生成（自動的にバリデーションも実行される）
        return ContentSpecifier.create(contentType, block, contentOffset);
    }
}