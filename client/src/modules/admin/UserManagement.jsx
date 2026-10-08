import { useEffect, useMemo, useState } from "react";
import { showToast } from "../../utils/toast";
import api from "../../api";

const emptyUser = {
    username: "",
    fullName: "",
    password: "",
    roles: [],
};

function normalizeRole(role) {
    if (typeof role === "string") {
        return {
            name: role,
            label: role,
            type: role === "admin" ? "system" : "custom",
        };
    }

    return {
        name: role.name,
        label: role.label || role.name,
        type: role.type || (role.name === "admin" ? "system" : "custom"),
        moduleId: role.moduleId || null,
    };
}

function roleTypeLabel(type) {
    if (type === "system") return "System";
    if (type === "module") return "Module Access";
    return "Custom";
}

function RolePicker({ roles, selectedRoles, onToggle, search, onSearch }) {
    const groupedRoles = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filteredRoles = roles.filter((role) => {
            if (!query) return true;
            return (
                role.name.toLowerCase().includes(query) ||
                role.label.toLowerCase().includes(query)
            );
        });

        return filteredRoles.reduce((groups, role) => {
            const key = role.type || "custom";
            groups[key] = groups[key] || [];
            groups[key].push(role);
            return groups;
        }, {});
    }, [roles, search]);

        const groupOrder = ["system", "module", "custom"];

    return (
        <div className="role-picker">
            <input
                className="role-search"
                type="search"
                placeholder="Search roles"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
            />

            <div className="role-groups">
                {groupOrder.map((type) => {
                    const group = groupedRoles[type] || [];
                    if (!group.length) return null;

                    return (
                        <div className="role-group" key={type}>
                            <div className="role-group-title">{roleTypeLabel(type)}</div>
                            {group.map((role) => (
                                <label className="role-option" key={role.name}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRoles.includes(role.name)}
                                        onChange={() => onToggle(role.name)}
                                    />
                                    <span>
                                        <strong>{role.label}</strong>
                                        <small>{role.name}</small>
                                    </span>
                                </label>
                            ))}
                        </div>
                    );
                })}

                {!Object.values(groupedRoles).some((group) => group.length) && (
                    <div className="role-empty">No roles match your search.</div>
                )}
            </div>
        </div>
    );
}

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState(emptyUser);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [allRoles, setAllRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingUserId, setSavingUserId] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [draftRoles, setDraftRoles] = useState([]);
    const [createRoleSearch, setCreateRoleSearch] = useState("");
    const [editRoleSearch, setEditRoleSearch] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [expandedRoleRows, setExpandedRoleRows] = useState({});
    const [editingNameUserId, setEditingNameUserId] = useState(null);
    const [draftFullName, setDraftFullName] = useState("");
    const [savingNameUserId, setSavingNameUserId] = useState(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [resettingPasswordUserId, setResettingPasswordUserId] = useState(null);

    const roleLabelMap = useMemo(() => {
        return allRoles.reduce((map, role) => {
            map[role.name] = role.label;
            return map;
        }, {});
    }, [allRoles]);

    const filteredUsers = useMemo(() => {
        const query = userSearch.trim().toLowerCase();

        if (!query) return users;

        return users.filter((user) => {
            const roleText = (user.roles || [])
                .map((role) => `${role} ${roleLabelMap[role] || ""}`)
                .join(" ")
                .toLowerCase();

            return (
                (user.fullName || "").toLowerCase().includes(query) ||
                user.username.toLowerCase().includes(query) ||
                roleText.includes(query)
            );
        });
    }, [users, userSearch, roleLabelMap]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchRoles(), fetchUsers()]);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to load admin data", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        const res = await api.get("/admin/users");
        setUsers(res.data);
    };

    const fetchRoles = async () => {
        const res = await api.get("/admin/roles");
        setAllRoles(res.data.map(normalizeRole));
    };

    const toggleNewUserRole = (roleName) => {
        setNewUser((current) => ({
            ...current,
            roles: current.roles.includes(roleName)
                ? current.roles.filter((role) => role !== roleName)
                : [...current.roles, roleName],
        }));
    };

    const toggleDraftRole = (roleName) => {
        setDraftRoles((current) =>
            current.includes(roleName)
                ? current.filter((role) => role !== roleName)
                : [...current, roleName]
        );
    };

    const handleCreateUser = async () => {
        if (creatingUser) return;

        if (!newUser.fullName.trim() || !newUser.username.trim() || !newUser.password) {
            showToast("Full name, username and password are required", "error");
            return;
        }

        if (newUser.password !== confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }

        setCreatingUser(true);
        try {
            const res = await api.post("/admin/users", {
                ...newUser,
                fullName: newUser.fullName.trim(),
                username: newUser.username.trim(),
            });

            showToast(res.data.message, "success");
            setNewUser(emptyUser);
            setConfirmPassword("");
            setCreateRoleSearch("");
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || "User creation failed", "error");
        } finally {
            setCreatingUser(false);
        }
    };

    const openRoleEditor = (user) => {
        setSelectedUser(user);
        setDraftRoles(user.roles || []);
        setEditRoleSearch("");
    };

    const closeRoleEditor = () => {
        setSelectedUser(null);
        setDraftRoles([]);
        setSavingUserId(null);
    };

    const saveRoles = async () => {
        if (!selectedUser) return;

        setSavingUserId(selectedUser.id);
        try {
            const res = await api.put(`/admin/users/${selectedUser.id}/roles`, {
                roles: draftRoles,
            });

            showToast(res.data.message || "Roles updated", "success");
            await fetchUsers();
            closeRoleEditor();
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update roles", "error");
        } finally {
            setSavingUserId(null);
        }
    };

    const startNameEdit = (user) => {
        setEditingNameUserId(user.id);
        setDraftFullName(user.fullName || "");
    };

    const cancelNameEdit = () => {
        setEditingNameUserId(null);
        setDraftFullName("");
        setSavingNameUserId(null);
    };

    const saveFullName = async (userId) => {
        const cleanFullName = draftFullName.trim();

        if (!cleanFullName) {
            showToast("Full name is required", "error");
            return;
        }

        setSavingNameUserId(userId);
        try {
            const res = await api.put(`/admin/users/${userId}/profile`, {
                fullName: cleanFullName,
            });

            showToast(res.data.message || "Full name updated", "success");
            await fetchUsers();
            cancelNameEdit();
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update full name", "error");
        } finally {
            setSavingNameUserId(null);
        }
    };

    const toggleStatus = async (userId, isActive) => {
        const confirmMsg = isActive
            ? "Are you sure you want to disable this user?"
            : "Are you sure you want to enable this user?";

        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await api.put(`/admin/users/${userId}/status`, {
                is_active: !isActive,
            });

            showToast(res.data.message || "User status updated", "success");
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update status", "error");
        }
    };

    const resetPassword = async (user) => {
        const newPassword = window.prompt(`Enter a new password for ${user.username}`);

        if (newPassword === null) return;

        const cleanPassword = newPassword.trim();

        if (cleanPassword.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        const confirmed = window.confirm(`Reset password for ${user.username}?`);
        if (!confirmed) return;

        setResettingPasswordUserId(user.id);
        try {
            const res = await api.put(`/admin/users/${user.id}/reset-password`, {
                password: cleanPassword,
            });

            showToast(res.data.message || "Password reset successfully", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to reset password", "error");
        } finally {
            setResettingPasswordUserId(null);
        }
    };

    const toggleRoleSummary = (userId) => {
        setExpandedRoleRows((current) => ({
            ...current,
            [userId]: !current[userId],
        }));
    };

    const renderRoleSummary = (userId, roles) => {
        if (!roles.length) {
            return <span className="muted-text">No roles assigned</span>;
        }

        const isExpanded = Boolean(expandedRoleRows[userId]);
        const visibleRoles = isExpanded ? roles : roles.slice(0, 3);
        const hiddenCount = roles.length - visibleRoles.length;

        return (
            <div className="role-chip-row">
                {visibleRoles.map((role) => (
                    <span className="role-chip" key={role}>
                        {roleLabelMap[role] || role}
                    </span>
                ))}
                {hiddenCount > 0 && (
                    <button
                        className="role-chip more role-chip-button"
                        type="button"
                        onClick={() => toggleRoleSummary(userId)}
                    >
                        +{hiddenCount}
                    </button>
                )}
                {isExpanded && roles.length > 3 && (
                    <button
                        className="role-chip more role-chip-button"
                        type="button"
                        onClick={() => toggleRoleSummary(userId)}
                    >
                        Show less
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="user-mgmt">
            <div className="admin-section-header">
                <div>
                    <h2>User Management</h2>
                    <p>Manage accounts and module access without crowding the user list.</p>
                </div>
            </div>

            <section className="create-user-panel">
                <div className="panel-heading">
                    <h3>Create User</h3>
                    <span>{newUser.roles.length} role(s) selected</span>
                </div>

                <div className="create-user-grid">
                    <div className="credential-fields">
                        <input
                            type="text"
                            placeholder="Full name"
                            value={newUser.fullName}
                            onChange={(e) =>
                                setNewUser({ ...newUser, fullName: e.target.value })
                            }
                        />
                        <input
                            type="text"
                            placeholder="Username"
                            value={newUser.username}
                            onChange={(e) =>
                                setNewUser({ ...newUser, username: e.target.value })
                            }
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={newUser.password}
                            onChange={(e) =>
                                setNewUser({ ...newUser, password: e.target.value })
                            }
                        />
                        <input
                            type="password"
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                            className="primary-action"
                            onClick={handleCreateUser}
                            disabled={creatingUser}
                        >
                            {creatingUser ? "Creating..." : "Create User"}
                        </button>
                    </div>

                    <RolePicker
                        roles={allRoles}
                        selectedRoles={newUser.roles}
                        onToggle={toggleNewUserRole}
                        search={createRoleSearch}
                        onSearch={setCreateRoleSearch}
                    />
                </div>
            </section>

            <section className="users-panel">
                <div className="panel-heading">
                    <div>
                        <h3>Users</h3>
                        <span>
                            {filteredUsers.length} of {users.length} account(s)
                        </span>
                    </div>
                    <input
                        className="user-search"
                        type="search"
                        placeholder="Search users or roles"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                    />
                </div>

                <div className="users-table-wrap">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Full Name</th>
                                <th>Roles</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="table-empty">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td className="username-cell">{user.username}</td>
                                        <td>
                                            {editingNameUserId === user.id ? (
                                                <div className="name-edit-row">
                                                    <input
                                                        type="text"
                                                        value={draftFullName}
                                                        onChange={(e) =>
                                                            setDraftFullName(e.target.value)
                                                        }
                                                        placeholder="Full name"
                                                    />
                                                    <button
                                                        className="primary-action"
                                                        onClick={() => saveFullName(user.id)}
                                                        disabled={savingNameUserId === user.id}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        className="ghost-action"
                                                        onClick={cancelNameEdit}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                user.fullName || (
                                                    <span className="muted-text">Not set</span>
                                                )
                                            )}
                                        </td>
                                        <td>{renderRoleSummary(user.id, user.roles || [])}</td>
                                        <td>
                                            <span
                                                className={
                                                    user.is_active
                                                        ? "status-pill active"
                                                        : "status-pill inactive"
                                                }
                                            >
                                                {user.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <button onClick={() => openRoleEditor(user)}>
                                                    Edit Roles
                                                </button>
                                                <button onClick={() => startNameEdit(user)}>
                                                    Edit Name
                                                </button>
                                                <button
                                                    className="warning-action"
                                                    onClick={() => resetPassword(user)}
                                                    disabled={resettingPasswordUserId === user.id}
                                                >
                                                    {resettingPasswordUserId === user.id
                                                        ? "Resetting..."
                                                        : "Reset Password"}
                                                </button>
                                                <button
                                                    className={
                                                        user.is_active
                                                            ? "danger-action"
                                                            : "success-action"
                                                    }
                                                    onClick={() =>
                                                        toggleStatus(user.id, user.is_active)
                                                    }
                                                >
                                                    {user.is_active ? "Disable" : "Enable"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="table-empty">
                                        {userSearch.trim()
                                            ? "No users match your search."
                                            : "No users found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedUser && (
                <div className="role-editor-backdrop" role="presentation">
                    <div className="role-editor" role="dialog" aria-modal="true">
                        <div className="role-editor-header">
                            <div>
                                <h3>Edit Roles</h3>
                                <p>{selectedUser.username}</p>
                            </div>
                            <button className="ghost-action" onClick={closeRoleEditor}>
                                Close
                            </button>
                        </div>

                        <RolePicker
                            roles={allRoles}
                            selectedRoles={draftRoles}
                            onToggle={toggleDraftRole}
                            search={editRoleSearch}
                            onSearch={setEditRoleSearch}
                        />

                        <div className="role-editor-footer">
                            <span>{draftRoles.length} role(s) selected</span>
                            <div>
                                <button className="ghost-action" onClick={closeRoleEditor}>
                                    Cancel
                                </button>
                                <button
                                    className="primary-action"
                                    onClick={saveRoles}
                                    disabled={savingUserId === selectedUser.id}
                                >
                                    {savingUserId === selectedUser.id ? "Saving..." : "Save Roles"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;
