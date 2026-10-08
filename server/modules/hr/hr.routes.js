const express = require("express");
const router = express.Router();

const hrDb = require("../../db/hr.db");

/* =========================
   EMPLOYEES
========================= */

router.get("/employees", async (req, res) => {
    try {
        res.json(await hrDb.getActiveEmployees());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch employees" });
    }
});

router.get("/employeesAll", async (req, res) => {
    try {
        res.json(await hrDb.getAllEmployees());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch employees" });
    }
});

router.post("/employees", async (req, res) => {
    const { employee_code, employee_name } = req.body;

    // if (!employee_code || !employee_name) {
    if (!employee_code) {
    return res.status(400).json({
        message: "Employee code is required",
    });
}

    try {
    await hrDb.addEmployee(employee_code, employee_name);
    res.json({ message: "Employee added successfully" });
} catch (err) {
    console.error(err);

    if (err.number === 2627 || err.number === 2601) {
        return res.status(400).json({
            message: "Employee code already exists",
        });
    }
    res.status(500).json({ message: "Failed to add employee" });
}
});

router.put("/employees/:id", async (req, res) => {
    const { employee_code, employee_name } = req.body;

    // if (!employee_code || !employee_name) {
    if (!employee_code) {
        return res.status(400).json({
            message: "Employee code is required",
        });
    }

    try {
        await hrDb.updateEmployee(
            Number(req.params.id),
            employee_code,
            employee_name
        );
        res.json({ message: "Employee updated successfully" });
    } catch (err) {
        console.error(err);

        if (err.number === 2627 || err.number === 2601) {
            return res.status(400).json({
                message: "Employee code already exists",
            });
        }

        res.status(500).json({ message: "Failed to update employee" });
    }
});

router.patch("/employees/:id/deactivate", async (req, res) => {
    try {
        await hrDb.deactivateEmployee(Number(req.params.id));
        res.json({ message: "Employee deactivated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to deactivate employee" });
    }
});

router.patch("/employees/:id/activate", async (req, res) => {
    try {
        await hrDb.activateEmployee(Number(req.params.id));
        res.json({ message: "Employee activated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to activate employee" });
    }
});

/* =========================
   HODS
========================= */

router.get("/hods", async (req, res) => {
    try {
        res.json(await hrDb.getActiveHods());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch HODs" });
    }
});

router.get("/hodsAll", async (req, res) => {
    try {
        res.json(await hrDb.getAllHods());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch HODs" });
    }
});

router.post("/hods", async (req, res) => {
    if (!req.body.hod_name) {
        return res.status(400).json({ message: "HOD name is required" });
    }

    try {
        await hrDb.addHod(req.body.hod_name);
        res.json({ message: "HOD added successfully" });
    } catch (err) {
        console.error(err);

        // 🔥 Handle UNIQUE constraint violation
        if (err.number === 2627 || err.number === 2601) {
            return res.status(400).json({
                message: "HOD name already exists",
            });
        }

        res.status(500).json({ message: "Failed to add HOD" });
    }
});

router.put("/hods/:id", async (req, res) => {
    if (!req.body.hod_name) {
        return res.status(400).json({ message: "HOD name is required" });
    }

    try {
        await hrDb.updateHod(
            Number(req.params.id),
            req.body.hod_name
        );
        res.json({ message: "HOD updated successfully" });
    } catch (err) {
        console.error(err);

        // 🔥 Handle UNIQUE constraint violation
        if (err.number === 2627 || err.number === 2601) {
            return res.status(400).json({
                message: "HOD name already exists",
            });
        }

        res.status(500).json({ message: "Failed to update HOD" });
    }
});

router.patch("/hods/:id/deactivate", async (req, res) => {
    try {
        await hrDb.setHodStatus(Number(req.params.id), false);
        res.json({ message: "HOD deactivated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to deactivate HOD" });
    }
});

router.patch("/hods/:id/activate", async (req, res) => {
    try {
        await hrDb.setHodStatus(Number(req.params.id), true);
        res.json({ message: "HOD activated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to activate HOD" });
    }
});

/* =========================
   EMPLOYEE–HOD ASSIGNMENTS
========================= */

router.post("/employee-hod-assign", async (req, res) => {
    const { employeeId, hodId } = req.body;

    if (!employeeId || !hodId) {
        return res.status(400).json({
            message: "Employee and HOD are required",
        });
    }

    try {
        // 🔥 Get logged in user from JWT
        const assignedBy = req.user.username;

        const existing = await hrDb.getAssignmentByEmployee(employeeId);

        if (existing) {
            await hrDb.updateAssignment(employeeId, hodId, assignedBy);
            return res.json({ message: "Employee HOD updated successfully" });
        }

        await hrDb.createAssignment(employeeId, hodId, assignedBy);

        res.json({ message: "Employee assigned to HOD successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to assign employee to HOD" });
    }
});

router.get("/assignments", async (req, res) => {
    try {
        res.json(await hrDb.getAllAssignments());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch assignments" });
    }
});

module.exports = router;
