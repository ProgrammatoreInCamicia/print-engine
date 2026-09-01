import { Node } from "@print-engine/schema";
import { NodePath } from "../structure/paths";
import { useDesigner } from "../state/DesignerContext";
import './FieldPanel.css';

interface FieldPanelProps {
    node: Extract<Node, { type: 'field' }>;
    path: NodePath;
}

export function FieldPanel({ node, path }: FieldPanelProps) {
    const { updateNode } = useDesigner();

    return (
        <div className="field-panel">
            <label>
                Bind
                <input
                    type="text"
                    value={node.bind}
                    onChange={(e) => {
                        const value = e.target.value;
                        updateNode(path, {...node, bind: value });
                    }}
                />
            </label>
            <label>
                Prefix
                <input
                    type="text"
                    value={node.prefix ?? ''}
                    onChange={(e) => {
                        const value = e.target.value === '' ? undefined : e.target.value;
                        updateNode(path, {...node, prefix: value });
                    }}
                />
            </label>
            <label>
                Suffix
                <input
                    type="text"
                    value={node.suffix ?? ''}
                    onChange={(e) => {
                        const value = e.target.value === '' ? undefined : e.target.value;
                        updateNode(path, {...node, suffix: value });
                    }}
                />
            </label>
            <label>
                Format
                <input
                    type="text"
                    value={node.format ?? ''}
                    onChange={(e) => {
                        const value = e.target.value === '' ? undefined : e.target.value;
                        updateNode(path, {...node, format: value });
                    }}
                />
            </label>
        </div>
    );
}