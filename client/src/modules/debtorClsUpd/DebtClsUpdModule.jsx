import ModuleShell from "../../components/ModuleShell";
import DebtClsUpdApp from "./DebtClsUpdApp";
import "./invoice.css";

function DebtorClsUpdModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="invoice-page" onBack={onBack} username={displayName || username}>
            <div className="invoice-module-content">
                <DebtClsUpdApp />
            </div>
        </ModuleShell>
    );
}

export default DebtorClsUpdModule;
