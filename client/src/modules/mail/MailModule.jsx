import ModuleShell from "../../components/ModuleShell";
import MailApp from "./MailApp";
import "./mail.css";

function MailModule({ onBack, username, displayName }) {
    return (
        <ModuleShell moduleScopeClass="mail-page" onBack={onBack} username={displayName || username}>
            <div className="mail-module-content">
                <MailApp />
            </div>
        </ModuleShell>
    );
}

export default MailModule;
