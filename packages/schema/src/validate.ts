import { CURRENT_SCHEMA_VERSION } from "./model.js";

export interface ValidationIssue {
    path: string;
    message: string;
}

const KNOWN_TYPES = new Set([
  'stack', 'repeat', 'group', 'canvas', 'field', 'text', 'image', 'columns',
]);

const PAGE_SIZES = new Set(['A3', 'A4', 'A5', 'Letter', 'Legal']);
const ORIENTATIONS = new Set(['portrait', 'landscape']);
const DIRECTIONS = new Set(['column', 'row']);
const BREAK_INSIDE_VALUES = new Set(['auto', 'avoid']);
const COLUMNS_MODES = new Set(['independent', 'newspaper']);

export function validateDocument(doc: unknown): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (!isObject(doc)) {
        issues.push({
            message: 'The document must be a js object',
            path: '$'
        });
        return issues;
    }

    if (typeof doc.schemaVersion !== 'number') {
        issues.push({
            path: '$.schemaVersion',
            message: 'schemaVersion is a required field'
        });
    } else if (doc.schemaVersion > CURRENT_SCHEMA_VERSION) {
        issues.push({
            path: '$.schemaVersion',
            message: `document schemaVersion ${doc.schemaVersion} is newer than supported ${CURRENT_SCHEMA_VERSION}`,
        });
    }

    if (doc.page == null) {
        issues.push({
            path: '$.page',
            message: 'page is a required field'
        });
    } else if (!isObject(doc.page)) {
        issues.push({ path: '$.page', message: 'page must be an object' });
    } else {
        if (typeof doc.page.size !== 'string' || !PAGE_SIZES.has(doc.page.size)) {
            issues.push({
                path: '$.page.size',
                message: `page.size must be one of ${[...PAGE_SIZES].join(', ')}, got: ${String(doc.page.size)}`,
            });
        }
        if (doc.page.orientation != null &&
            (typeof doc.page.orientation !== 'string' || !ORIENTATIONS.has(doc.page.orientation))) {
            issues.push({
                path: '$.page.orientation',
                message: `page.orientation must be one of ${[...ORIENTATIONS].join(', ')}, got: ${String(doc.page.orientation)}`,
            });
        }
    }

    if (doc.body == null) {
        issues.push({
            path: '$.body',
            message: 'body is a required field'
        });
    } else {
        validateNode(doc.body, '$.body', issues);
    }

    if (doc.regions != null) {
        if (!isObject(doc.regions)) {
            issues.push({ path: '$.regions', message: 'regions must be an object' });
        } else {
            if (doc.regions.header != null) {
                validateNode(doc.regions.header, '$.regions.header', issues);
            }
            if (doc.regions.footer != null) {
                validateNode(doc.regions.footer, '$.regions.footer', issues);
            }
        }
    }

    return issues;
}

