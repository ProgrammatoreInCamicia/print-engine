import './App.css';
import { exampleDoc } from './data/exampleDoc';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { DesignerProvider, useDesigner } from './state/DesignerContext';
import { StructureNode } from './structure/StructureNode';

export function App() {
    return (
        <DesignerProvider initialDoc={exampleDoc}>
            <AppLayout />
        </DesignerProvider>
    );
}

export function AppLayout() {
    const { doc, undo, redo, canUndo, canRedo, setSelection } = useDesigner();

    return (
        <div className="app">
            <aside className="app-palette">
                <h2>Palette</h2>
                {/* Step 9: draggable blocks */}
            </aside>

            <main className="app-structure" onClick={() => setSelection(null)}>
                <div className="app-structure-toolbar" onClick={e => e.stopPropagation()}>
                    <h2>Struttura</h2>
                    <button onClick={undo} disabled={!canUndo}>Annulla</button>
                    <button onClick={redo} disabled={!canRedo}>Ripeti</button>
                </div>
                <StructureNode node={doc.body} path={['body']} />
            </main>

            <aside className="app-properties">
                <h2>Proprietà</h2>
                <PropertiesPanel />
                {/* Step 5: panel for the selected node */}
            </aside>
        </div>
    )
}