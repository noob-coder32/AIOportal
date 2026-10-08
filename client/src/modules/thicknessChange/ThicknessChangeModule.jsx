import ModuleShell from "../../components/ModuleShell";
import ThicknessChangeApp from "./ThicknessChangeApp";
import "./thicknessChange.css";

function ThicknessChangeModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="thickness-module-scope" onBack={onBack} username={displayName || username}>
            <div className="thickness-module-content">
                <ThicknessChangeApp />
            </div>
        </ModuleShell>
    );
}

export default ThicknessChangeModule;
