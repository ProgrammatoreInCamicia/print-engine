import { useDesigner } from '../state/DesignerContext';
import { scopesAt, buildContext, ContextFailure } from './scopesAt';
import { fieldTree, FieldTreeNode } from './fieldTree';
import { TsExpressionEngine } from '@print-engine/expr';
import './FieldTreePanel.css';
import { getAtPath } from '../structure/paths';
import { isObject } from '../utils/common';
import { useMemo } from 'react';

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

    const { selectedNode, canInsert, result } = useMemo(() => {
        if (selection === null) {
            return { selectedNode: null, canInsert: false, result: null };
        }
        const selectedNode = getAtPath(doc, selection);
        const canInsert = selectedNode?.type === 'field';
        const scopes = scopesAt(doc, selection);
        const result = buildContext(scopes, sampleData, engine);
        return { selectedNode, canInsert, result };
    }, [doc, selection, sampleData]);

    if (selection === null || result === null) {
        return <div className="field-tree-panel-empty">Seleziona un nodo per vedere i campi disponibili</div>;
    }

    const scopeEntries = [
        { name: '$', data: result.ctx.root },
        ...(result.ctx.item !== undefined ? [{ name: '$item', data: result.ctx.item }] : []),
    ];

    const canInsertNow = canInsert && selectedNode?.type === 'field' && selection !== null;

    return (
        <div className="field-tree-panel">
            {!canInsert && (
                <div className="field-tree-panel-hint">
                    Seleziona un campo per poter inserire un'espressione
                </div>
            )}
            {scopeEntries.map(scope => {
                const data = scope.data;
                const isScalar = !isObject(data) && !Array.isArray(data);
                const canSelectScope = canInsert && isScalar;

                return (
                    <div key={scope.name} className="field-tree-scope">
                        <h4
                            className={`field-tree-scope-name ${canSelectScope ? 'selectable' : ''}`}
                            onClick={() => canSelectScope && canInsertNow && updateNode(selection, { ...selectedNode, bind: scope.name })}
                        >{scope.name}</h4>
                        <ul className="field-tree-list">
                            {fieldTree(data, scope.name).map(node => (
                                <FieldTreeItem
                                    key={node.expr}
                                    node={node}
                                    canInsert={canInsert}
                                    onSelect={(expr) => {
                                        if (canInsertNow) {
                                            updateNode(selection, { ...selectedNode, bind: expr });
                                        }
                                    }}
                                />
                            ))}
                        </ul>
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
    const canSelectField = canInsert && node.kind === 'value' && !node.isPluck;
    return (
        <li className="field-tree-item">
            <span className="field-tree-item-name">{node.name}</span>{' '}
            <span
                className={`field-tree-item-expr ${!canSelectField ? 'disabled' : ''}`}
                onClick={() => canSelectField && onSelect(node.expr)}
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