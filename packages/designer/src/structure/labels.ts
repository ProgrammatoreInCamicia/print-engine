import { Node } from "@print-engine/schema";

export function describeNode(node: Node): string {
    switch (node.type) {
        case 'text':
            return `Text: ${node.value}`
        case 'field':
            return `Field: ${node.bind}`
        case 'stack':
            return `Stack (${node.direction ?? 'column'})`;
        case 'image':
            return 'src' in node ? `Image: ${node.src}` : `Image (bind: ${node.bind})`;
        case 'repeat':
            return `Repeat: ${node.dataSource}`;
        case 'group':
            return `Group by ${node.groupBy} (from ${node.dataSource})`;
        case 'canvas':
            return 'Canvas (raw JSON)';
        case 'columns':
            return `Columns (${node.mode})`;
        case 'pivot':
            return 'Pivot (raw JSON)';
    }
}