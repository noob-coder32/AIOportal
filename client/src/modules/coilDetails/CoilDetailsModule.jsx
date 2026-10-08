import ModuleShell from "../../components/ModuleShell";
import CoilDetailsApp from "./CoilDetailsApp";
import "./coilDetails.css";

function CoilDetailsModule({ onBack, username, displayName }) {
    return (
        <ModuleShell
            moduleScopeClass="coil-details-module-scope"
            onBack={onBack}
            username={displayName || username}
        >
            <CoilDetailsApp />
        </ModuleShell>
    );
}

export default CoilDetailsModule;
