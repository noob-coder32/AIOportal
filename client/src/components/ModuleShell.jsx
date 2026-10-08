import React from "react";

const ModuleShell = ({ moduleScopeClass, onBack, username, children }) => {
    return (
        <div className={moduleScopeClass}>
            <div className="module-shell-header">
                <button className="module-shell-back-btn" onClick={onBack}>
                    Back
                </button>

                <div className="module-shell-user">
                    Logged in as : <strong>{username}</strong>
                </div>
            </div>

            {children}
        </div>
    );
};

export default ModuleShell;
