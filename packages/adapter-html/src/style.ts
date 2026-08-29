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
    styleDeclaration.borderRight = style.borderRight ?? '';
    styleDeclaration.borderLeft = style.borderLeft ?? '';
    styleDeclaration.borderTop = style.borderTop ?? '';
    styleDeclaration.fontFamily = style.font ?? '';
    styleDeclaration.padding = style.padding ?? '';
    styleDeclaration.fontWeight = (style.weight ?? '') + '';
    styleDeclaration.fontSize = style.size ?? '';
    styleDeclaration.width = style.width ?? '';
    // Consente agli item flex di rispettare la propria larghezza (esplicita o
    // calcolata) invece di sforarla per la min-content del contenuto: senza
    // questo le columns annidate escono dai limiti di pagina.
    styleDeclaration.minWidth = '0';
    // Una width dichiarata è rigida: niente shrink. Altrimenti in un flex-row le
    // celle a larghezza fissa si restringono in proporzione quando una cella
    // "flessibile" (grow, senza width) ha contenuto largo, e le colonne finiscono
    // disallineate da una riga all'altra.
    if (style.width != null) {
        styleDeclaration.flexShrink = '0';
    }
    styleDeclaration.flexGrow = (style.grow ?? '') + '';
    styleDeclaration.gap = style.gap ?? '';
    styleDeclaration.borderRadius = style.borderRadius ?? '';

    return styleDeclaration.cssText;
}