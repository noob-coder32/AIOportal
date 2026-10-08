import ModuleShell from "../../components/ModuleShell";
import EmpHODApp from "./EmpHODApp";

function HRModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="hr-module-scope" onBack={onBack} username={displayName || username}>
            <div className="hr-module-content">
                <EmpHODApp />
            </div>
        </ModuleShell>
    );
}

export default HRModule;
