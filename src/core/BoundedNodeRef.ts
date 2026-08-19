import type { BoundingRectangle } from "./BoundingRectangle";
import type { IRTreeNodeRef } from "./IRTreeNodeRef";
import type { NodeTypeIdentifiable } from "./NodeTypeIdentifiable";

export class BoundedNodeRef<TAddress extends NodeTypeIdentifiable>{
    private _boundingRectangle:BoundingRectangle;
    public readonly nodeRef: IRTreeNodeRef<TAddress>;
    public updateBoundingRectangle(getMbrFunction:(ref:IRTreeNodeRef<TAddress>)=>BoundingRectangle):void{
        this._boundingRectangle = getMbrFunction(this.nodeRef);
        return;
    }
    public get boundingRectangle(){
        return this._boundingRectangle;
    }
    public constructor(boundingRectangle:BoundingRectangle,nodeRef: IRTreeNodeRef<TAddress>){
        this._boundingRectangle = boundingRectangle;
        this.nodeRef = nodeRef;
    }
}