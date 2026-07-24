import { PageSetup, PrintDocument } from "@print-engine/schema";
import { ResolvedNode } from "./resolved.js";
import { Measurer } from "./measure.js";

export interface Page {
    pageNumber: number;
    nodes: ResolvedNode[];
}

export interface PaginatedDocument {
    pages: Page[];
}

function getPageArea(page: PageSetup): PageSize {
    const pageSizeMap = pageSizeFormat.get(page.size);
    if (pageSizeMap == null) return {height: 0, width: 0};
    const pageSize = {...pageSizeMap};
    if (page.orientation == 'landscape') {
        const width = pageSize.width;
        pageSize.width = pageSize.height;
        pageSize.height = width;
    }
    if (page.margin != null) {
        const marginInMM = convertMeasureToMm(page.margin);
        pageSize.width -= marginInMM * 2;
        pageSize.height -= marginInMM * 2;
    }

    return pageSize;
}

function flatten(node: ResolvedNode): ResolvedNode[] {
    switch (node.kind) {
        case 'text':
            return [node];
        case 'canvas':
            return [node];
        case 'image':
            return [node];
        case 'block':
            return node.children.flatMap(x => flatten(x));    
        default:
            throw new Error(`unhandled node type`);
    }
}

export function paginate(doc: PrintDocument, resolved: ResolvedNode, measurer: Measurer): PaginatedDocument {
    const pages: Page[] = [];

    const flattenNodes = flatten(resolved);
    const pageArea = getPageArea(doc.page);
    let remainingHeight = pageArea.height;

    let page: Page = {
        nodes: [],
        pageNumber: 1
    }
    pages.push(page);

    flattenNodes.forEach(node => {
        const nodeSize = measurer.measure(node, pageArea.width);

        if (nodeSize <= remainingHeight || page.nodes.length === 0)
        {
            page.nodes.push(node);
            remainingHeight -= nodeSize;
        } else {
            page = {
                nodes: [node],
                pageNumber: page.pageNumber + 1
            };
            pages.push(page);
            remainingHeight = pageArea.height - nodeSize;
        }
    })
    
    
    return {
        pages
    };
};

export interface PageSize { width: number; height: number };

const pageSizeFormat: Map<string, PageSize> = new Map<string, PageSize>([
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
        const convertionValue = measureInMM.get(digitAndMeasure[2] ?? '');
        if (convertionValue != null) {
            result = (digitAndMeasure[1] != null ? +digitAndMeasure[1] : 0) * convertionValue;
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