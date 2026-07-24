import { Style } from "@print-engine/schema";

export function styleToCss(style: Style | undefined): string {
    if (style == null) return '';
    const el = document.createElement('div');
    const styleDeclaration = el.style;
    
    styleDeclaration.textAlign = style.align ?? '';
    styleDeclaration.background = style.background ?? '';
    styleDeclaration.color = style.color ?? '';
    styleDeclaration.border = style.border ?? '';
    styleDeclaration.borderBottom = style.borderBottom ?? '';
    styleDeclaration.borderTop = style.borderTop ?? '';
    styleDeclaration.fontFamily = style.font ?? '';
    styleDeclaration.padding = style.padding ?? '';
    styleDeclaration.fontWeight = (style.weight ?? '') + '';
    styleDeclaration.fontSize = style.size ?? '';
    styleDeclaration.width = style.width ?? '';
    styleDeclaration.flexGrow = (style.grow ?? '') + '';
    styleDeclaration.gap = style.gap ?? '';

    return styleDeclaration.cssText;
}