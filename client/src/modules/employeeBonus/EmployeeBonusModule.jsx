import ModuleShell from "../../components/ModuleShell";
import EmployeeBonusApp from "./EmployeeBonusApp";
import "./employeeBonus.css";

function EmployeeBonusModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="employee-bonus-page" onBack={onBack} username={displayName || username}>
            <div className="employee-bonus-content">
                <EmployeeBonusApp />
            </div>
        </ModuleShell>
    );
}

export default EmployeeBonusModule;
