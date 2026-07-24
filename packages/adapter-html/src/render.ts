import { ResolvedNode } from '@print-engine/core';
import { styleToCss } from './style';

export function renderNode(node: ResolvedNode): string {
    let html: string = '';
    const style = styleToCss(node.style);
    switch (node.kind) {
        case 'text': {
            const el = document.createElement(node.inline ? 'span' : 'div');
            el.style.cssText = style;
            el.textContent = node.value;
            html += el.outerHTML;
            return html;
            // node.inline ? 
            //     `<span style=${style}>${node.value}</span>` : 
            //     `<div style=${style}>${node.value}</div>`
        }
        case 'block': {
            const el = document.createElement('div');
            el.style.cssText = style;
            el.style.display = 'flex';
            el.style.flexDirection = node.direction;
            el.innerHTML = node.children.map(child => renderNode(child)).join('');
            html += el.outerHTML;
            return html;
            /*
            // TODO - manage 
            node.breakInside
            node.keepWithNext
            */ 
        };
        case 'canvas': {
            const el = document.createElement('div');
            el.style.cssText = style;
            el.style.position = 'relative';
            el.style.height = node.height;
            el.innerHTML = node.children.map((child) => {
                const sub = document.createElement('div');
                sub.style.position = 'absolute';
                sub.style.height = child.h ?? '';
                sub.style.width = child.w ?? '';
                sub.style.left = child.x;
                sub.style.top = child.y;
                sub.innerHTML =renderNode(child.node);
                return sub.outerHTML;
            }).join('');
            html += el.outerHTML;
            return html;
        }
        case 'image': {
            const el = document.createElement('img');
            el.style.cssText = style;
            el.style.height = node.height ?? '';
            el.style.width = node.width ?? '';
            el.src = node.src;
            html += el.outerHTML;
            return html;
        }
        default:
            break;
    }
    return '';
}