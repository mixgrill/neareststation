import { BoundedNodeRef } from "./BoundedNodeRef";
import { BoundingRectangle } from "./BoundingRectangle";
import { ContentSpecifier } from "./ContentSpecifier";
import type { IRTreeNode } from "./IRTreeNode";
import { LRecord } from "./LRecord";
import { RTreeNodeRef } from "./RTreeNodeRef";
import type { RTreeSystemImpl } from "./RTreeSystemImpl";

export class RTreeNodeL implements IRTreeNode<ContentSpecifier, Uint8Array>{
    private spec:ContentSpecifier;
    private system:RTreeSystemImpl;
    private lRecord:LRecord;
    isLeaf(): boolean {
        return true;
    }
    async getData(): Promise<Uint8Array> {
        const sz = this.lRecord.dataSize;
        const buff = new Uint8Array(Number(sz));
        let lRecSz = BigInt(0);
        let extSz = BigInt(0);
        if (sz <= LRecord.LRECORD_MAX_DATA_SIZE){
            lRecSz = sz;
        }else{
            lRecSz = BigInt(LRecord.LRECORD_MAX_DATA_SIZE);
            extSz = sz - BigInt(LRecord.LRECORD_MAX_DATA_SIZE);
        }
        buff.set(new Uint8Array(this.lRecord.data,0,Number(lRecSz)),0);
        var extSpec = this.lRecord.extContentSpec;
        if (extSz > 0){
            const extBuff = await this.system.readExtraRecord(extSpec, extSz);
            buff.set(extBuff,LRecord.LRECORD_MAX_DATA_SIZE)
        }
        return buff;
    }
    getChildrenRefs(): readonly BoundedNodeRef<ContentSpecifier>[] {
        return [];
    }
    getEnclosingMbr(): BoundingRectangle {
        return  BoundingRectangle.NEVER_WRAP;
    }
    getChildrenCount(): number {
        return 0;
    }
    addChildRef(boundedChild: BoundedNodeRef<ContentSpecifier>): void {
        throw new Error("Method not implemented.");
    }
    removeChildRef(boundedChild: BoundedNodeRef<ContentSpecifier>): void {
        throw new Error("Method not implemented.");
    }
    getAddress(): ContentSpecifier {
        return this.spec;
    }
    constructor(system:RTreeSystemImpl, spec:ContentSpecifier, lRecord:LRecord){
        this.system = system;
        this.spec = spec;
        this.lRecord = lRecord;
    }

}