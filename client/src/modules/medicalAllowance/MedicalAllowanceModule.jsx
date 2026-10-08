import ModuleShell from "../../components/ModuleShell";
import MedicalAllowanceApp from "./MedicalAllowanceApp";
import "./medicalAllowance.css";

function MedicalAllowanceModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="medical-allowance-module-scope" onBack={onBack} username={displayName || username}>
            <div className="medical-allowance-module-content">
                <MedicalAllowanceApp />
            </div>
        </ModuleShell>
    );
}

export default MedicalAllowanceModule;
