import ModuleShell from "../../components/ModuleShell";
import Thickness2App from "./Thickness2App";
import "./thickness2.css";

function Thickness2Module({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="thickness2-module-scope" onBack={onBack} username={displayName || username}>
            <div className="thickness2-module-content">
                <Thickness2App />
            </div>
        </ModuleShell>
    );
}

export default Thickness2Module;
