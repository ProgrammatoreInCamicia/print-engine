import { useDesigner } from '../state/DesignerContext';
import { scopesAt, buildContext, ContextFailure } from './scopesAt';
import { fieldTree, FieldTreeNode } from './fieldTree';
import { TsExpressionEngine } from '@print-engine/expr';
import './FieldTreePanel.css';
import { getAtPath } from '../structure/paths';

const engine = new TsExpressionEngine();

// Keyed on every failure the resolver can report: a new reason does not
// compile until it has a sentence here.
const FAILURE_MESSAGES: Record<ContextFailure, string> = {
    'null': "l'espressione a monte non ha trovato niente",
    'not-array': "l'espressione a monte non restituisce un elenco",
    'empty': "l'elenco a monte è vuoto",
    'engine-error': "l'espressione a monte non è valida",
};

export function FieldTreePanel() {
    const { doc, selection, sampleData, updateNode } = useDesigner();

    if (selection === null) {
        return <div className="field-tree-panel-empty">Seleziona un nodo per vedere i campi disponibili</div>;
    }

    const selectedNode = getAtPath(doc, selection);
    const canInsert = selectedNode?.type === 'field';
    const scopes = scopesAt(doc, selection);
    const result = buildContext(scopes, sampleData, engine);

    const scopeEntries = [
        { name: '$', data: result.ctx.root },
        ...(result.ctx.item !== undefined ? [{ name: '$item', data: result.ctx.item }] : []),
    ];

    return (
        <div className="field-tree-panel">
            {!canInsert && (
                <div className="field-tree-panel-hint">
                    Seleziona un campo per poter inserire un'espressione
                </div>
            )}
            {scopeEntries.map(scope => {
                const data = scope.data;

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
            {result.error && (
                <div className="field-tree-scope-unavailable">
                    Dati non disponibili per {result.error.scope}: {FAILURE_MESSAGES[result.error.reason]}
                </div>
            )}
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