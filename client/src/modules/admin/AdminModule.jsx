import ModuleShell from "../../components/ModuleShell";
import UserManagement from "./UserManagement";
import "./admin.css";

function AdminModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="admin-module" onBack={onBack} username={displayName || username}>
            <div className="admin-content">
                <UserManagement />
            </div>
        </ModuleShell>
    );
}

export default AdminModule;
