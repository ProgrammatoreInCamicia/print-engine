import { useEffect, useState } from "react";
import { isObject } from "../utils/common";
import { useDesigner } from "../state/DesignerContext";
import { Json } from "@print-engine/expr";
import './DataPanel.css';

export function DataPanel() {
    const { sampleData, setSampleData } = useDesigner();
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState<string>('');
    const [parsed, setParsed] = useState<Json>(null);

    // The textarea mirrors the loaded data, and so does `parsed`: what is shown
    // is already valid and already loaded, so there is nothing to load yet.
    useEffect(() => {
        setText(JSON.stringify(sampleData, null, 2));
        setParsed(sampleData);
        setError(null);
    }, [sampleData]);

    const changeText = (newText: string) => {
        setText(newText);
        try {
            const result: Json = JSON.parse(newText);
            if (!isObject(result) && !Array.isArray(result)) {
                setError('La radice deve essere un oggetto o un array');
                setParsed(null);
            } else {
                setError(null);
                setParsed(result);
            }
        } catch {
            setError('JSON non valido');
            setParsed(null);
        }
    };

    // Enabled only when the textarea holds valid JSON that is not already
    // loaded: `parsed` is the very same object as `sampleData` until it is edited.
    const canLoad = parsed !== null && parsed !== sampleData;

    return (
        <div className="data-panel">
            <h2>Dati di esempio</h2>
            <input
                type="file"
                accept=".json"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        file.text().then(changeText);
                    }
                }}
            />
            <textarea
                value={text}
                onChange={(e) => changeText(e.target.value)}
                placeholder="Incolla qui i dati di esempio in formato JSON"
            />
            {error && <div className="data-panel-error">{error}</div>}
            <button disabled={!canLoad} onClick={() => setSampleData(parsed!)}>
                Carica dati
            </button>
        </div>
    );
}
