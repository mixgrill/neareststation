import type { Content } from "leaflet";
import type { BBlock } from "./BBlock";
import { BoundedNodeRef } from "./BoundedNodeRef";
import { BoundingRectangle } from "./BoundingRectangle";
import { bBlockCodec, globalHeaderCodec, lRecordCodec } from "./CodecRegistry";
import { ContentSpecifier } from "./ContentSpecifier";
import type { GlobalHeader } from "./GlobalHeader";
import type { IOFunctions } from "./IOFunctions";
import type { IRTreeNode } from "./IRTreeNode";
import type { IRTreeSystem } from "./IRTreeSystem";
import { RTreeNodeB } from "./RTreeNodeB";
import { RTreeNodeRef } from "./RTreeNodeRef";
import type { LRecord } from "./LRecord";
import { RTreeNodeL } from "./RTreeNodeL";
import { bogoGeoCalulator, GeoPoint, LineString } from "./GeoPoint";
interface RankedMember<T> {
    member: T;
    score: number;
}
abstract class RankData<T> {
    public readonly numMember: number;
    private _members: Array<RankedMember<T>> = []
    public members: ReadonlyArray<RankedMember<T>> = this._members;

    bestScore = -Infinity;
    worstScore = Infinity;

    abstract calcScore(t: T): number;

    constructor(numMember: number) {
        this.numMember = numMember;
    }

    tryInsert(newMember: T): boolean {
        const score = this.calcScore(newMember);

        if (this._members.length < this.numMember) {
            this._members.push({
                member: newMember,
                score
            });

            this._members.sort((a, b) => b.score - a.score);
            this.updateScores();

            return true;
        }

        if (score <= this.worstScore) {
            return false;
        }

        this._members.push({
            member: newMember,
            score
        });

        this._members.sort((a, b) => b.score - a.score);
        this._members.pop();

        this.updateScores();

        return true;
    }

    private updateScores(): void {
        this.bestScore = this.members[0].score;
        this.worstScore =
            this.members[this.members.length - 1].score;
    }
}
class NearestRankData extends RankData<any>{
    private p:GeoPoint
    
    override tryInsert(newMember: any): boolean {
        const coordinates = newMember['geometry']['coordinates'];
        const lineString = new LineString(Array.from(coordinates).map((c)=>{
            const a = c as Array<any>
            return new GeoPoint(a[0],a[1]);}
        ));
        const nearest = bogoGeoCalulator.nearestPointLineString(this.p, lineString);
        return super.tryInsert({geoPoint:nearest.geoPoint, distance:nearest.num ,... newMember })
    }
    override calcScore(t: any): number {
        return -t.distance;
    }
    constructor(numMember: number, p:GeoPoint){
        super(numMember);
        this.p = p;
    }
}

function worstDistance(mbr:BoundingRectangle, point:GeoPoint):number{
    return Math.max(
        bogoGeoCalulator.distance(new GeoPoint(mbr.minX,mbr.minY),point),
        bogoGeoCalulator.distance(new GeoPoint(mbr.maxX,mbr.minY),point),
        bogoGeoCalulator.distance(new GeoPoint(mbr.minX,mbr.maxY),point),
        bogoGeoCalulator.distance(new GeoPoint(mbr.maxX,mbr.maxY),point));
}
export class RTreeSystemImpl implements IRTreeSystem<ContentSpecifier,Uint8Array>{
    private readonly io:IOFunctions;
    private globalHeader:GlobalHeader|null = null;
    private constructor(io:IOFunctions, globalHeader:GlobalHeader){
        this.io = io;
        this.globalHeader = globalHeader;
    }
    private rankShrinkedMbr(rankData:NearestRankData,centerPoint:GeoPoint):BoundingRectangle{
        if (rankData.members.length < rankData.numMember){
            return BoundingRectangle.ANY_WRAP;
        }
        const worstDistance = rankData.members[rankData.members.length -1].member.distance;
        const northPoint = bogoGeoCalulator.moveLatitude(centerPoint, worstDistance+10);
        const southPoint = bogoGeoCalulator.moveLatitude(centerPoint, -worstDistance-10);
        const longRange = Array.from([northPoint, southPoint]).reduce((prev,cur)=>{
            const westMost = bogoGeoCalulator.moveLongitude(cur, -worstDistance-10);
            const eastMost = bogoGeoCalulator.moveLongitude(cur, +worstDistance+10);
            let minLong:number;
            if (prev.minLong > westMost.longitude){
                minLong = westMost.longitude;
            }else{
                minLong = prev.minLong;
            }
            let maxLong:number;
            if (prev.maxLong < eastMost.longitude){
                maxLong = eastMost.longitude;
            }else{
                maxLong = prev.maxLong;
            }
            return {minLong:minLong,maxLong:maxLong};
        },{minLong:+Infinity, maxLong:-Infinity})
        const minY = Math.min(northPoint.latitude, southPoint.latitude);
        const maxY = Math.max(northPoint.latitude, southPoint.latitude);
        return new BoundingRectangle(longRange.minLong,minY,longRange.maxLong, maxY);
    }
    private async *intersectNode(
        bnr: BoundedNodeRef<ContentSpecifier>,
        rect: BoundingRectangle
    ): AsyncIterable<BoundedNodeRef<ContentSpecifier>> {

        if (!BoundingRectangle.intersect(
            bnr.boundingRectangle,
            rect
        )) {
            return;
        }

        if (bnr.nodeRef.getAddress().isLeaf()) {
            yield bnr;
            return;
        }

        const node = await this.getNodeByAddress(
            bnr.nodeRef.getAddress()
        );

        for (const child of node.getChildrenRefs()) {
            yield* this.intersectNode(child, rect);
        }
    }
    async *intersect(
        rect: BoundingRectangle
    ): AsyncIterable<BoundedNodeRef<ContentSpecifier>> {

        const root = await this.getRootBoundedNodeRef();

        yield* this.intersectNode(root, rect);
    }
    
