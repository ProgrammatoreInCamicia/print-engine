import { ExpressionEngine, Json } from "@print-engine/expr";
import { getAtPath, NodePath } from "../structure/paths";
import { Expr, PrintDocument } from "@print-engine/schema";

interface Scope {
    name: string;
    expr: Expr;
};

export function scopesAt(doc: PrintDocument, path: NodePath): Scope[] {
    const scopes: Scope[] = [{ name: '$', expr: '$' }];  // sempre presente

    for (let i = 0; i < path.length; i++) {
        const prefix = path.slice(0, i + 1);
        const node = getAtPath(doc, prefix);
        if (node != null) {
            switch (node.type) {
                case 'group':
                case 'repeat': {
                    const existingIndex = scopes.findIndex(s => s.name === '$item');
                    const newScope: Scope = { name: '$item', expr: node.dataSource };
                    if (existingIndex >= 0) {
                        scopes[existingIndex] = newScope;
                    } else {
                        scopes.push(newScope);
                    }

                }
                break;
            }
        }
    }

    return scopes;
}

export function resolveScopeData(scope: Scope, sampleData: Json, engine: ExpressionEngine): Json | undefined {
    if (scope.name === "$")
        return sampleData;

    const result = engine.evaluate(scope.expr, {root: sampleData});
    if (!result.ok) {
        return undefined;
    }

    const value = result.value;
    if (Array.isArray(value)) {
        return value.length > 0 ? value[0] : undefined;
    }
    return value;
}