import ModuleShell from "../../components/ModuleShell";
import AttendanceSyncApp from "./AttendanceSyncApp";
import "./attendanceSync.css";

function AttendanceSyncModule({ onBack, username, displayName }) {
    return (
        <ModuleShell
            moduleScopeClass="attendance-sync-module-scope"
            onBack={onBack}
            username={displayName || username}
        >
            <AttendanceSyncApp />
        </ModuleShell>
    );
}

export default AttendanceSyncModule;
