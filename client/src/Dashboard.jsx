import "./dashboard.css";
import { modules } from "./modules/modules";

function Dashboard({ username, displayName, userRoles, onLogout, onSelectModule }) {
    return (
        <div className="dashboard">
            {/* Top Section */}
            <div className="dashboard-top">
                <div>
                    <h2 className="dashboard-title">Welcome, {displayName || username}</h2>
                    <p className="dashboard-subtitle">
                        Select a module to continue
                    </p>
                </div>

                <button className="logout-button" onClick={onLogout}>
                    Logout
                </button>
            </div>

            {/* Body */}
            
            <div className="dashboard-body">
                <div className="module-grid">
                    {modules
                        .filter((module) =>
                            userRoles.includes("admin") ||
                            module.allowedRoles.some((role) => userRoles.includes(role))
                        )
                        .map((module, index) => (
                            <div
                                key={module.id}
                                className="module-tile"
                                style={{ "--tile-index": index }}
                                onClick={() => onSelectModule(module)}
                            >
                                <h3>{module.name}</h3>
                                <p>{module.description}</p>
                                <span className="tile-arrow">→</span>
                            </div>
                        ))}

                </div>
            </div>
        </div >
    );
}

export default Dashboard;
