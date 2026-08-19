import type { BoundedNodeRef } from "./BoundedNodeRef";
import type { BoundingRectangle } from "./BoundingRectangle";
import type { IRTreeNode } from "./IRTreeNode";
import type { NodeTypeIdentifiable } from "./NodeTypeIdentifiable";

export interface IRTreeSystem<TAddress extends NodeTypeIdentifiable,TLeafData>{
    getRootBoundedNodeRef():Promise<BoundedNodeRef<TAddress>>;
    getNodeByAddress(address:TAddress):Promise<IRTreeNode<TAddress, TLeafData>>;
    creteLeafBoundedNodeRef(rect:BoundingRectangle, data: TLeafData):Promise<BoundedNodeRef<TAddress>>;
    insert(target:BoundedNodeRef<TAddress>):Promise<void>;
    intersect(rect:BoundingRectangle): AsyncIterable<BoundedNodeRef<TAddress>>;
}