import { Node, PrintDocument } from "@print-engine/schema"

export type PathStep = string | number
export type NodePath = readonly PathStep[];

export type ChildPathEntry = {
    label: string;
    path: NodePath;
    isEmpty: false;
    node: Node;
} | {
    label: string;
    path: NodePath;
    isEmpty: true;
    node?: never;
}

export function getAtPath(doc: PrintDocument, path: NodePath): Node | undefined {
    let current: unknown = doc;
    for (const step of path) {
        if (Array.isArray(current)) {
            // current is an array, step should be a number
            if (typeof step !== 'number') {
                return undefined;
            }
            current = current[step];
        } else if (isObject(current)) {
            current = current[step];
        } else {
            // primitive, null or undefined: we cannot go any deeper, and the
            // path does not denote a node. Without this branch the loop would
            // carry on and return the primitive disguised as a Node.
            return undefined;
        }
    }
    return current as Node | undefined;
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function setAtPath(doc: PrintDocument, path: NodePath, node: Node): PrintDocument {
    return setNodeAtPath(doc, path, node, path) as PrintDocument;
}

/**
 * Failure is reported where it happens, not propagated as `undefined`:
 * a returned `undefined` would be written into the container's copy
 * (holes in arrays, phantom keys in objects) and the document would end
 * up corrupted without anyone noticing.
 */
function setNodeAtPath(node: unknown, path: NodePath, newNode: Node, fullPath: NodePath): unknown {
    if (path.length === 0) {
        return newNode;
    }

    const step = path[0]!;

    if (Array.isArray(node)) {
        // node is an array, step should be a number
        if (typeof step !== 'number' || step < 0 || step >= node.length) {
            throw new Error(`setAtPath: index out of range in '${pathKey(fullPath)}' (step '${step}')`);
        }
        const copy = [...node];
        copy[step] = setNodeAtPath(node[step], path.slice(1), newNode, fullPath);
        return copy;
    }

    if (isObject(node)) {
        // A missing key is fine: that is the empty slot being filled
        // (e.g. `groupHeader`). If further steps remain, the recursion gets
        // `undefined` and fails below.
        return {
            ...node,
            [step]: setNodeAtPath(node[step], path.slice(1), newNode, fullPath)
        };
    }

    throw new Error(`setAtPath: path '${pathKey(fullPath)}' walks through a missing node at step '${step}'`);
}

export function childPaths(node: Node, path: NodePath): ChildPathEntry[] {
    switch (node.type) {
        case 'text':
        case 'image':
        case 'field':
            return [];
        case 'canvas':
        case 'columns':
        case 'pivot':
            // they do have children, but in v1 they stay in the raw-JSON
            // branch: we do not expose them in the structural editor
            return [];
        case 'stack':
            return node.children.map((child, i) => {
                return {
                    label: `${i + 1}.${child.type} `,
                    isEmpty: false,
                    path: [...path, 'children', i],
                    node: child,
                }
            });
        case 'group':
            return [
                slotEntry('group header', [...path, 'groupHeader'], node.groupHeader),
                slotEntry('group detail', [...path, 'detail'], node.detail),
                slotEntry('group footer', [...path, 'groupFooter'], node.groupFooter),
            ];
        case 'repeat':
            return [
                slotEntry('repeat template', [...path, 'template'], node.template),
            ];
    }
}

export function pathKey(path: NodePath): string {
    return path.join('/');
}

export function parsePathKey(key: string): NodePath {
    if (key === '') {
        return [];
    }
    return key.split('/').map(part => {
        const num = part == '' ? NaN : Number(part);
        return Number.isNaN(num) ? part : num;
    });
}

function slotEntry(label: string, path: NodePath, node: Node | undefined): ChildPathEntry {
    if (node == null) {
        return { label, isEmpty: true, path };
    }
    return { label, isEmpty: false, path, node };
}