    private async nearestNode(
        bnr: BoundedNodeRef<ContentSpecifier>,
        geoPoint:GeoPoint,
        rankData:NearestRankData
    ): Promise<void>{
        const node = await this.getNodeByAddress(
            bnr.nodeRef.getAddress()
        );
        if (node.isLeaf()){
            const bytes = await node.getData();
            const json = new TextDecoder().decode(bytes);
            const data = JSON.parse(json);
            rankData.tryInsert(data);
        }
        const sortedChildren = Array.from(node.getChildrenRefs()).sort((a,b)=>{
            return worstDistance(a.boundingRectangle, geoPoint) - worstDistance(b.boundingRectangle, geoPoint)
        });
        for (const child of sortedChildren) {
            const mbr = this.rankShrinkedMbr(rankData, geoPoint);
            if (BoundingRectangle.intersect(child.boundingRectangle, mbr)){
                await this.nearestNode(child,geoPoint,rankData)
            }
        }
        return;
    }
    async nearest(geoPoint:GeoPoint,allowRank:number):Promise<NearestRankData>{
        const root = await this.getRootBoundedNodeRef();
        const rankData = new NearestRankData(allowRank, geoPoint);
        await this.nearestNode(root,geoPoint, rankData);
        return rankData;
    }
    getRootBoundedNodeRef(): Promise<BoundedNodeRef<ContentSpecifier>> {
        if (!this.globalHeader){
            throw new Error("global header is not valid")
        }
        return Promise.resolve(new BoundedNodeRef<ContentSpecifier>(this.globalHeader.rootMbr, new RTreeNodeRef(ContentSpecifier.rootSpec)));
    }
    async getNodeByAddress(address: ContentSpecifier): Promise<IRTreeNode<ContentSpecifier, Uint8Array<ArrayBufferLike>>> {
        if (address.contentType == ContentSpecifier.CONTENT_TYPE_B){
            const bblock = await this.readBBlock(address);
            return new RTreeNodeB(this, address, bblock);
        }else if (address.contentType == ContentSpecifier.CONTENT_TYPE_L){
            const lrec = await this.readLRecord(address);
            return new RTreeNodeL(this, address, lrec);
        }
        throw new Error("Content Type は BかLでなければならない");
    }
    creteLeafBoundedNodeRef(rect: BoundingRectangle, data: Uint8Array<ArrayBufferLike>): Promise<BoundedNodeRef<ContentSpecifier>> {
        throw new Error("Read only system.");
    }
    insert(target: BoundedNodeRef<ContentSpecifier>): Promise<void> {
        throw new Error("Read only system.");
    }
    public async readBBlock(spec:ContentSpecifier):Promise<BBlock>{
        if (spec.contentType != ContentSpecifier.CONTENT_TYPE_B){
            throw new Error("contentType must be BTYPE");
        }
        //BBlockは
        const buff = new Uint8Array(4096);
        const addr = spec.block
        if (!this.globalHeader){
            throw new Error("globalHeader is invalid")
        }
        const readCnt = await this.io.read(addr + this.globalHeader.section1Start, 4096, buff);
        return bBlockCodec.decode(new DataView(buff.buffer),0);
    }
    public async readLRecord(spec:ContentSpecifier):Promise<LRecord>{
        if (spec.contentType != ContentSpecifier.CONTENT_TYPE_L){
            throw new Error("ContentType must LRecord")
        }
        //LRecord は LRecord 64bytes
        const buff:Uint8Array = new Uint8Array(64);
        if (!this.globalHeader){
            throw new Error("globalHeader is invalid")
        }
        const readCnt = await this.io.read(
            ContentSpecifier.toBlockOff(spec.block, spec.offset) + this.globalHeader.section2Start 
            , 64, buff);
        return lRecordCodec.decode(new DataView(buff.buffer),0)
    }
    public async readExtraRecord(spec: ContentSpecifier, size:bigint):Promise<Uint8Array>{
        const sizeNum = Number(size);
        if (spec.contentType != ContentSpecifier.CONTENT_TYPE_EXTRA){
            throw new Error("Bad Content type");
        }
        const buff = new Uint8Array(sizeNum);
        const block = spec.block;
        const off = spec.offset;
        if (!this.globalHeader){
            throw new Error("global headerが無効")
        }
        const readCnt = await this.io.read(
            BigInt(ContentSpecifier.toBlockOff(block,off))+this.globalHeader.section3Start, 
            Number(size), buff )
        return buff;
    }
    public static async create(io:IOFunctions):Promise<RTreeSystemImpl>{
        const ghBuffer = new Uint8Array(4096);
        const num_read = await io.read(BigInt(0), 0x1000, ghBuffer);
        if (num_read < 0x80){
            throw new Error("Global Header読み込み不良")
        }
        const gh:GlobalHeader = globalHeaderCodec.decode(new DataView(ghBuffer.buffer), 0, false);
        return new RTreeSystemImpl(io, gh);
    }
}