function validateNode(node: unknown, path: string, issues: ValidationIssue[]): void {
    if (!isObject(node)) {
        issues.push({ message: 'The node must be a js object', path });
        return;
    }

    if (typeof node.type !== "string" || !KNOWN_TYPES.has(node.type))
    {
        issues.push({ message: `The node type is unknown: ${String(node.type)}`, path });
        return;
    }

    switch (node.type) {
        case 'stack':
            if (node.direction != null &&
                (typeof node.direction !== 'string' || !DIRECTIONS.has(node.direction))) {
                issues.push({
                    path: `${path}.direction`,
                    message: `stack.direction must be one of ${[...DIRECTIONS].join(', ')}, got: ${String(node.direction)}`,
                });
            }
            validateBreakControls(node, path, issues);

            if (!Array.isArray(node.children)) {
                issues.push({ message: 'The stack node must contain children property', path });
            } else {
                node.children.forEach((element, i) => {
                    validateNode(element, `${path}.children[${i}]`, issues);
                });
            }
            break;
        case 'repeat':
            if (typeof node.dataSource !== 'string') {
                issues.push({ message: 'The repeat node must contain dataSource property', path });
            }
            if (node.template == null) {
                issues.push({ message: 'The repeat node must contain template property', path });
            } else {
                validateNode(node.template, `${path}.template`, issues);
            }
            validateBreakControls(node, path, issues);
            break;
        case 'group':
            if (typeof node.dataSource !== 'string') {
                issues.push({ message: 'The group node must contain dataSource property', path });
            }
            if (typeof node.groupBy !== 'string') {
                issues.push({ message: 'The group node must contain groupBy property', path });
            }
            if (node.detail == null) {
                issues.push({ message: 'The group node must contain detail property', path });
            } else {
                validateNode(node.detail, `${path}.detail`, issues);
            }
            if (node.groupHeader != null) {
                validateNode(node.groupHeader, `${path}.groupHeader`, issues);
            }
            if (node.groupFooter != null) {
                validateNode(node.groupFooter, `${path}.groupFooter`, issues);
            }
            validateBreakControls(node, path, issues);
            break;
        case 'canvas':
            if (typeof node.height !== 'string') {
                issues.push({ message: 'The canvas node must contain height property', path });
            }
            if (!Array.isArray(node.children)) {
                issues.push({ message: 'The canvas node must contain children property', path });
            } else {
                node.children.forEach((element, i) => {
                    if (!isObject(element)) { 
                        issues.push({ message: 'The canvas children must be a js object', path }); 
                        return;
                    }
                    if (typeof element.x !== 'string') {
                        issues.push({ 
                            message: 'The canvas children must contain x property', 
                            path: `${path}.children[${i}]` 
                        });
                    }
                    if (typeof element.y !== 'string') {
                        issues.push({ 
                            message: 'The canvas children must contain y property', 
                            path: `${path}.children[${i}]` 
                        });
                    }
                    validateNode(element.node, `${path}.children[${i}].node`, issues);
                });
            }
            break;
        case 'field':
            if (typeof node.bind !== 'string') {
                issues.push({ message: 'The field node must contain bind property', path });
            }
            break;
        case 'text':
            if (typeof node.value !== 'string') {
                issues.push({ message: 'The text node must contain value property', path });
            }
            break;
        case 'image':
            if ((typeof node.src !== 'string') && (typeof node.bind !== 'string')) {
                issues.push({ message: 'The image node must contain src or bind property', path });
            }
            break;
        case 'columns':
            if (typeof node.mode !== 'string' || !COLUMNS_MODES.has(node.mode)) {
                issues.push({
                    path: `${path}.mode`,
                    message: `columns.mode must be one of ${[...COLUMNS_MODES].join(', ')}, got: ${String(node.mode)}`,
                });
            }
            if (!Array.isArray(node.children)) {
                issues.push({ message: 'The columns node must contain children property', path });
            } else {
                node.children.forEach((element, i) => {
                    validateNode(element, `${path}.children[${i}]`, issues);
                });
            }
            break;
        default:
            break;
    }
}

// breakInside/keepWithNext sono condivisi da stack, repeat e group: stessa
// validazione per tutti e tre, così non resta scoperto (prima solo stack).
function validateBreakControls(node: Record<string, unknown>, path: string, issues: ValidationIssue[]): void {
    if (node.breakInside != null &&
        (typeof node.breakInside !== 'string' || !BREAK_INSIDE_VALUES.has(node.breakInside))) {
        issues.push({
            path: `${path}.breakInside`,
            message: `breakInside must be one of ${[...BREAK_INSIDE_VALUES].join(', ')}, got: ${String(node.breakInside)}`,
        });
    }
    if (node.keepWithNext != null && typeof node.keepWithNext !== 'boolean') {
        issues.push({
            path: `${path}.keepWithNext`,
            message: `keepWithNext must be a boolean, got: ${String(node.keepWithNext)}`,
        });
    }
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}