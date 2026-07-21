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
                    validateNode(element, path + `.children[${i}]`, issues);
                });
            }
            break;
    
        default:
            break;
    }


}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}