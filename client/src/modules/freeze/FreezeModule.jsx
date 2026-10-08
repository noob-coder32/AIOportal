import ModuleShell from "../../components/ModuleShell";
import FreezeApp from "./FreezeApp";

function FreezeModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="freeze-module-scope" onBack={onBack} username={displayName || username}>
            <FreezeApp />
        </ModuleShell>
    );
}

export default FreezeModule;
