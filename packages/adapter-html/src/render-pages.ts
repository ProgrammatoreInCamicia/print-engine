import { getPageSize, PaginatedDocument } from "@print-engine/core";
import { PageSetup } from "@print-engine/schema";
import { renderNode } from "./render";

export function renderPages(doc: PaginatedDocument, pageSetup: PageSetup): string {
    let pages: string = '';
     
    const pageSize = getPageSize(pageSetup);

    doc.pages.forEach((page, i) => {
        const el = document.createElement('div');
        el.style.background = '#fff';
        el.style.width = `${pageSize.width}mm`;
        el.style.height = `${pageSize.height}mm`;
        el.style.boxSizing = 'border-box';
        el.style.padding = pageSetup.margin ?? '0';
        el.style.marginBottom = '20px';
        el.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.1)';
        if (i < doc.pages.length - 1) {
            el.style.breakAfter = 'page';
        }
        el.innerHTML = page.nodes.map(node => renderNode(node)).join('');   
        pages += el.outerHTML;
    });

    return pages;
}