import { ResolvedNode } from "./resolved.js";

export interface Measurer {
    measure(node: ResolvedNode, availableWidth: number): number;
}

export class StubMeasurer implements Measurer {
    constructor(private readonly height: number = 10) {}

    measure(node: ResolvedNode, availableWidth: number): number {
        return this.height;
    }
}