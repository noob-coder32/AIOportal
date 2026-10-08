import React from "react";
import DebtorGstinHome from "./DebtorGstinHome";
import ModuleShell from "../../components/ModuleShell";
import "./debtorGstin.css";

const DebtorGstinModule = ({ onBack, username, displayName }) => {
    return (
        <ModuleShell moduleScopeClass="debtorGstin-module-scope" onBack={onBack} username={displayName || username}>
            <DebtorGstinHome username={username} />
        </ModuleShell>
    );
};

export default DebtorGstinModule;
                                     
