export const CURRENT_SCHEMA_VERSION = 1;

type StyleExpr = `\=${string}`;
export interface Style {
    font?: string;
    size?: Length;
    weight?: number | StyleExpr;
    color?: string;
    background?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    padding?: Length;
    border?: string;
    borderTop?: string;
    borderBottom?: string;
    borderRight?: string;
    borderLeft?: string;
    gap?: Length;
    width?: Length;
    grow?: number | StyleExpr;
    borderRadius?: Length;
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
    format?: string
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

// 'columns' must be a direct child of a block (e.g. the body's top-level stack), not nested inside intermediate containers — see paginate.ts
export interface ColumnsNode {
    type: 'columns';
    mode: 'independent' | 'newspaper';
    /**
     * Number of columns to snake through. Required and meaningful only when
     * mode === 'newspaper' — for 'independent' the column count is implicitly
     * children.length (each child is its own flow). Ignored otherwise.
     */
    count?: number;
    children: Node[];
    style?: Style;
}

export interface PivotHeaderBand {
    // corner cell
    corner?: Node;
    cell: Node;
    style?: Style;
}

export interface PivotNode {
    type: 'pivot';
    // source of single row
    rowSource: Expr;
    // source of colmns
    columnSource: Expr;
    // header of corder
    rowHeader: Node;
    headers?: PivotHeaderBand[];
    cell: Node;
    rowHeaderWidth: Length;
    columnWidth: Length;
    style?: Style;
    breakInside?: 'auto' | 'avoid';
    keepWithNext?: boolean;
}

export type Node =
  | TextNode
  | FieldNode
  | StackNode
  | RepeatNode
  | GroupNode
  | ImageNode
  | CanvasNode
  | ColumnsNode
  | PivotNode;

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