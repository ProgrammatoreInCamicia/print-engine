import { PageSetup, PrintDocument, Style } from "@print-engine/schema";
import { ResolvedDocument, ResolvedNode } from "./resolved.js";
import { Measurer } from "./measure.js";

export interface Page {
    pageNumber: number;
    nodes: ResolvedNode[];
}

export interface PaginatedDocument {
    header?: ResolvedNode;
    pages: Page[];
    footer?: ResolvedNode;
}

function getPageArea(page: PageSetup): PageSize {
    const pageSize = getPageSize(page);
    if (page.margin != null) {
        const marginInMM = convertMeasureToMm(page.margin);
        pageSize.width -= marginInMM * 2;
        pageSize.height -= marginInMM * 2;
    }

    return pageSize;
}

export function getPageSize(page: PageSetup): PageSize {
    const pageSizeMap = pageSizeFormat.get(page.size);
    if (pageSizeMap == null) return {height: 0, width: 0};
    const pageSize = {...pageSizeMap};
    if (page.orientation == 'landscape') {
        const width = pageSize.width;
        pageSize.width = pageSize.height;
        pageSize.height = width;
    }

    return pageSize;
}

function paginateSubtree(node: ResolvedNode, width: number, height: number, measurer: Measurer): Page[] {
    const pages: Page[] = [];
    let page: Page = {
        nodes: [],
        pageNumber: 1
    }
    pages.push(page);

    const pageState = new PageState(pages, page, height, width, measurer, height);
    manageNode(node, undefined, pageState);

    return pageState.pages;
}

function handleColumns(node: ResolvedNode, pageState: PageState) {
    if (node.kind === 'columns') {
        if (node.mode == 'newspaper')
        {
            const columns = Array.from({length: node.count!}, () => ({
                nodes: [],
                pageNumber: 0
            } as Page));
            let gap = 0;
            if (node.style && node.style.gap != null) {
                gap = convertMeasureToMm(node.style.gap) * (node.count! - 1);
            }
            const width = (pageState.pageWidth - gap) / node.count!;
            const newspaperState = new NewspaperState(
                pageState,
                columns,
                0,
                pageState.pages,
                pageState.remainingHeight,
                pageState.remainingHeight,
                pageState.pageAreaHeight,
                node.count!,
                width,
                pageState.measurer,
                node.style,
            );
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i]!;
                const next = node.children[i + 1];
                placeInNewspaper(child, next, newspaperState);
            }

            const hasContent = newspaperState.columns.some(col => col.nodes.length > 0);
            if (hasContent) {
                newspaperState.freezePage();
            }
            
        } else if (node.mode == 'independent') {

            if (pageState.page.nodes.length > 0) {
                // if there are nodes start new page for columns management
                pageState.startNewPage();
            }
            let gap = 0;
            if (node.style && node.style.gap != null) {
                // total gap between all children
                gap = convertMeasureToMm(node.style.gap) * (node.children.length - 1)
            }
    
            // Larghezze esplicite dichiarate sui figli (style.width), se presenti.
            const explicitWidths = node.children.map(child =>
                child.style?.width != null ? convertMeasureToMm(child.style.width) : null
            );
            const fixedWidthTotal = explicitWidths.reduce((sum: number, w) => sum + (w ?? 0), 0);
            const flexibleCount = explicitWidths.filter(w => w == null).length;
    
            // Il padding orizzontale del contenitore riduce lo spazio disponibile per
            // i figli: va scalato prima di dividere, altrimenti (con width rigide) le
            // colonne sforano il contenitore.
            const horizontalPadding = node.style?.padding != null
                ? parseHorizontalPadding(node.style.padding)
                : 0;
    
            const remainingWidth = pageState.pageWidth - gap - fixedWidthTotal - horizontalPadding;
            const flexibleWidth = flexibleCount > 0 ? remainingWidth / flexibleCount : 0;
    
            const columnWidths = explicitWidths.map(w => w ?? flexibleWidth);
    
    
            // const columnWidth = (pageState.pageWidth - gap) / node.children.length;
            const columnPages = node.children.map((child, i) => {
                return paginateSubtree(child, columnWidths[i]!, pageState.pageAreaHeight, pageState.measurer);
            });
    
            const maxPages = Math.max(...columnPages.map(pages => pages.length));
    
            for (let i = 0; i < maxPages; i++) {
                const rowChildren: ResolvedNode[] = columnPages.map((pages, colIdx) => ({
                    kind: 'block',
                    direction: 'column',
                    // Usa la larghezza calcolata (in mm) come width esplicita, sia per
                    // le colonne a larghezza fissa che per quelle flessibili. Non
                    // deleghiamo a flexbox (grow) perché con columns annidate gli item
                    // flex sforano la loro quota (min-width:auto sul contenuto) e le
                    // colonne escono dai limiti di pagina. La misura è solo verticale,
                    // quindi l'overflow orizzontale passerebbe inosservato.
                    style: { width: `${columnWidths[colIdx]}mm` },
                    children: pages[i]?.nodes ?? [],   // vuoto se questa colonna non ha una pagina i
                }));
    
                const columnsRowNode: ResolvedNode = {
                    kind: 'block',
                    direction: 'row',
                    style: node.style,
                    children: rowChildren,
                };
    
                if (i > 0) {
                    pageState.startNewPage();
                }
    
                const rowHeight = pageState.measurer.measure(columnsRowNode, pageState.pageWidth);
                pageState.place(columnsRowNode, rowHeight);            
            }
        }
    }
}

