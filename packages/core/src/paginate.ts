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

function pivotChunkToBlock(
  pivot: Extract<ResolvedNode, { kind: 'pivot' }>,
  colStart: number,
  colEnd: number
): { header: ResolvedNode; rows: ResolvedNode } {
    // header
    const headers = pivot.headers.map(element => {
        var emptyCorner: ResolvedNode = {
            kind: 'text',
            value: ''
        } 
        const headerCorner = widthWrap(element.corner ?? emptyCorner, pivot.rowHeaderWidth);
        const headerCells = element.cells.slice(colStart, colEnd).map(cell => widthWrap(cell, pivot.columnWidth));
        const header: ResolvedNode = {
            kind: 'block',
            direction: 'row',
            // Lo stile del pivot veste ogni riga; quello della banda si
            // sovrappone per la sua sola riga di header.
            style: { ...pivot.style, ...element.style },
            children: [headerCorner, ...headerCells]
        };
        return header;
    });
    const headersBlock: ResolvedNode = {
        kind: 'block',
        direction: 'column',
        children: headers
    };

    // rows
    const rows = pivot.rows.map(row => {
        
        const header = widthWrap(row.header, pivot.rowHeaderWidth);
        const cells = row.cells.slice(colStart, colEnd).map(cell => widthWrap(cell, pivot.columnWidth))
        const rowNode: ResolvedNode = {
            kind: 'block',
            direction: 'row',
            // Una riga di tabella è atomica: senza questo manageNode la tratta
            // come block spezzabile e distribuisce le celle su due pagine,
            // strappando la riga a metà.
            breakInside: 'avoid',
            style: pivot.style,
            children: [header, ...cells]
        };
        return rowNode;
    });
    const rowsBlock: ResolvedNode = {
        kind: 'block',
        direction: 'column',
        children: rows
    };

    return {
        header: headersBlock,
        rows: rowsBlock
    };
}

function widthWrap(node: ResolvedNode, width: string): ResolvedNode {
    return { kind: 'block', direction: 'column', style: { width }, children: [node] };
}

function handlePivot(node: Extract<ResolvedNode, { kind: 'pivot' }>, pageState: PageState) {
    const totalCols = node.rows.length > 0
        ? node.rows[0]!.cells.length
        : node.headers.length > 0
            ? node.headers[0]!.cells.length
            : 0;
    // Lo stile del pivot veste ogni riga, quindi il suo gap e il suo padding
    // orizzontale mangiano larghezza utile: vanno nel conto, altrimenti le
    // colonne sforano la pagina. Una riga con n celle ha n gap (uno prima di
    // ogni cella, dopo l'intestazione di riga).
    const gap = node.style?.gap != null ? convertMeasureToMm(node.style.gap) : 0;
    const rowPadding = node.style?.padding != null ? parseHorizontalPadding(node.style.padding) : 0;
    const rowHeaderWidth = convertMeasureToMm(node.rowHeaderWidth);
    const columnWidth = convertMeasureToMm(node.columnWidth);

    const colsPerPage = Math.max(1, Math.floor((pageState.pageWidth - rowPadding - rowHeaderWidth) / (columnWidth + gap)));
    const chunks: Array<{start: number; end: number}> = [];
    for (let start = 0; start < totalCols; start += colsPerPage) {
        const end = Math.min(start + colsPerPage, totalCols);
        chunks.push({ start, end });
    }

    // La primissima pagina del pivot prosegue su quella corrente (sotto un
    // eventuale titolo già presente); tutte le altre sono pagine nuove.
    let isFirstPlacement = true;

    chunks.forEach(chunk => {
        const {header, rows} = pivotChunkToBlock(node, chunk.start, chunk.end);
        const chunkWidth = rowPadding + rowHeaderWidth + (chunk.end - chunk.start) * (columnWidth + gap);
        const headerHeight = pageState.measurer.measure(header, chunkWidth);
        const fullPageHeight = pageState.pageAreaHeight - headerHeight;

        // Se proseguiamo sulla pagina corrente, le righe vanno impaginate
        // sull'altezza ANCORA DISPONIBILE, non su quella piena: altrimenti si
        // impagina per 267mm e si scrive su una pagina che ne ha molti meno.
        // Stessa coppia ridotta/piena di NewspaperState (columnHeight/fullColumnHeight).
        let firstPageHeight = fullPageHeight;
        if (isFirstPlacement) {
            firstPageHeight = pageState.remainingHeight - headerHeight;
            if (firstPageHeight <= 0) {
                // Non resta spazio nemmeno per l'header: parti da una pagina nuova.
                pageState.startNewPage();
                firstPageHeight = fullPageHeight;
            }
        }

        const pages = paginateSubtree(rows, chunkWidth, fullPageHeight, pageState.measurer, firstPageHeight);

        pages.forEach(page => {
            if (!isFirstPlacement) {
                pageState.startNewPage();
            }
            isFirstPlacement = false;
            pageState.place(header, headerHeight);
            page.nodes.forEach(node => {
                const nodeHeight = pageState.measurer.measure(node, chunkWidth);
                pageState.place(node, nodeHeight);
            });
        });
    })
}

