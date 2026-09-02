import { useState } from 'react';
import './App.css';
import { exampleDoc } from './data/exampleDoc';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { DesignerProvider, useDesigner } from './state/DesignerContext';
import { StructureNode } from './structure/StructureNode';
import { Preview } from './preview/Preview';
import { sampleData } from './data/sampleData';

export function App() {
    return (
        <DesignerProvider initialDoc={exampleDoc}>
            <AppLayout />
        </DesignerProvider>
    );
}

export function AppLayout() {
    const { doc, undo, redo, canUndo, canRedo, setSelection } = useDesigner();
    const [view, setView] = useState<'structure' | 'preview'>('structure');

    // Only the structure view has a selection to clear. In the preview there is
    // nothing selectable, so a click on it must leave the panel alone.
    const clearSelection = view === 'structure' ? () => setSelection(null) : undefined;

    return (
        <div className="app">
            <aside className="app-palette">
                <h2>Palette</h2>
                {/* Step 9: draggable blocks */}
            </aside>

            <main className="app-structure" onClick={clearSelection}>
                <div className="app-structure-toolbar" onClick={e => e.stopPropagation()}>
                    <h2>Documento</h2>
                    <button onClick={() => setView('structure')} disabled={view === 'structure'}>Struttura</button>
                    <button onClick={() => setView('preview')} disabled={view === 'preview'}>Anteprima</button>
                    <button onClick={undo} disabled={!canUndo}>Annulla</button>
                    <button onClick={redo} disabled={!canRedo}>Ripeti</button>
                </div>
                {view === 'structure' 
                    ? <StructureNode node={doc.body} path={['body']} />
                    : <Preview sampleData={sampleData} />
                }
            </main>

            <aside className="app-properties">
                <h2>Proprietà</h2>
                <PropertiesPanel />
                {/* Step 5: panel for the selected node */}
            </aside>
        </div>
    )
}