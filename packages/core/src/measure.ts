import { ResolvedNode } from "./resolved.js";

export interface Measurer {
    measure(node: ResolvedNode, availableWidth: number): number;
}

// export class StubMeasurer implements Measurer {
//     constructor(private readonly height: number = 10) {}

//     measure(node: ResolvedNode, availableWidth: number): number {
//         return this.height;
//     }
// }

/**
 * Misura proporzionale al contenuto: ogni foglia vale `leafHeight`,
 * un blocco vale la somma delle foglie che contiene.
 * Modella il comportamento reale abbastanza da testare l'algoritmo
 * di paginazione senza un browser.
 */
export class LeafCountMeasurer implements Measurer {
    constructor(private readonly leafHeight: number = 10) {}

    measure(node: ResolvedNode, _availableWidth: number): number {
        return this.countLeaves(node) * this.leafHeight;
    }

    private countLeaves(node: ResolvedNode): number {
        if (node.kind === 'block') {
            return node.children.reduce((sum, c) => sum + this.countLeaves(c), 0);
        }
        return 1;
    }
}