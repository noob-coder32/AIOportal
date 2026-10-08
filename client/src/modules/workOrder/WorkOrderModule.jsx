import ModuleShell from "../../components/ModuleShell";
import WorkOrderApp from "./WorkOrderApp";
import "./workOrder.css";

function WorkOrderModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="work-order-page" onBack={onBack} username={displayName || username}>
            <div className="work-order-module-content">
                <WorkOrderApp />
            </div>
        </ModuleShell>
    );
}

export default WorkOrderModule;
