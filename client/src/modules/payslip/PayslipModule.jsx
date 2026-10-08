import ModuleShell from "../../components/ModuleShell";
import PayslipApp from "./PayslipApp";
import "./payslip.css";

function PayslipModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="payslip-module-scope" onBack={onBack} username={displayName || username}>
            <div className="payslip-module-content">
                <PayslipApp />
            </div>
        </ModuleShell>
    );
}

export default PayslipModule;
