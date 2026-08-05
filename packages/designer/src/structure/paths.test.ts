import { Node, PrintDocument } from '@print-engine/schema';
import { describe, it, expect } from 'vitest';
import { childPaths, getAtPath, NodePath, parsePathKey, pathKey, setAtPath } from './paths';

const doc: PrintDocument = {
    page: {
        size: 'A4',
    },
    schemaVersion: 1,
    body: {
        type: 'stack',
        children: [
            {
                type: 'group',
                groupBy: 'users',
                dataSource: 'users',
                detail: {
                    type: 'text',
                    value: 'Hi',
                }
            }
        ]
    }
}

describe('paths', () => {
    it('should not mutate original document when setting a node at path', () => {
        const path = ['body', 'children', 0, 'detail'];
        const newNode: Node = {
            type: 'text',
            value: 'Hello',
        };
        setAtPath(doc, path, newNode);
        const originalDetail = (doc.body as Extract<Node, { type: 'stack' }>).children[0];
        const groupDetail = originalDetail?.type === 'group' ? originalDetail.detail : undefined;

        expect(groupDetail).toEqual({ type: 'text', value: 'Hi' });
    });

    it('returns the node just set when reading back the same path', () => {
        const path: NodePath = ['body', 'children', 0, 'detail'];
        const newNode: Node = { type: 'text', value: 'Hello' };

        const newDoc = setAtPath(doc, path, newNode);
        const result = getAtPath(newDoc, path);

        expect(result).toEqual(newNode);
    });

    const docWithTwoChildren: PrintDocument = {
        ...doc,
        body: {
            type: 'stack',
            children: [
                (doc.body as Extract<Node, { type: 'stack' }>).children[0]!,
                { type: 'text', value: 'untouched sibling' },
            ],
        },
    };

    it('shares untouched branches by reference (structural sharing)', () => {
        const path: NodePath = ['body', 'children', 0, 'detail'];
        const newNode: Node = { type: 'text', value: 'Hello' };

        const newDoc = setAtPath(docWithTwoChildren, path, newNode);

        const oldSibling = (docWithTwoChildren.body as Extract<Node, { type: 'stack' }>).children[1];
        const newSibling = (newDoc.body as Extract<Node, { type: 'stack' }>).children[1];

        expect(newSibling).toBe(oldSibling); // stesso riferimento, non solo stesso valore
    });

    it('returns undefined for a path that does not exist', () => {
        const path: NodePath = ['body', 'children', 5, 'detail'];  // indice fuori range
        const result = getAtPath(doc, path);

        expect(result).toBeUndefined();
    });
});

describe('childPaths', () => {
    it('returns an empty array for leaf nodes', () => {
        const textNode: Node = { type: 'text', value: 'hi' };
        expect(childPaths(textNode, ['body'])).toEqual([]);

        const fieldNode: Node = { type: 'field', bind: '$.x' };
        expect(childPaths(fieldNode, ['body'])).toEqual([]);

        const imageNode: Node = { type: 'image', src: 'logo.png' };
        expect(childPaths(imageNode, ['body'])).toEqual([]);
    });

    it('returns an empty array for canvas/columns/pivot (v1 raw-JSON fallback)', () => {
        const canvasNode: Node = { type: 'canvas', height: '10mm', children: [] };
        expect(childPaths(canvasNode, ['body'])).toEqual([]);
    });

    it('maps each stack child to its own path, none empty', () => {
        const stackNode: Node = {
            type: 'stack',
            children: [
                { type: 'text', value: 'a' },
                { type: 'text', value: 'b' },
            ],
        };

        const result = childPaths(stackNode, ['body']);

        expect(result).toHaveLength(2);
        expect(result[0]!.path).toEqual(['body', 'children', 0]);
        expect(result[1]!.path).toEqual(['body', 'children', 1]);
        expect(result.every(entry => entry.isEmpty === false)).toBe(true);
    });

    it('returns all three group slots even when optional ones are missing', () => {
        const groupNode: Node = {
            type: 'group',
            dataSource: '$.items',
            groupBy: '$item.x',
            detail: { type: 'text', value: 'detail' },
            // groupHeader e groupFooter assenti di proposito
        };

        const result = childPaths(groupNode, ['body']);

        expect(result).toHaveLength(3);

        const header = result.find(e => e.path.at(-1) === 'groupHeader');
        const detail = result.find(e => e.path.at(-1) === 'detail');
        const footer = result.find(e => e.path.at(-1) === 'groupFooter');

        expect(header?.isEmpty).toBe(true);
        expect(detail?.isEmpty).toBe(false);
        expect(footer?.isEmpty).toBe(true);
    });

    it('marks group slots as non-empty when present', () => {
        const groupNode: Node = {
            type: 'group',
            dataSource: '$.items',
            groupBy: '$item.x',
            groupHeader: { type: 'text', value: 'header' },
            detail: { type: 'text', value: 'detail' },
            groupFooter: { type: 'text', value: 'footer' },
        };

        const result = childPaths(groupNode, ['body']);

        expect(result.every(entry => entry.isEmpty === false)).toBe(true);
    });

    it('returns the single repeat template slot', () => {
        const repeatNode: Node = {
            type: 'repeat',
            dataSource: '$.items',
            template: { type: 'text', value: 'row' },
        };

        const result = childPaths(repeatNode, ['body']);

        expect(result).toHaveLength(1);
        expect(result[0]!.path).toEqual(['body', 'template']);
        expect(result[0]!.isEmpty).toBe(false);
    });
});

describe('pathKey / parsePathKey', () => {
    it('round-trips a path with mixed string and numeric steps', () => {
        const path: NodePath = ['body', 'children', 0, 'detail'];
        const key = pathKey(path);
        const parsed = parsePathKey(key);

        expect(parsed).toEqual(path);
    });

    it('keeps numeric steps as numbers, not strings', () => {
        const parsed = parsePathKey('body/children/0');
        const lastStep = parsed[parsed.length - 1];

        expect(lastStep).toBe(0);
        expect(typeof lastStep).toBe('number');
    });

    it('produces a stable, joinable string', () => {
        expect(pathKey(['body', 'children', 2])).toBe('body/children/2');
    });
});