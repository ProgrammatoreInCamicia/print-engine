import { useEffect, useState } from "react";
import { isObject } from "../utils/common";
import { useDesigner } from "../state/DesignerContext";
import { Json } from "@print-engine/expr";

export function DataPanel() {
    const { sampleData, setSampleData } = useDesigner();
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState<string>('');
    const [parsed, setParsed] = useState<Json>(null);

    useEffect(() => {
        setText(JSON.stringify(sampleData, null, 2));
    }, [sampleData]);

    const changeText = (newText: string) => {
        setText(newText);
        try {
            const result: Json = JSON.parse(newText);
            if (!isObject(result) && !Array.isArray(result)) {
                setError('Root must be an object or array');
                setParsed(null);
            } else {
                setError(null);
                setParsed(result);
            }
        } catch {
            setError('Invalid JSON');
            setParsed(null);
        }
    };

    return (
        <div className="data-panel">
            <h2>Sample Data</h2>
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
                placeholder="Enter sample data in JSON format"
            />
            {error && <div className="error">{error}</div>}
            <button disabled={parsed === null} onClick={() => setSampleData(parsed!)}>
                Load Data
            </button>
        </div>
    );

}