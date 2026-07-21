export const CURRENT_SCHEMA_VERSION = 1;

export type Length = string;

export type Expr = string;

export interface TextNode {
    type: 'text';
    value: string;
    inline?: boolean;
}

export interface FieldNode {
    type: 'field';
    bind: Expr;
    prefix?: string;
    suffix?: string;
}

export interface StackNode {
    type: "stack";
    direction?: "column" | "row";
    children: Node[];
}

export type Node =
  | TextNode
  | FieldNode
  | StackNode;
