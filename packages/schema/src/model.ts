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

export interface RepeatNode {
    type: "repeat";
    dataSource: Expr;
    template: Node;
}

export interface GroupNode {
    type: "group";
    dataSource: Expr;
    groupBy: Expr;
    detail: Node;
    groupHeader?: Node;
    groupFooter?: Node;
}

interface ImageBase {
    type: "image";
    width?: Length;
    height?: Length;
}

interface ImageSrc extends ImageBase {
    src: string;
}

interface ImageBind extends ImageBase {
    bind: Expr;
}

export type ImageNode = ImageSrc | ImageBind;

export interface PositionedChild {
    x: Length;
    y: Length;
    w?: Length;
    h?: Length;
    node: Node;
}

export interface CanvasNode {
    type: "canvas";
    width?: Length;
    height: Length;
    children: PositionedChild[];
}

export type Node =
  | TextNode
  | FieldNode
  | StackNode
  | RepeatNode
  | GroupNode
  | ImageNode
  | CanvasNode;

export interface PageSetup {
    size: "A4" | "A5" | "Letter" | "Legal";
    orientation?: "portrait" | "landscape";
    margin?: Length;
}

export interface Regions {
    header?: Node;
    footer?: Node;
}

export interface PrintDocument {
    schemaVersion: number;
    page: PageSetup;
    body: Node;
    regions?: Regions;
}