import { Node, PrintDocument } from "@print-engine/schema";
import { createContext, ReactNode, useContext, useReducer } from "react";
import { NodePath } from "../structure/paths";
import { designerReducer } from "./reducer";

interface DesignerContextValue {
    doc: PrintDocument;
    selection: NodePath | null;
    setSelection: (path: NodePath | null) => void;
    updateNode: (path: NodePath, node: Node) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const DesignerContext = createContext<DesignerContextValue | null>(null);

export function DesignerProvider({initialDoc, children} : {initialDoc: PrintDocument, children: ReactNode}) {
    const [state, dispatch] = useReducer(designerReducer, {
        current: initialDoc,
        future: [],
        past: [],
        selection: null
    });

    const value: DesignerContextValue = {
        doc: state.current,
        selection: state.selection,
        setSelection: (path) => dispatch({ type: 'SET_SELECTION', path }),
        updateNode: (path, node) => dispatch({ type: 'UPDATE_NODE', path, node }),
        undo: () => dispatch({ type: 'UNDO' }),
        redo: () => dispatch({ type: 'REDO' }),
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
    };

    return (
        <DesignerContext value={value}>
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