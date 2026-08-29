import './App.css';
import { exampleDoc } from './data/exampleDoc';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { DesignerProvider, useDesigner } from './state/DesignerContext';
import { StructureNode } from './structure/StructureNode';

export function App() {

    return (
        <DesignerProvider doc={exampleDoc}>
            <AppLayout />
        </DesignerProvider>
    );
}

export function AppLayout() {
    const { doc } = useDesigner();

    return (
        <div className="app">
            <aside className="app-palette">
                <h2>Palette</h2>
                {/* Step 9: draggable blocks */}
            </aside>

            <main className="app-structure">
                <h2>Struttura</h2>
                <StructureNode node={doc.body} path={['body']} />
                {/* Step 4: StructureNode, the editing surface */}
            </main>

            <aside className="app-properties">
                <h2>Proprietà</h2>
                <PropertiesPanel />
                {/* Step 5: panel for the selected node */}
            </aside>
        </div>
    )
}