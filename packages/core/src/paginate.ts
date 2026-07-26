import { PageSetup, PrintDocument } from "@print-engine/schema";
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

function manageNode(node: ResolvedNode, next: ResolvedNode | undefined, pageState: PageState) {
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
    manageNode(resolved.body, undefined,pageState);
    
    return {
        header: resolved.header,
        pages: pageState.pages,
        footer: resolved.footer
    };
};

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