import { useDesigner } from "../state/DesignerContext";
import { getAtPath } from "../structure/paths";

export function PropertiesPanel() {
    const { selection, doc } = useDesigner();
    let content: React.ReactNode;

    if (selection === null) {
        content = <span className="properties-panel-empty">'No node is selected'</span>;
    } else {
        const currentNode = getAtPath(doc, selection);
        if (currentNode === undefined) {
            content = 'Node is not available';
        } else {
            switch (currentNode.type) {
                case 'field':
                    content = <div>Field panel goes here</div>;
                    break;
                default:
                    content = `No panel yet for type: ${currentNode.type}`;
                    break;
            }
        }
    }

    return (
        <div className="properties-panel">
            {content}
        </div>
    );
}