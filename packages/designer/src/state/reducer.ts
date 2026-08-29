import { Node, PrintDocument } from "@print-engine/schema";
import { NodePath, setAtPath } from "../structure/paths";

export interface DesignerState {
    current: PrintDocument;
    selection: NodePath | null;
    past: PrintDocument[];
    future: PrintDocument[];
}

type DesignerAction = 
    { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'UPDATE_NODE'; path: NodePath; node: Node }
    | { type: 'SET_SELECTION'; path: NodePath | null };

export function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
    switch (action.type) {
        case 'SET_SELECTION':
            return {
                ...state,
                selection: action.path
            }
        case 'UPDATE_NODE': {
            const newDoc = setAtPath(state.current, action.path, action.node);
            return {
                ...state,
                selection: action.path,
                past: [
                    ...state.past,
                    state.current
                ],
                current: newDoc,
                future: []
            }
        };
        case 'UNDO': {
            if (state.past.length === 0)
            {
                return state;
            }
            const previous = state.past[state.past.length - 1]!; 
            return {
                ...state,
                current: previous,
                past: state.past.slice(0, -1),
                future: [state.current, ...state.future],
            }
        };
        case 'REDO': {
            if (state.future.length === 0)
            {
                return state;
            }
            const next = state.future[0]!; 
            return {
                ...state,
                current: next,
                past: [...state.past, state.current],
                future: state.future.slice(1),
            }
        };
    }
}