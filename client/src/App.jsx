import { useEffect, useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import axios from "./api";
import { modules } from "./modules/modules";

// import { useNavigate } from "react-router-dom";

// 🔹 import modules explicitly
import AdminModule from "./modules/admin/AdminModule";
import HRModule from "./modules/hr/HRModule";
import QAModule from "./modules/qa/QAModule";
import PayslipModule from "./modules/payslip/PayslipModule";
import QARequestModule from "./modules/qaRequest/QARequestModule";
import DestinationModule from "./modules/destination/DestinationModule";
import InvoiceModule from "./modules/invoice/InvoiceModule";
import WorkOrderModule from "./modules/workOrder/WorkOrderModule";
import ThicknessChangeModule from "./modules/thicknessChange/ThicknessChangeModule";
import DivisionRequestModule from "./modules/divisionRequest/DivisionRequestModule";
import InvoiceDateChangeModule from "./modules/invoiceDateChange/InvoiceDateChangeModule";
import DebtorUpdModule from "./modules/debtor/DebtorUpdModule";
import DebtorClsUpdModule from "./modules/debtorClsUpd/DebtClsUpdModule";
import MailModule from "./modules/mail/MailModule";
import Debtor1Module from "./modules/debtor1/Debtor1Module";
import FreezeModule from "./modules/freeze/FreezeModule";
import BillSubmissionModule from "./modules/billSubmission/BillSubmissionModule";
import MedicalAllowanceModule from "./modules/medicalAllowance/MedicalAllowanceModule";
import EmployeeBonusModule from "./modules/employeeBonus/EmployeeBonusModule";
import Thickness2Module from "./modules/thickness2/Thickness2Module";
import DebtorGstinModule from "./modules/debtorGstin/DebtorGstinModule";
import DefaultCredLimitModule from "./modules/defaultCredLimit/DefaultCredLimitModule";
import CoilLineEntryModule from "./modules/coilLineEntry/CoilLineEntryModule";
import CoilDetailsModule from "./modules/coilDetails/CoilDetailsModule";
import AttendanceSyncModule from "./modules/attendanceSync/AttendanceSyncModule";
import ComplaintsModule from "./modules/complaints/ComplaintsModule";


import "./App.css";

function App() {
  // const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("");
  const [loggedInFullName, setLoggedInFullName] = useState("");
  const [userRoles, setUserRoles] = useState([]);

  // 🔹 controls which module screen is visible
  const [activeModule, setActiveModule] = useState(null);

  const [loginError, setLoginError] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  // ================= SINGLE STARTUP AUTH BOOTSTRAP =================
  useEffect(() => {
    const token = sessionStorage.getItem("token");

    // ❌ No token → force login state
    if (!token) {
      setIsLoggedIn(false);
      setActiveModule(null);
      // navigate("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));

      setLoggedInUser(payload.username);
      setLoggedInFullName(payload.fullName || payload.username);
      setUserRoles(payload.roles || []);
      setIsLoggedIn(true);

      // 🔹 restore active module
      const savedModuleId = sessionStorage.getItem("activeModuleId");
      if (savedModuleId) {
        const module = modules.find((m) => m.id === savedModuleId);
        if (module) {
          setActiveModule(module);
        } else {
          sessionStorage.removeItem("activeModuleId");
        }
      }
    } catch {
      // ❌ invalid / corrupted token
      sessionStorage.removeItem("token");
      setIsLoggedIn(false);
      // navigate("/login");
    }
  }, []);

  // ================= CLEAR LOGIN ERROR =================
  useEffect(() => {
    if (!loginError) return;

    const timer = setTimeout(() => {
      setLoginError("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [loginError]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeModule]);

  // ================= LOGIN =================
  const handleLogin = async () => {
    try {
      const res = await axios.post("/login", {
        username: formData.username,
        password: formData.password,
      });

      const token = res.data.token;
      sessionStorage.setItem("token", token);

      const payload = JSON.parse(atob(token.split(".")[1]));
      setLoggedInUser(payload.username);
      setLoggedInFullName(payload.fullName || payload.username);
      setUserRoles(payload.roles || []);
      setIsLoggedIn(true);
      setLoginError("");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setLoginError(message);
    }
  };

  // ================= LOGOUT =================
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("activeModuleId");

    setIsLoggedIn(false);
    setLoggedInUser("");
    setLoggedInFullName("");
    setActiveModule(null);
    setFormData({
      username: "",
      password: ""
    });

    // navigate("/login");
  };

  // ================= UI FLOW =================

  // 🟢 SCREEN 1: LOGIN
  if (!isLoggedIn) {
    return (
      <Login
        formData={formData}
        setFormData={setFormData}
        onLogin={handleLogin}
        error={loginError}
      />
    );
  }

  // 🟢 SCREEN 2: DASHBOARD
  if (!activeModule) {
    return (
      <Dashboard
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        userRoles={userRoles}
        onLogout={handleLogout}
        onSelectModule={(module) => {
          setActiveModule(module);
          sessionStorage.setItem("activeModuleId", module.id);
        }}
      />
    );
  }

  // 🟢 SCREEN 3: MODULES
  if (activeModule.id === "admin") {
    return (
      <AdminModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "hr") {
    return (
      <HRModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "qa") {
    return (
      <QAModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "pg") {
    return (
      <PayslipModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "qa-request") {
    return (
      <QARequestModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "destination") {
    return (
      <DestinationModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "invoice") {
    return (
      <InvoiceModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "workOrder") {
    return (
      <WorkOrderModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "thicknessChange") {
    return (
      <ThicknessChangeModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "payrollUpd") {
    return (
      <DivisionRequestModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "idc") {
    return (
      <InvoiceDateChangeModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "dcUpd") {
    return (
      <DebtorUpdModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "DCU") {
    return (
      <DebtorClsUpdModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "mail") {
    return (
      <MailModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "dbt1") {
    return (
      <Debtor1Module
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => setActiveModule(null)}
      />
    );
  }

  if (activeModule.id === "freeze") {
    return (
      <FreezeModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          localStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "defaultCredLimit") {
    return (
      <DefaultCredLimitModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "billSubmission") {
    return (
      <BillSubmissionModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "medical-allowance") {
    return (
      <MedicalAllowanceModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "employeeBonus") {
    return (
      <EmployeeBonusModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "thickness") {
    return (
      <Thickness2Module
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "debtorGstin") {
    return (
      <DebtorGstinModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "coilLineEntry") {
    return (
      <CoilLineEntryModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "coilDetails") {
    return (
      <CoilDetailsModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "attendanceSync") {
    return (
      <AttendanceSyncModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  if (activeModule.id === "complaints") {
    return (
      <ComplaintsModule
        username={loggedInUser}
        displayName={loggedInFullName || loggedInUser}
        onBack={() => {
          setActiveModule(null);
          sessionStorage.removeItem("activeModuleId");
        }}
      />
    );
  }

  return null;
}

export default App;