function manageNode(node: ResolvedNode, next: ResolvedNode | undefined, pageState: PageState) {
    if (node.kind === 'columns') {
        handleColumns(node, pageState);
        return;
    }

    // Se un block ha un figlio 'columns' diretto, non misurarlo come un tutt'uno:
    // la misura sarebbe falsata (renderNode non sa disegnare 'columns').
    // Scendiamo sempre nei figli diretti in questo caso.
    if (node.kind === 'block' && node.children.some(c => c.kind === 'columns')) {
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i]!;
            const childNext = node.children[i + 1];
            manageNode(child, childNext, pageState);
        }
        return;
    }

    const nodeSize = pageState.measurer.measure(node, pageState.pageWidth);
    if (node.kind === 'block' && node.keepWithNext && next != null) {
        const combinedSize = nodeSize + pageState.measurer.measure(next, pageState.pageWidth);
        if (combinedSize > pageState.remainingHeight && pageState.page.nodes.length > 0) {
            pageState.startNewPage();
        }
    }
    if (nodeSize <= pageState.remainingHeight)
    {
        pageState.place(node, nodeSize);
    } else {
        if (node.kind === 'block' && node.breakInside != 'avoid')
        {
            // Split: recurse into children so they flow across pages.
            // LIMITATION: the parent block's own wrapper style (padding, gap,
            // border, background) is dropped at the split — children are placed
            // directly onto the pages, so a block that breaks loses its box on
            // the boundary. Known limitation, see README.
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i]!;
                const next = node.children[i + 1];
                manageNode(child, next, pageState);
            }
        } else {
            // cannot be split
            if (pageState.page.nodes.length === 0)
            {
                // must add
                pageState.place(node, nodeSize);
            } else {
                // go next page
                pageState.startNewPage();
                pageState.place(node, nodeSize);
            }
        }
    }
}

export function paginate(doc: PrintDocument, resolved: ResolvedDocument, measurer: Measurer): PaginatedDocument {
    const pages: Page[] = [];

    const pageArea = getPageArea(doc.page);

    const headerSize = resolved.header ? measurer.measure(resolved.header, pageArea.width) : 0;
    const footerSize = resolved.footer ? measurer.measure(resolved.footer, pageArea.width) : 0;
    pageArea.height -= headerSize;
    pageArea.height -= footerSize;

    let remainingHeight = pageArea.height;

    let page: Page = {
        nodes: [],
        pageNumber: 1
    }
    pages.push(page);

    const pageState = new PageState(pages, page, remainingHeight, pageArea.width, measurer, pageArea.height);

    if (resolved.body.kind === 'columns') {
        handleColumns(resolved.body, pageState);
    } else {
        manageNode(resolved.body, undefined, pageState);
    }
    
    return {
        header: resolved.header,
        pages: pageState.pages,
        footer: resolved.footer
    };
};

function placeInNewspaper(node: ResolvedNode, next: ResolvedNode | undefined, state: NewspaperState) {
    const h = state.measurer.measure(node, state.columnWidth);

    // (A) keepWithNext
    if (node.kind === 'block' && node.keepWithNext && next != null) {
        const combined = h + state.measurer.measure(next, state.columnWidth);
        const currentColumnNotEmpty = state.columns[state.columnIndex]!.nodes.length > 0;
        if (combined > state.remainingHeight && currentColumnNotEmpty) {
            state.advance();
        }
    }

    // (B) ci sta?
    if (h <= state.remainingHeight) {
        state.placeInColumn(node, h);
        return;
    }

    // (C) spezzabile?
    if (node.kind === 'block' && node.breakInside !== 'avoid') {
        for (let i = 0; i < node.children.length; i++) {
            placeInNewspaper(node.children[i]!, node.children[i + 1], state);
        }
        return;
    }

    // (D) atomico, non ci sta
    const currentColumnNotEmpty = state.columns[state.columnIndex]!.nodes.length > 0;
    if (currentColumnNotEmpty) {
        state.advance();
    }
    state.placeInColumn(node, h);   // colonna fresca o vuota: piazza comunque, NIENTE retry
}

