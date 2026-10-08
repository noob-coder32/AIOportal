import React from "react";
import ModuleShell from "../../components/ModuleShell";
import "./defaultCredLimit.css";
import DefaultCredLimitApp from "./DefaultCredLimitApp";

const DefaultCredLimitModule = ({ onBack, username, displayName }) => {
    return (
        <ModuleShell
            moduleScopeClass="defaultCredLimit-module-scope"
            onBack={onBack}
            username={displayName || username}
        >
            <DefaultCredLimitApp />
        </ModuleShell>
    );
};

export default DefaultCredLimitModule;
