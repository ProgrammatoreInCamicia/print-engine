import { Node } from "@print-engine/schema";
import { childPaths, NodePath, pathKey } from "./paths";
import { useDesigner } from "../state/DesignerContext";
import './StructureNode.css';
import { describeNode } from "./labels";

export function StructureNode({ node, path }: { node: Node, path: NodePath }) {
    const { selection, setSelection } = useDesigner();

    const isSelected = selection !== null && pathKey(selection) === pathKey(path);

    const entries = childPaths(node, path);

    return (
        <div 
        className={`structure-node ${isSelected ? 'selected' : ''}`}
        onClick={(e) => {
            e.stopPropagation();
            setSelection(path);
        }}>
            <span className="structure-node-label">{describeNode(node)}</span>
            {entries.map(entry => {
                if (entry.isEmpty) {
                    return (
                        <div 
                        className="structure-node-empty" key={pathKey(entry.path)}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}>
                            {entry.label} (empty)
                        </div>
                    );
                } else {
                    const childNode = entry.node;
                    return (
                        <StructureNode
                            key={pathKey(entry.path)}
                            node={childNode}
                            path={entry.path}
                        />
                    )
                }
            })}
        </div>
    );
}