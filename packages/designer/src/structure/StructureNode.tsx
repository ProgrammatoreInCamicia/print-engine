import { Node } from "@print-engine/schema";
import { childPaths, getAtPath, NodePath, pathKey } from "./paths";
import { useDesigner } from "../state/DesignerContext";
import './StructureNode.css';

export function StructureNode({ node, path }: { node: Node, path: NodePath }) {
    const { doc, selection, setSelection } = useDesigner();

    const isSelected = selection !== null && pathKey(selection) === pathKey(path);

    const entries = childPaths(node, path);

    return (
        <div 
        className={`structure-node ${isSelected ? 'selected' : ''}`}
        onClick={(e) => {
            e.stopPropagation();
            setSelection(path);
        }}>
            <span className="structure-node-label">{node.type}</span>
            {entries.map(entry => {
                if (entry.isEmpty) {
                    return <div className="structure-node-empty" key={pathKey(entry.path)}>{entry.label} (empty)</div>;
                } else {
                    const childNode = getAtPath(doc, entry.path);
                    if (!childNode) {
                        return <div key={pathKey(entry.path)}>Missing node at path: {pathKey(entry.path)}</div>;
                    } else {
                        return (
                            <StructureNode
                                key={pathKey(entry.path)}
                                node={childNode}
                                path={entry.path}
                            />
                        )
                    }
                }
                // per ciascuna entry: se è vuota, mostra un placeholder;
                // altrimenti recupera il nodo figlio e richiama StructureNode
            })}
        </div>
    );
}