import ModuleShell from "../../components/ModuleShell";
import QAHome from "./QAHome";
import "./qa.css";

function QAModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="qa-shell" onBack={onBack} username={displayName || username}>
            <QAHome />
        </ModuleShell>
    );
}

export default QAModule;
