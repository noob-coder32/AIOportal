import React from "react";
import ModuleShell from "../../components/ModuleShell";
import "./coilLineEntry.css";
import CoilLineEntryApp from "./CoilLineEntryApp";

const CoilLineEntryModule = ({ onBack, username, displayName }) => {
    return (
        <ModuleShell
            moduleScopeClass="coilLineEntry-module-scope"
            onBack={onBack}
            username={displayName || username}
        >
            <CoilLineEntryApp />
        </ModuleShell>
    );
};

export default CoilLineEntryModule;
