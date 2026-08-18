import { PrintDocument } from "@print-engine/schema";
import { createContext, ReactNode, useContext, useState } from "react";
import { NodePath } from "../structure/paths";

interface DesignerContextValue {
    doc: PrintDocument;
    selection: NodePath | null;
    setSelection: (path: NodePath | null) => void;
}

const DesignerContext = createContext<DesignerContextValue | null>(null);

export function DesignerProvider({doc, children} : {doc: PrintDocument, children: ReactNode}) {
    const [selection, setSelection] = useState<NodePath | null>(null);

    return (
        <DesignerContext value={{
            doc,
            selection,
            setSelection
        }}>
            {children}
        </DesignerContext>
    )
}

export function useDesigner() {
    const ctx = useContext(DesignerContext);
    if (ctx === null) {
        throw new Error('useDesigner must be used within a DesignerProvider');
    }
    return ctx;
}