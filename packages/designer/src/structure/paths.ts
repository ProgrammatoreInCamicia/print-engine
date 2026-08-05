import { Node, PrintDocument } from "@print-engine/schema"

type PathStep = string | number
export type NodePath = readonly PathStep[];

export interface ChildPathEntry {
    label: string;
    path: NodePath;
    isEmpty: boolean;
}

export function getAtPath(doc: PrintDocument, path: NodePath): Node | undefined {
    let current: unknown = doc;
    for (const step of path) {
        if (current === undefined || current === null) {
            return undefined;
        }
        if (Array.isArray(current)) {
            // current is an array, step should be a number
            if (typeof step !== 'number') {
                return undefined;
            }
            current = current[step];
        } else if (isObject(current)) {
            current = current[step];
        }
        // at this point current is a primitive value, so we can't go any deeper
    }
    return current as Node | undefined;
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function setAtPath(doc: PrintDocument, path: NodePath, node: Node): PrintDocument {
    const newDoc = setNodeAtPath(doc, path, node);
    if (newDoc === undefined) {
        throw new Error("Failed to set node at path");
    }

    return newDoc as PrintDocument;
}

function setNodeAtPath(node: unknown, path: NodePath, newNode: Node): unknown {
    if (path.length === 0) {
        return newNode;
    }

    if (node === undefined || node === null) {
        return undefined;
    }

    const step = path[0];

    if (step != null) {

        if (Array.isArray(node)) {
            // node is an array, step should be a number
            if (typeof step !== 'number') {
                return undefined;
            }
            const copy = [...node];
            copy[step] = setNodeAtPath(node[step], path.slice(1), newNode);
            return copy;
        } else if (isObject(node)) {
            return {
                ...node,
                [step]: setNodeAtPath(node[step], path.slice(1), newNode)
            }
        }
    }
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
            // hanno figli, ma per la v1 restano nel ramo JSON grezzo:
            // non li esponiamo nell'editor strutturale
            return [];
        case 'stack':
            return node.children.map((child, i) => {
                return {
                    label: `${i + 1}.${child.type} `,
                    isEmpty: false,
                    path: [...path, 'children', i]
                }
            });
        case 'group':
            return [
                {
                    label: 'group header',
                    isEmpty: node.groupHeader == null,
                    path: [...path, 'groupHeader']
                },
                {
                    label: 'group detail',
                    isEmpty: false,
                    path: [...path, 'detail']
                },
                {
                    label: 'group footer',
                    isEmpty: node.groupFooter == null,
                    path: [...path, 'groupFooter']
                }
            ];
        case 'repeat':
            return [
                {
                    label: 'repeat template',
                    isEmpty: false,
                    path: [...path, 'template']
                }
            ];
    }
}

export function pathKey(path: NodePath): string {
    return path.join('/');
}

export function parsePathKey(key: string): NodePath {
    return key.split('/').map(part => {
        const num = part == '' ? NaN : Number(part);
        return Number.isNaN(num) ? part : num;
    });
}