import { useDesigner } from '../state/DesignerContext';
import { scopesAt, resolveScopeData } from './scopesAt';
import { fieldTree, FieldTreeNode } from './fieldTree';
import { TsExpressionEngine } from '@print-engine/expr';
import './FieldTreePanel.css';
import { Expr, Node } from '@print-engine/schema';
import { getAtPath, NodePath } from '../structure/paths';

const engine = new TsExpressionEngine();

export function FieldTreePanel() {
    const { doc, selection, sampleData, updateNode } = useDesigner();

    if (selection === null) {
        return <div className="field-tree-panel-empty">Seleziona un nodo per vedere i campi disponibili</div>;
    }

    const selectedNode = getAtPath(doc, selection);
    const canInsert = selectedNode?.type === 'field';
    const scopes = scopesAt(doc, selection);

    return (
        <div className="field-tree-panel">
            {!canInsert && (
                <div className="field-tree-panel-hint">
                    Seleziona un campo per poter inserire un'espressione
                </div>
            )}
            {scopes.map(scope => {
                const data = resolveScopeData(scope, sampleData, engine);

                return (
                    <div key={scope.name} className="field-tree-scope">
                        <h4 className="field-tree-scope-name">{scope.name}</h4>
                        {data === undefined ? (
                            <div className="field-tree-scope-unavailable">Dati non disponibili</div>
                        ) : (
                            <ul className="field-tree-list">
                                {fieldTree(data, scope.name).map(node => (
                                    <FieldTreeItem 
                                        key={node.expr} 
                                        node={node} 
                                        canInsert={canInsert}
                                        onSelect={(expr) => {
                                            if (canInsert && selectedNode && selection) {
                                                updateNode(selection, { ...selectedNode, bind: expr });
                                            }
                                        }}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function FieldTreeItem({ 
    node, 
    canInsert,
    onSelect
}: { 
    node: FieldTreeNode;
    canInsert: boolean;
    onSelect: (expr: string) => void;

}) {
    return (
        <li className="field-tree-item">
            <span className="field-tree-item-name">{node.name}</span>{' '}
            <span 
                className={`field-tree-item-expr ${!canInsert ? 'disabled' : ''}`}
                onClick={() => canInsert && onSelect(node.expr)}
            >
                ({node.expr})
            </span>
            {node.children && (
                <ul className="field-tree-item-children">
                    {node.children.map(child => (
                        <FieldTreeItem 
                            key={child.expr} 
                            node={child} 
                            canInsert={canInsert} 
                            onSelect={onSelect} 
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}