class PageState {
    constructor(
        public pages: Page[],
        public page: Page,
        public remainingHeight: number,
        public readonly pageWidth: number,
        public readonly measurer: Measurer,
        public readonly pageAreaHeight: number,
    ) {}

    startNewPage() {
        this.page = {
            nodes: [],
            pageNumber: this.page.pageNumber + 1,
        };
        this.remainingHeight = this.pageAreaHeight;
        this.pages.push(this.page);
    }

    place(node: ResolvedNode, height: number) {
        this.page.nodes.push(node);
        this.remainingHeight -= height;
    }
}

class NewspaperState {
    constructor(
        public pageState: PageState,
        public columns: Page[],
        public columnIndex: number,
        public pages: Page[],
        // remaining available height
        public remainingHeight: number,
        // first page column height
        public columnHeight: number,
        // normal full column height
        public readonly fullColumnHeight: number,
        public readonly columnCount: number,
        public readonly columnWidth: number,
        public readonly measurer: Measurer,
        public readonly style?: Style,
    ) {}

    placeInColumn(node: ResolvedNode, height: number) {
        this.columns[this.columnIndex]!.nodes.push(node);
        this.remainingHeight -= height;
    }

    startNewColumn() {
        this.columnIndex ++;
        this.remainingHeight = this.columnHeight;
    }

    freezePage() {
        const row: ResolvedNode = {
            kind: 'block',
            direction: 'row',
            children: this.columns.map(col => {
                const node: ResolvedNode = {
                    kind: 'block',
                    children: col.nodes,
                    direction: 'column',
                    style: {
                        width: this.columnWidth + 'mm'
                    }
                }
                return node;
            }),
            style: this.style
        }
        const rowHeight = this.measurer.measure(row, this.pageState.pageWidth);
        this.pageState.place(row, rowHeight);

        this.columns = Array.from({ length: this.columnCount }, () => ({
            pageNumber: 0, // is not usefull in context of column 
            nodes: [],
        }));

        this.columnIndex = 0;
        this.columnHeight = this.fullColumnHeight;
        this.remainingHeight = this.columnHeight;
    }

    advance() {
        if ((this.columnIndex + 1) < this.columnCount) {
            this.startNewColumn();
        } else {
            this.freezePage();
            this.pageState.startNewPage();
        }
    }
}

export interface PageSize { width: number; height: number };

const pageSizeFormat: Map<"A3" | "A4" | "A5" | "Letter" | "Legal", PageSize> = new Map<"A3" | "A4" | "A5" | "Letter" | "Legal", PageSize>([
    ['A3', { width: 297, height: 420 }],
    ['A4', { width: 210, height: 297 }],
    ['A5', { width: 148, height: 210 }],
    ['Letter', { width: 216, height: 279 }],
    ['Legal', { width: 216, height: 356 }],
]);

function convertMeasureToMm(measure: string): number {
    let result = 0; 
    const digitAndMeasure = measure.match(/(\d+(?:\.\d+)?)([a-z]+)/i);
    if (digitAndMeasure != null && digitAndMeasure.length == 3)
    {
        /**
         * ex: '12cm'
         * [0] = '12cm'
         * [1] = '12'
         * [2] = 'cm'
         */
        const conversionValue = measureInMM.get(digitAndMeasure[2] ?? '');
        if (conversionValue != null) {
            result = (digitAndMeasure[1] != null ? +digitAndMeasure[1] : 0) * conversionValue;
        }

    }

    return result;
}

// Padding orizzontale (left + right) in mm da uno shorthand CSS ('1px 2px',
// '0 3px 0 0', ...). Segue l'ordine CSS top/right/bottom/left.
export function parseHorizontalPadding(padding: string): number {
    const parts = padding.trim().split(/\s+/);
    let left: string;
    let right: string;
    switch (parts.length) {
        case 1: left = right = parts[0]!; break;            // all sides
        case 2: left = right = parts[1]!; break;            // vertical | horizontal
        case 3: left = right = parts[1]!; break;            // top | horizontal | bottom
        case 4: right = parts[1]!; left = parts[3]!; break; // top | right | bottom | left
        default: return 0;
    }
    return convertMeasureToMm(left) + convertMeasureToMm(right);
}

// 1in = 96px
// 1cm = 96/2.54 ≈ 37.8px
// 1mm ≈ 3.78px
// 1pt = 96/72 ≈ 1.333px

const measureInMM: Map<string, number> = new Map<string, number>([
    ['mm', 1],
    ['cm', 10],
    ['px', 0.2646],
    ['pt', 0.3528],
    ['in', 25.4]
]);