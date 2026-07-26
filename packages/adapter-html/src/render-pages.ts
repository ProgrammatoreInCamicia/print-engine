import { getPageSize, PaginatedDocument } from "@print-engine/core";
import { PageSetup } from "@print-engine/schema";
import { renderNode } from "./render.js";

export function renderPages(doc: PaginatedDocument, pageSetup: PageSetup): string {
    let pages: string = '';
    let header: string = '';
    let footer: string = '';
    const pageSize = getPageSize(pageSetup);

    if (doc.header != null) {
        const el = document.createElement('div');
        el.innerHTML = renderNode(doc.header);
        header = el.outerHTML;
    }
    if (doc.footer != null) {
        const el = document.createElement('div');
        el.innerHTML = renderNode(doc.footer);
        footer = el.outerHTML;
    }

    doc.pages.forEach((page, i) => {
        const el = document.createElement('div');
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
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
        const content = document.createElement('div');
        content.style.flexGrow = '1';
        content.innerHTML = page.nodes.map(node => renderNode(node)).join('');
        el.innerHTML = header + content.outerHTML + footer;

        pages += el.outerHTML;
    });

    return pages;
}