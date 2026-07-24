export const CURRENT_SCHEMA_VERSION = 1;

export interface Style {
    font?: string;
    size?: Length;
    weight?: number;
    color?: string;
    background?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    padding?: Length;
    border?: string;
    borderTop?: string;
    borderBottom?: string;
    gap?: Length;
    width?: Length;
    grow?: number;
}

export type Length = string;

export type Expr = string;

export interface TextNode {
    type: 'text';
    value: string;
    inline?: boolean;
    style?: Style;
}

export interface FieldNode {
    type: 'field';
    bind: Expr;
    prefix?: string;
    suffix?: string;
    style?: Style;
}

export interface StackNode {
    type: "stack";
    direction?: "column" | "row";
    children: Node[];
    style?: Style;
    breakInside?: 'auto' | 'avoid';
    keepWithNext?: boolean;
}

export interface RepeatNode {
    type: "repeat";
    dataSource: Expr;
    template: Node;
    style?: Style;
    breakInside?: 'auto' | 'avoid';
    keepWithNext?: boolean;
}

export interface GroupNode {
    type: "group";
    dataSource: Expr;
    groupBy: Expr;
    detail: Node;
    groupHeader?: Node;
    groupFooter?: Node;
    style?: Style;
    breakInside?: 'auto' | 'avoid';
    keepWithNext?: boolean;
}

interface ImageBase {
    type: "image";
    width?: Length;
    height?: Length;
    style?: Style;
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
    style?: Style;
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
    size: "A3" | "A4" | "A5" | "Letter" | "Legal";
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