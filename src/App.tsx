import { useState, useEffect } from "react";
import Login from "./components/Login";
import FormSelector from "./components/FormSelector";
import WalkInForm from "./components/WalkInForm";
import OnboardingForm from "./components/OnboardingForm";
import OperatorOnboardingForm from "./components/OperatorOnboardingForm";
import AdjustmentForm from "./components/AdjustmentForm";
import AllocationForm from "./components/AllocationForm";
import ExpensesForm from "./components/ExpensesForm";
import VehicleOnboardingForm from "./components/VehicleOnboardingForm";
import WorkshopsForm from "./components/WorkshopsForm";
import HubsParkingForm from "./components/HubsParkingForm";
import RentForm from "./components/RentForm";
import AccidentsForm from "./components/AccidentsForm";
import InspectionForm from "./components/InspectionForm";
import UsersForm from "./components/UsersForm";
import VehicleModelsForm from "./components/VehicleModelsForm";
import CitiesForm from "./components/CitiesForm";
import RolesPermissionsForm from "./components/RolesPermissionsForm";
import TicketsForm from "./components/TicketsForm";
import EmployeesForm from "./components/EmployeesForm";
import MaintenanceForm from "./components/MaintenanceForm";
import ChallansForm from "./components/ChallansForm";
import ApprovalsDesk from "./components/ApprovalsDashboard";
import { User, CITIES } from "./types";

const LOCAL_STORAGE_TOKEN_KEY = "lr_token";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<"login" | "selector" | "walkin" | "onboarding" | "operator_onboarding" | "adjustment" | "allocation" | "expenses" | "vehicle_onboarding" | "workshops" | "hubs_parking" | "rents" | "accident" | "inspection" | "users" | "vehicle_models" | "cities" | "roles" | "tickets" | "employees" | "maintenance" | "challans" | "approvals">("login");
  const [isInitializing, setIsInitializing] = useState(true);

  // Load user session from API using token on startup
  useEffect(() => {
    // Dynamically fetch operational cities and mutate CITIES in-place
    fetch("/api/cities")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to load cities");
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          CITIES.splice(0, CITIES.length, ...data.map(c => ({ value: c.value, text: c.text })));
        }
      })
      .catch(err => {
        console.error("Cities loading failed, falling back to default.", err);
      });

    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (token) {
      fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Invalid token");
      })
      .then(data => {
        setUser(data);
        setScreen("selector");
      })
      .catch(() => {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
      })
      .finally(() => {
        setIsInitializing(false);
      });
    } else {
      setIsInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (userSession: User) => {
    setUser(userSession);
    setScreen("selector");
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    setUser(null);
    setScreen("login");
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {screen === "login" && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      {screen === "selector" && user && (
        <FormSelector 
          user={user} 
          onSelectForm={(formType) => setScreen(formType as any)} 
          onLogout={handleLogout}
        />
      )}
      {screen === "walkin" && user && (
        <WalkInForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "onboarding" && user && (
        <OnboardingForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "operator_onboarding" && user && (
        <OperatorOnboardingForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "adjustment" && user && (
        <AdjustmentForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "allocation" && user && (
        <AllocationForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "expenses" && user && (
        <ExpensesForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "vehicle_onboarding" && user && (
        <VehicleOnboardingForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "workshops" && user && (
        <WorkshopsForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "hubs_parking" && user && (
        <HubsParkingForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "rents" && user && (
        <RentForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "accident" && user && (
        <AccidentsForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "inspection" && user && (
        <InspectionForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "users" && user && (
        <UsersForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "vehicle_models" && user && (
        <VehicleModelsForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "cities" && user && (
        <CitiesForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "roles" && user && (
        <RolesPermissionsForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "tickets" && user && (
        <TicketsForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "employees" && user && (
        <EmployeesForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "maintenance" && user && (
        <MaintenanceForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "challans" && user && (
        <ChallansForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}

      {screen === "approvals" && user && (
        <ApprovalsDesk 
          user={user as any} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
}