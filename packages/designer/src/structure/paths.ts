import { Node, PrintDocument } from "@print-engine/schema"

export type PathStep = string | number
export type NodePath = readonly PathStep[];

export interface ChildPathEntry {
    label: string;
    path: NodePath;
    isEmpty: boolean;
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
            // primitivo, null o undefined: non si può scendere oltre, e il
            // percorso non denota un nodo. Senza questo ramo il ciclo
            // proseguirebbe restituendo il primitivo travestito da Node.
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
 * Il fallimento è segnalato dove accade, non propagato come `undefined`:
 * un `undefined` restituito verrebbe scritto nella copia del contenitore
 * (buchi nell'array, chiavi fantasma negli oggetti) e il documento
 * risulterebbe corrotto senza che nessuno se ne accorga.
 */
function setNodeAtPath(node: unknown, path: NodePath, newNode: Node, fullPath: NodePath): unknown {
    if (path.length === 0) {
        return newNode;
    }

    const step = path[0]!;

    if (Array.isArray(node)) {
        // node is an array, step should be a number
        if (typeof step !== 'number' || step < 0 || step >= node.length) {
            throw new Error(`setAtPath: indice fuori range in '${pathKey(fullPath)}' (passo '${step}')`);
        }
        const copy = [...node];
        copy[step] = setNodeAtPath(node[step], path.slice(1), newNode, fullPath);
        return copy;
    }

    if (isObject(node)) {
        // Una chiave assente va bene: è il caso dello slot vuoto da riempire
        // (es. `groupHeader`). Se restano altri passi, la ricorsione riceve
        // `undefined` e fallisce qui sotto.
        return {
            ...node,
            [step]: setNodeAtPath(node[step], path.slice(1), newNode, fullPath)
        };
    }

    throw new Error(`setAtPath: il percorso '${pathKey(fullPath)}' attraversa un nodo inesistente al passo '${step}'`);
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
    if (key === '') {
        return [];
    }
    return key.split('/').map(part => {
        const num = part == '' ? NaN : Number(part);
        return Number.isNaN(num) ? part : num;
    });
}