// `firstPageHeight` permette di impaginare la prima pagina con meno spazio
// delle successive (es. un pivot che prosegue sotto un titolo già presente).
// Se omesso vale `height`, cioè tutte le pagine hanno la stessa altezza.
function paginateSubtree(node: ResolvedNode, width: number, height: number, measurer: Measurer, firstPageHeight: number = height): Page[] {
    const pages: Page[] = [];
    let page: Page = {
        nodes: [],
        pageNumber: 1
    }
    pages.push(page);

    const pageState = new PageState(pages, page, firstPageHeight, width, measurer, height);
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

    if (node.kind === 'pivot') {
        handlePivot(node, pageState);
        return;
    }

    // Se un block ha un figlio 'columns' o 'pivot' diretto, non misurarlo come un tutt'uno:
    // la misura sarebbe falsata (renderNode non sa disegnare 'columns' o 'pivot').
    // Scendiamo sempre nei figli diretti in questo caso.
    if (node.kind === 'block' && node.children.some(c => (c.kind === 'columns') || (c.kind === 'pivot'))) {
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
        if (!pageState.fits(combinedSize) && pageState.hasContent()) {
            pageState.startNewPage();
        }
    }
    if (pageState.fits(nodeSize))
    {
        pageState.place(node, nodeSize);
    } else {
        if (node.kind === 'block' && node.breakInside != 'avoid')
        {
            // Split: il block non ci sta intero. Ne apriamo un clone vuoto sulla
            // pagina corrente (e uno identico su ogni pagina successiva), così i
            // figli restano dentro il loro contenitore: stile e direzione
            // sopravvivono alla spezzatura invece di essere persi.
            pageState.openBlock(node);
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i]!;
                const next = node.children[i + 1];
                manageNode(child, next, pageState);
            }
            pageState.closeBlock();
        } else {
            // cannot be split
            if (!pageState.hasContent())
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

type BlockNode = Extract<ResolvedNode, { kind: 'block' }>;

/**
 * Un block che si sta spezzando fra più pagine: sulla pagina corrente esiste
 * un suo clone vuoto che raccoglie i figli man mano che vengono piazzati.
 */
interface OpenBlock {
    /** il clone che raccoglie i figli su QUESTA pagina */
    wrapper: BlockNode;
    /** l'array che contiene il wrapper, per poterlo rimuovere se resta vuoto */
    parent: ResolvedNode[];
    /** l'originale, per riaprire un clone identico sulla pagina successiva */
    source: BlockNode;
    /** altezza del wrapper a vuoto (padding + bordi) */
    overhead: number;
    /** gap verticale fra i figli; 0 per i block in riga, dove il gap è orizzontale */
    gap: number;
}

class PageState {
    /** Catena dei block aperti, dal più esterno al più interno. */
    private openBlocks: OpenBlock[] = [];

    constructor(
        public pages: Page[],
        public page: Page,
        public remainingHeight: number,
        public readonly pageWidth: number,
        public readonly measurer: Measurer,
        public readonly pageAreaHeight: number,
    ) {}

    /**
     * C'è già qualcosa di reale su questa pagina? Un wrapper appena aperto e
     * ancora vuoto non conta: altrimenti si aprirebbe una pagina bianca per far
     * posto a un nodo che comunque non ci sta.
     */
    hasContent(): boolean {
        if (this.openBlocks.length === 0) return this.page.nodes.length > 0;
        // qualcosa in pagina oltre alla catena aperta
        if (this.page.nodes.some(n => n !== this.openBlocks[0]!.wrapper)) return true;
        // un wrapper con più del solo anello successivo della catena
        return this.openBlocks.some((open, i) => {
            const chainLink = i === this.openBlocks.length - 1 ? 0 : 1;
            return open.wrapper.children.length > chainLink;
        });
    }

    /**
     * Il gap che il PROSSIMO piazzamento pagherà: dentro un block in colonna
     * con gap, dal secondo figlio in poi. Va incluso nel controllo di capienza,
     * altrimenti si accetta un figlio che poi costa di più di quanto misurato.
     */
    private pendingGap(): number {
        const open = this.openBlocks[this.openBlocks.length - 1];
        return open != null && open.wrapper.children.length > 0 ? open.gap : 0;
    }

    /** Un nodo alto `height` entra nello spazio rimasto, gap incluso? */
    fits(height: number): boolean {
        return height + this.pendingGap() <= this.remainingHeight;
    }

    /**
     * Apre un clone vuoto di `source` sulla pagina corrente: da qui in poi i
     * figli piazzati finiscono dentro il clone, non direttamente in pagina.
     */
    openBlock(source: BlockNode) {
        const wrapper: BlockNode = {
            kind: 'block',
            direction: source.direction,
            style: source.style,
            children: [],
        };
        // Il wrapper occupa spazio anche da vuoto (padding, bordi): va scalato
        // subito, altrimenti il contenuto sfora di quel tanto.
        const overhead = this.measurer.measure(wrapper, this.pageWidth);
        const parent = this.openBlocks.length > 0
            ? this.openBlocks[this.openBlocks.length - 1]!.wrapper.children
            : this.page.nodes;
        const gap = source.direction === 'column' && source.style?.gap != null
            ? convertMeasureToMm(source.style.gap)
            : 0;

        this.place(wrapper, overhead);
        this.openBlocks.push({ wrapper, parent, source, overhead, gap });
    }

    /** Chiude il block più interno, scartandolo se non ha raccolto nulla. */
    closeBlock() {
        const open = this.openBlocks.pop();
        if (open != null && open.wrapper.children.length === 0) {
            this.discard(open);
            this.remainingHeight += open.overhead;
        }
    }

    private discard(open: OpenBlock) {
        const index = open.parent.indexOf(open.wrapper);
        if (index >= 0) open.parent.splice(index, 1);
    }

    startNewPage() {
        // I wrapper rimasti vuoti sulla pagina che chiudiamo non devono lasciare
        // scatole fantasma. Dal più interno al più esterno: scartando l'interno
        // anche l'esterno può restare vuoto a sua volta.
        for (let i = this.openBlocks.length - 1; i >= 0; i--) {
            const open = this.openBlocks[i]!;
            if (open.wrapper.children.length === 0) this.discard(open);
        }

        const reopen = this.openBlocks.map(open => open.source);
        this.openBlocks = [];

        this.page = {
            nodes: [],
            pageNumber: this.page.pageNumber + 1,
        };
        this.remainingHeight = this.pageAreaHeight;
        this.pages.push(this.page);

        // La stessa catena riparte identica sulla pagina nuova: è questo che
        // fa sopravvivere il contenitore allo split.
        reopen.forEach(source => this.openBlock(source));
    }

    place(node: ResolvedNode, height: number) {
        const open = this.openBlocks[this.openBlocks.length - 1];
        if (open != null) {
            // il gap si paga dal secondo figlio in poi
            if (open.wrapper.children.length > 0) this.remainingHeight -= open.gap;
            open.wrapper.children.push(node);
        } else {
            this.page.nodes.push(node);
        }
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