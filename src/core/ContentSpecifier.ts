import type { NodeTypeIdentifiable } from "./NodeTypeIdentifiable";

export class ContentSpecifier implements NodeTypeIdentifiable{
    public readonly address:bigint;

    /**
     * アドレスの下位3bitはコンテンツタイプ
     */
    public static readonly CONTENT_TYPE_MASK: bigint = 0b111n;

    /**
     * アドレスの12bit以外のビットはブロックを指定する
     * (~0xFFFn で 12ビットの反転マスクをBigIntで表現)
     */
    public static readonly BLOCK_MASK: bigint = ~0xFFFn;

    /**
     * ブロックの最小単位 0x1000 = 4k bytes
     */
    public static readonly BLOCK_UNIT: bigint = 0x1000n;

    /**
     * 12bit目から7bit目まではブロック中のオフセットを指定する111111000000b
     * ただし、ContentTypeがBのときはOFFSETとのANDは必ずゼロ
     */
    public static readonly OFFSET_MASK: bigint = 0xFC0n;

    /**
     * オフセットの最小単位
     */
    public static readonly OFFSET_UNIT: bigint = 0x40n;

    /**
     * コンテンツタイプ ヘッダ
     */
    public static readonly CONTENT_TYPE_HEADER: bigint = 0b100n;

    /**
     * コンテンツタイプ B ブロック
     */
    public static readonly CONTENT_TYPE_B: bigint = 0b011n;

    /**
     * コンテンツタイプ L ブロック
     */
    public static readonly CONTENT_TYPE_L: bigint = 0b010n;

    /**
     * コンテンツタイプ 空
     */
    public static readonly CONTENT_TYPE_EMPTY: bigint = 0b000n;

    /**
     * コンテンツタイプ 拡張
     */
    public static readonly CONTENT_TYPE_EXTRA: bigint = 0b001n;
    /**
     * コンテンツタイプの全種
     */
    public static readonly CONTENT_TYPES: ReadonlySet<bigint> = new Set([
        ContentSpecifier.CONTENT_TYPE_HEADER,
        ContentSpecifier.CONTENT_TYPE_B,
        ContentSpecifier.CONTENT_TYPE_L,
        ContentSpecifier.CONTENT_TYPE_EXTRA,
        ContentSpecifier.CONTENT_TYPE_EMPTY
    ]);
    
    isLeaf(): boolean {
        return (this.contentType === ContentSpecifier.CONTENT_TYPE_L);
    }
    public get contentType():bigint{
        return this.address & ContentSpecifier.CONTENT_TYPE_MASK;
    }
    public get block():bigint{
        return this.address & ContentSpecifier.BLOCK_MASK;
    }
    public get offset():bigint{
         return this.address & ContentSpecifier.OFFSET_MASK;
    }
    private static validateConstructorArgs(contentType: bigint, block:bigint, offset:bigint){
        if (!ContentSpecifier.CONTENT_TYPES.has(contentType)){
            throw new Error("コンテンツ指定が不正");
        }
        if ((block & ContentSpecifier.BLOCK_MASK) != block){
            throw new Error("ブロックが不正");
        }
        if ((offset & ContentSpecifier.OFFSET_MASK) != offset){
            throw new Error("オフセットの値が不正");
        }
        if (ContentSpecifier.CONTENT_TYPE_B == contentType && offset != 0n){
            throw new Error("コンテンツ指定がBのときはOFFSETは0でなければならない");
        }
    }
    private static createAddress(contentType:bigint, block:bigint, offset:bigint):bigint{
        return contentType | block | offset;
    }
    private constructor(address:bigint){
        this.address = address;
    }
    public static create(contentType:bigint, block:bigint, offset:bigint):ContentSpecifier{
        ContentSpecifier.validateConstructorArgs(contentType, block, offset);
        return new ContentSpecifier(
            ContentSpecifier.createAddress(contentType, block, offset)
        );        
    }
    public static copy(spec:ContentSpecifier):ContentSpecifier{
        return ContentSpecifier.create(spec.contentType, spec.block, spec.offset);
    }
    public static readonly emptySpec: ContentSpecifier = ContentSpecifier.create(ContentSpecifier.CONTENT_TYPE_EMPTY,0n,0n);
    public static readonly rootSpec: ContentSpecifier =  ContentSpecifier.create(ContentSpecifier.CONTENT_TYPE_B,0n,0n);
    public static toBlockOff(block: bigint, offset:bigint){
        return block | offset;
    }
    public getKey():string{
        return `contentspecifier-${this.address}`;
    }
}