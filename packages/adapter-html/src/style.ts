import { Style } from "@print-engine/schema";

export function styleToCss(style: Style | undefined): string {
    if (style == null) return '';
    const el = document.createElement('div');
    const styleDeclaration = el.style;
    
    styleDeclaration.textAlign = style.align ?? '';
    styleDeclaration.background = style.background ?? '';
    styleDeclaration.color = style.color ?? '';
    styleDeclaration.border = style.border ?? '';
    // Assigning '' to a longhand REMOVES it, and a shorthand is stored expanded
    // into its longhands: clearing the four sides would wipe out the `border`
    // set just above, leaving the element with no border at all. So a side is
    // only assigned when it is actually declared.
    if (style.borderBottom != null) styleDeclaration.borderBottom = style.borderBottom;
    if (style.borderRight != null) styleDeclaration.borderRight = style.borderRight;
    if (style.borderLeft != null) styleDeclaration.borderLeft = style.borderLeft;
    if (style.borderTop != null) styleDeclaration.borderTop = style.borderTop;
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