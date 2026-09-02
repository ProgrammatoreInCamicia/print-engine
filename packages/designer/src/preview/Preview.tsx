import { useMemo } from "react"
import { useDesigner } from "../state/DesignerContext";
import { validateDocument } from "@print-engine/schema";
import { Json, TsExpressionEngine } from '@print-engine/expr';
import { paginate, resolve } from "@print-engine/core";
import { DomMeasurer, renderPages } from "@print-engine/adapter-html";
import './Preview.css';

export function Preview({ sampleData }: { sampleData: Json }) {
    const { doc } = useDesigner();
    const result = useMemo(() => {
        const issues = validateDocument(doc);
        if (issues.length > 0) {
            return { issues, html: null };
        }
        const resolved = resolve(doc, sampleData, new TsExpressionEngine());
        const paginated = paginate(doc, resolved, new DomMeasurer());
        const html = renderPages(paginated, doc.page);
        return { issues: [], html };
    }, [doc, sampleData])
    return (
        <div className="preview">
            {result.issues.length > 0 && (
                <div className="preview-validation-issues">
                    <h3>Validation Issues</h3>
                    <ul>
                        {result.issues.map(issue => (
                            <li key={`${issue.path}-${issue.message}`}>{issue.message} — {issue.path}</li>
                        ))}
                    </ul>
                </div>
            )}
            {result.html !== null && (
                <div className="preview-resolved" dangerouslySetInnerHTML={{ __html: result.html }} />
            )}
        </div>
    )
}