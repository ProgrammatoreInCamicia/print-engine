export interface ValidationIssue {
    path: string;
    message: string;
}

const KNOWN_TYPES = new Set([
  'stack', 'repeat', 'group', 'canvas', 'field', 'text', 'image',
]);

export function validateDocument(doc: unknown): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (!isObject(doc)) {
        const issue: ValidationIssue = {
            message: 'The document must be a js object',
            path: '$'
        }
        issues.push(issue);
        return issues;
    }

    if (typeof doc.schemaVersion !== 'number') {
        issues.push({
            path: '$.schemaVersion',
            message: 'schemaVersion is a required field'
        });
    }
    if (doc.page == null) {
        issues.push({
            path: '$.page',
            message: 'page is a required field'
        });
    }
    if (doc.body == null) {
        issues.push({
            path: '$.body',
            message: 'body is a required field'
        });
    } else {
        validateNode(doc.body, '$.body', issues);
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
        default:
            break;
    }
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}