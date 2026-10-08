import ModuleShell from "../../components/ModuleShell";
import DivisionRequestApp from "./DivisionRequestApp";
import "./division.css";

function DivisionRequestModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="division-page" onBack={onBack} username={displayName || username}>
            <div className="division-module-content">
                <DivisionRequestApp />
            </div>
        </ModuleShell>
    );
}

export default DivisionRequestModule;
