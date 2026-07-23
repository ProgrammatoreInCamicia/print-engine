export type Json = 
    | null
    | boolean
    | number
    | string
    | Json[]
    | { [key: string]: Json };

export interface EvalContext {
    root: Json;
    item?: Json;
    group?: Json;
    page?: { current: number; total: number };
}

export type EvalResult =
  | { ok: true; value: Json }
  | { ok: false; error: string };

export interface ExpressionEngine {
    readonly kind: string;
    evaluate(expression: string, ctx: EvalContext): EvalResult;
}