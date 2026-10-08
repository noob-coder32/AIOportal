import ModuleShell from "../../components/ModuleShell";
import ComplaintsApp from "./ComplaintsApp";
import "./complaints.css";

function ComplaintsModule({ onBack, username, displayName }) {
    return (
        <ModuleShell
            moduleScopeClass="complaints-module"
            onBack={onBack}
            username={displayName || username}
        >
            <ComplaintsApp />
        </ModuleShell>
    );
}

export default ComplaintsModule;
