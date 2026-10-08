import ModuleShell from "../../components/ModuleShell";
import InvoiceApp from "./InvoiceApp";
import "./invoice.css";

function InvoiceModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="invoice-page" onBack={onBack} username={displayName || username}>
            <div className="invoice-module-content">
                <InvoiceApp />
            </div>
        </ModuleShell>
    );
}

export default InvoiceModule;
