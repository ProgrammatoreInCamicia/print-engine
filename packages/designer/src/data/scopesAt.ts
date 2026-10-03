import { EvalContext, ExpressionEngine, Json } from "@print-engine/expr";
import { getAtPath, NodePath } from "../structure/paths";
import { Expr, PrintDocument } from "@print-engine/schema";

/** One scope introduced by an ancestor of the selected node. */
export interface Scope {
    name: string;
    expr: Expr;
}

/** Why the chain could not be resolved at some step. */
export type ContextFailure = 'null' | 'not-array' | 'empty' | 'engine-error';

export interface ContextResult {
    ctx: EvalContext;
    error?: { scope: string; reason: ContextFailure };
}

/**
 * The scopes introduced along the path, outermost first and NOT deduplicated:
 * an inner `$item` is expressed in terms of the outer one, so resolving it
 * needs every step of the chain. `$` is not listed -- it is always available
 * and is where `buildContext` starts from.
 */
export function scopesAt(doc: PrintDocument, path: NodePath): Scope[] {
    const scopes: Scope[] = [];

    for (let i = 0; i < path.length; i++) {
        const prefix = path.slice(0, i + 1);
        const node = getAtPath(doc, prefix);
        if (node != null) {
            switch (node.type) {
                case 'group':
                case 'repeat': {
                    scopes.push({ name: '$item', expr: node.dataSource });
                }
                break;
            }
        }
    }

    return scopes;
}

export function buildContext(scopes: Scope[], sampleData: Json, engine: ExpressionEngine): ContextResult {
    let ctx: EvalContext = { root: sampleData };

    for (const scope of scopes) {
        const result = engine.evaluate(scope.expr, ctx);

        // On failure the slot this step was about to write is dropped: what it
        // holds belongs to an outer scope, and at this position the same name
        // denotes something else. Every step writes `item` today; once a step
        // can write another slot (`group`), this must drop that one instead.
        const { item, ...rest } = ctx;

        if (!result.ok) {
            return { ctx: rest, error: { scope: scope.name, reason: 'engine-error' } };
        }
        if (result.value == null) {
            return { ctx: rest, error: { scope: scope.name, reason: 'null' } };
        }
        if (!Array.isArray(result.value)) {
            return { ctx: rest, error: { scope: scope.name, reason: 'not-array' } };
        }
        if (result.value.length === 0) {
            return { ctx: rest, error: { scope: scope.name, reason: 'empty' } };
        }

        ctx = { ...ctx, item: result.value[0] };
    }

    return { ctx };
}
