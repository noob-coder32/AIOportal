import ModuleShell from "../../components/ModuleShell";
import DebtorUpdApp from "./DebtorUpdApp";
import "./invoice.css";

function DebtorUpdModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="invoice-page" onBack={onBack} username={displayName || username}>
            <div className="invoice-module-content">
                <DebtorUpdApp />
            </div>
        </ModuleShell>
    );
}

export default DebtorUpdModule;
