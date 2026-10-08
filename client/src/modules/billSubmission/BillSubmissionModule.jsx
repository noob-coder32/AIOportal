import ModuleShell from "../../components/ModuleShell";
import BillSubmissionApp from "./BillSubmissionApp";
import "./billSubmission.css";

function BillSubmissionModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="bill-submission-page" onBack={onBack} username={displayName || username}>
            <div className="bill-submission-content">
                <BillSubmissionApp />
            </div>
        </ModuleShell>
    );
}

export default BillSubmissionModule;
