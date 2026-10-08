import ModuleShell from "../../components/ModuleShell";
import Debtor1Home from "./Debtor1Home";

function Debtor1Module({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="debtor-module-scope" onBack={onBack} username={displayName || username}>
            <div className="debtor-module-content">
                <Debtor1Home />
            </div>
        </ModuleShell>
    );
}

export default Debtor1Module;
