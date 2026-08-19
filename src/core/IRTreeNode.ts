import type { IRTreeNodeRef } from "./IRTreeNodeRef";
import type { NodeTypeIdentifiable } from "./NodeTypeIdentifiable";
import { BoundedNodeRef } from "./BoundedNodeRef";
import type { BoundingRectangle } from "./BoundingRectangle";
export interface IRTreeNode<TAddress extends NodeTypeIdentifiable,TLeafData> extends IRTreeNodeRef<TAddress>{
    isLeaf():boolean;  
    getData():Promise<TLeafData>;
    getChildrenRefs(): ReadonlyArray<BoundedNodeRef<TAddress>>;
    getEnclosingMbr():BoundingRectangle;
    getChildrenCount():number;
    addChildRef(boundedChild:BoundedNodeRef<TAddress>):void;
    removeChildRef(boundedChild:BoundedNodeRef<TAddress>):void;
}