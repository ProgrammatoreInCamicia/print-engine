import { Node, PrintDocument } from "@print-engine/schema";
import { createContext, ReactNode, useContext, useEffect, useReducer, useState } from "react";
import { NodePath } from "../structure/paths";
import { designerReducer } from "./reducer";
import { Json } from "@print-engine/expr";
import { sampleData as initData } from "../data/sampleData";
import { isObject } from "../utils/common";

// Namespaced: the origin may host other things that persist data.
const SAMPLE_DATA_KEY = 'print-engine.designer.sampleData';

interface DesignerContextValue {
    doc: PrintDocument;
    selection: NodePath | null;
    setSelection: (path: NodePath | null) => void;
    updateNode: (path: NodePath, node: Node) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    sampleData: Json, 
    setSampleData: (sampleData: Json) => void
}

const DesignerContext = createContext<DesignerContextValue | null>(null);

export function DesignerProvider({initialDoc, children} : {initialDoc: PrintDocument, children: ReactNode}) {
    const [state, dispatch] = useReducer(designerReducer, {
        current: initialDoc,
        future: [],
        past: [],
        selection: null
    });
    const [sampleData, setSampleData] = useState<Json>(() => {
        // Load sample data from localStorage if available, otherwise use the initial sample data.
        // The read sits inside the try too: merely touching localStorage can
        // throw (SecurityError when the browser blocks site data), and a
        // convenience must never keep the editor from mounting.
        try {
            const savedSampleData = localStorage.getItem(SAMPLE_DATA_KEY);
            if (savedSampleData == null) {
                return initData;
            }
            const result: Json = JSON.parse(savedSampleData);
            if (!isObject(result) && !Array.isArray(result)) {
                console.error('The localStorage data must be an object or an array:', result);
                return initData;
            }
            return result;
        }
        catch (e) {
            console.error('Failed to read sample data from localStorage:', e);
            return initData;
        }
    });

    useEffect(() => {
        try {
            // Save sample data to localStorage whenever it changes
            localStorage.setItem(SAMPLE_DATA_KEY, JSON.stringify(sampleData));
        } catch (e) {
            console.error('Failed to save sample data to localStorage:', e);
        }
    }, [sampleData]);

    const value: DesignerContextValue = {
        doc: state.current,
        selection: state.selection,
        setSelection: (path) => dispatch({ type: 'SET_SELECTION', path }),
        updateNode: (path, node) => dispatch({ type: 'UPDATE_NODE', path, node }),
        undo: () => dispatch({ type: 'UNDO' }),
        redo: () => dispatch({ type: 'REDO' }),
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
        sampleData,
        setSampleData
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