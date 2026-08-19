import './App.css';
import { exampleDoc } from './data/exampleDoc';
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
    const { doc, selection } = useDesigner();

    return (
        <div className="app">
            <aside className="app-palette">
                <h2>Palette</h2>
                {/* Passo 9: blocchi trascinabili */}
            </aside>

            <main className="app-structure">
                <h2>Struttura</h2>
                <StructureNode node={doc.body} path={['body']} />
                {/* Passo 4: StructureNode, superficie di editing */}
            </main>

            <aside className="app-properties">
                <h2>Proprietà</h2>
                {/* Passo 5: pannello per il nodo selezionato */}
            </aside>
        </div>
    )
}