import { Json } from "@print-engine/expr"
import { isObject } from "../utils/common"

const MAX_DEPTH = 5;

type FieldKind = 'value' | 'object' | 'array'

export interface FieldTreeNode {
    name: string              // the key as it appears in the data
    expr: string              // the ready-made expression: '$.customer.name'
    kind: FieldKind
    isPluck: boolean
    sample?: string           // short preview of the value, for the UI
    children?: FieldTreeNode[]
}

export function fieldTree(json: Json, rootExpr: string): FieldTreeNode[] {
    return internalFieldTree(json, rootExpr, 0, false);
}

function internalFieldTree(json: Json, rootExpr: string, deep: number, throughArray: boolean): FieldTreeNode[] {
    if (isObject(json)) {
        return Object.entries(json).map(([key, value]) => {
            const kind = classifyValue(value);
            switch (kind) {
                case 'value':
                    return {
                        name: key,
                        kind,
                        isPluck: throughArray,
                        expr: `${rootExpr}.${key}`,
                        sample: formatSample(value),
                    }
                case 'object': 
                    return {
                        name: key,
                        kind,
                        isPluck: throughArray,
                        expr: `${rootExpr}.${key}`,
                        children: deep < MAX_DEPTH ? internalFieldTree(value, `${rootExpr}.${key}`, deep + 1, throughArray) : undefined,
                    }
                    
                case 'array': {
                    let children: FieldTreeNode[] | undefined = undefined;
                    if (Array.isArray(value) && value.length > 0) {
                        const firstElement = value[0];
                        if (isObject(firstElement)) {
                            children = deep < MAX_DEPTH ? internalFieldTree(firstElement, `${rootExpr}.${key}`, deep + 1, true) : undefined;
                        }
                    }
                    return {
                        name: key,
                        kind,
                        isPluck: throughArray,
                        expr: `${rootExpr}.${key}`,
                        children
                    };
                }
            }            
        });
    }
    if (Array.isArray(json) && json.length > 0) {
        const firstElement = json[0];
        if (isObject(firstElement)) {
            return internalFieldTree(firstElement, rootExpr, deep, true);
        }
    }
    return [];
}

function formatSample(value: Json): string {
    const full = JSON.stringify(value);
    if (full.length <= 50) {
        return full;
    }
    return full.slice(0, 50) + '...';
}

function classifyValue(value: Json): FieldKind {
    if (Array.isArray(value)) {
        return 'array';
    } else if (isObject(value)) {
        return 'object';
    } else {
        return 'value';
    }
}