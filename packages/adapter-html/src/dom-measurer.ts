import { Measurer, ResolvedNode } from "@print-engine/core";
import { renderNode } from "./render.js";

export class DomMeasurer implements Measurer {
    private div: HTMLDivElement;
    constructor() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.left = '-99999px';

        document.body.appendChild(this.div)
    }

    measure(node: ResolvedNode, availableWidth: number): number {
        const renderedNode = renderNode(node);
        this.div.style.width = `${availableWidth}mm`;
        this.div.innerHTML = renderedNode;
        const height = this.div.getBoundingClientRect().height;
        this.div.innerHTML = '';
        // px to mm -> mm = px / 3.7795 || mm = px * 0.2646
        return height / 3.7795
    }
}