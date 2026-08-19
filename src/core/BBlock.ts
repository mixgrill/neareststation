import { BRecord } from "./BRecord";
import { ContentSpecifier } from "./ContentSpecifier";
/**
 * BBlockはRTreeの中間ノードを格納するためのクラス
 * 基本的にBRecordを格納するためのものだが、限界を超えて値を入れたり、
 * 空のコンテンツは格納できない。
 * BBlockはBレコード領域に4096の境界で配置される。
 * 64bytes のBRecord * 64個で4096バイトなので64個のBRecordまで保存できる。
 * 物理フォーマット上は64個に満たない部分は空のBRecordで埋められるが、
 * BBlockとしては空のBRecordは持たない。
 * （空のBRecordはキーが同じになり、Mapに格納できないが、
 * それを解消するために配列を採用すると性能が落ちるし、実益がないため）
 * そのため、Codec側では空のBRecordに対する考慮が必要
 * 微妙なところだがBRecord.getKeyはコンテンツ指定として別であれば、別となるので
 * 同じMBRでコンテンツが違う場所であれば格納可能であるが、
 * 同じMBRで同じコンテンツ指定のものがあれば同時には格納できない。（あと勝ちで上書き）
 */
export class BBlock{
    /**
     * 中間ノードの最大メンバは64固定
     */
    public static B_BLOCK_MAX_MEMBER = 64;
    private _members:Map<string, BRecord>;
    public get members():ReadonlyMap<string,BRecord>{
        return this._members;
    }
    public add(rec:BRecord):void{
        if (!this._members.has(rec.getKey()) && this._members.size >= BBlock.B_BLOCK_MAX_MEMBER){
            throw new Error("64を超えてメンバーは入れられません");
        }
        if (rec.contentSpec.contentType === ContentSpecifier.CONTENT_TYPE_EMPTY){
            throw new Error("空のコンテンツ指定入れられない");
        }
        this._members.set(rec.getKey(),rec)
    }
    public delete(rec:BRecord):void{
        this._members.delete(rec.getKey());
    }
    public constructor(){
        this._members = new Map();
    }
}