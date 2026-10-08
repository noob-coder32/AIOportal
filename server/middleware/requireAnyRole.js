function requireAnyRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !Array.isArray(req.user.roles)) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const hasRole = req.user.roles.some(role =>
            allowedRoles.includes(role)
        );

        if (!hasRole) {
            return res.status(403).json({
                message: "Access denied: insufficient privileges",
            });
        }

        next();
    };
}

module.exports = requireAnyRole;
