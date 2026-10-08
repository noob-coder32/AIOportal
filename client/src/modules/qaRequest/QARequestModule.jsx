import ModuleShell from "../../components/ModuleShell";
import QARequestHome from "./QARequestHome";
import "./qaRequest.css";

function QARequestModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="qr-shell" onBack={onBack} username={displayName || username}>
            <QARequestHome />
        </ModuleShell>
    );
}

export default QARequestModule;
