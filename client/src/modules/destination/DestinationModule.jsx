import ModuleShell from "../../components/ModuleShell";
import DestinationHome from "./DestinationHome";
import "./destination.css";

function DestinationModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="destination-module-scope" onBack={onBack} username={displayName || username}>
            <div className="destination-module-content">
                <DestinationHome />
            </div>
        </ModuleShell>
    );
}

export default DestinationModule;
