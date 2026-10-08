import InvoiceDateChangeApp from "./InvoiceDateChangeApp";
import ModuleShell from "../../components/ModuleShell";
import "./invoiceDateChange.css";

function invoiceDateChangeModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="idc-module-scope" onBack={onBack} username={displayName || username}>
            <InvoiceDateChangeApp />
        </ModuleShell>
    );
}

export default invoiceDateChangeModule;
