import type { NodeTypeIdentifiable } from "./NodeTypeIdentifiable";

export interface IRTreeNodeRef<TAddress extends NodeTypeIdentifiable> {
    getAddress(): TAddress;
}