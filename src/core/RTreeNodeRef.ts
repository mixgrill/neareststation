import { ContentSpecifier } from "./ContentSpecifier"
import type { IRTreeNodeRef } from "./IRTreeNodeRef";

export class RTreeNodeRef implements IRTreeNodeRef<ContentSpecifier>{
    private readonly spec:ContentSpecifier;
    getAddress(): ContentSpecifier {
        return this.spec;
    }
    constructor(spec:ContentSpecifier){
        this.spec = spec;
    }
}