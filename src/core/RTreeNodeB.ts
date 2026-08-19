import type { BBlock } from "./BBlock";
import { BoundedNodeRef } from "./BoundedNodeRef";
import { BoundingRectangle } from "./BoundingRectangle";
import { ContentSpecifier } from "./ContentSpecifier";
import type { IRTreeNode } from "./IRTreeNode";
import { RTreeNodeRef } from "./RTreeNodeRef";
import type { RTreeSystemImpl } from "./RTreeSystemImpl";

export class RTreeNodeB implements IRTreeNode<ContentSpecifier, Uint8Array>{
    private spec:ContentSpecifier;
    private bBlock:BBlock;
    private system:RTreeSystemImpl;
    isLeaf(): boolean {
        return false;
    }
    getData(): Promise<Uint8Array> {
        return Promise.resolve(new Uint8Array(0));
    }
    getChildrenRefs(): readonly BoundedNodeRef<ContentSpecifier>[] {
        return Array.from(this.bBlock.members.values()).map((v)=>{
            const nodeRef = new RTreeNodeRef(v.contentSpec);
            return new BoundedNodeRef<ContentSpecifier>(v.mbr, nodeRef);    
        });
    }
    getEnclosingMbr(): BoundingRectangle {
        return this.getChildrenRefs().reduce((prev,curRef)=>{
            const newEnclosingMbr = BoundingRectangle.enclose(prev, curRef.boundingRectangle);
            if (newEnclosingMbr == null){
                return prev;
            }else{
                return newEnclosingMbr;
            }
        },BoundingRectangle.NEVER_WRAP)
    }
    getChildrenCount(): number {
        return this.bBlock.members.size;
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
    constructor(system:RTreeSystemImpl, spec:ContentSpecifier, bBlock:BBlock){
        this.system = system;
        this.spec = spec;
        this.bBlock = bBlock;
    }

}