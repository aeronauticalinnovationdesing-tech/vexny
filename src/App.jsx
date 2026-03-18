import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ProfileProvider, useProfile } from './lib/ProfileContext';

import AppLayout from './components/layout/AppLayout';
import ProfileSelect from './pages/ProfileSelect';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Notes from './pages/Notes';
import Accounting from './pages/Accounting';
import CalendarPage from './pages/Calendar';
import Secretary from './pages/Secretary';
import Reports from './pages/Reports';
import Courses from './pages/Courses';
import Subscription from './pages/Subscription';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import PilotManagement from './pages/drone_pilot/PilotManagement';
import DroneRegistry from './pages/drone_pilot/DroneRegistry';
import SMSReporting from './pages/drone_pilot/SMSReporting';
import MaintenanceManagement from './pages/drone_pilot/MaintenanceManagement';
import AirspaceMap from './pages/drone_pilot/AirspaceMap';
import CompanyManagement from './pages/drone_pilot/CompanyManagement';
import FlightLogBook from './pages/drone_pilot/FlightLogBook';
import CompanySubscriptionPilot from './pages/drone_pilot/CompanySubscription';
import DronePilotSubscription from './pages/drone_pilot/DronePilotSubscription';
import PilotManagementEnterprise from './pages/drone_company/PilotManagement';
import DroneRegistryEnterprise from './pages/drone_company/DroneRegistry';
import FlightLogBookEnterprise from './pages/drone_company/FlightLogBook';
import SMSReportingEnterprise from './pages/drone_company/SMSReporting';
import MaintenanceManagementEnterprise from './pages/drone_company/MaintenanceManagement';
import AirspaceMapEnterprise from './pages/drone_company/AirspaceMap';
import CompanySubscriptionEnterprise from './pages/drone_company/CompanySubscription';

import TraderJournal from './pages/trader/TraderJournal';
import AdvancedTools from './pages/trader/AdvancedTools';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const profileContext = useProfile();
  const { activeProfileId = null, loading: profileLoading = true } = profileContext || {};

  if (isLoadingPublicSettings || isLoadingAuth || profileLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground font-medium">Cargando VEXNY...</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Show profile selection if no profile chosen
  if (!activeProfileId) {
    return <ProfileSelect />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Projects" element={<Projects />} />
        <Route path="/Tasks" element={<Tasks />} />
        <Route path="/Notes" element={<Notes />} />
        <Route path="/Accounting" element={<Accounting />} />
        <Route path="/Calendar" element={<CalendarPage />} />
        <Route path="/Secretary" element={<Secretary />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/Courses" element={<Courses />} />
        <Route path="/Subscription" element={<Subscription />} />
        <Route path="/Admin" element={<Admin />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/PilotManagement" element={<PilotManagement />} />
        <Route path="/DroneRegistry" element={<DroneRegistry />} />
        <Route path="/SMSReporting" element={<SMSReporting />} />
        <Route path="/MaintenanceManagement" element={<MaintenanceManagement />} />
        <Route path="/AirspaceMap" element={<AirspaceMap />} />
        <Route path="/CompanyManagement" element={<CompanyManagement />} />
        <Route path="/FlightLogBook" element={<FlightLogBook />} />
        <Route path="/CompanySubscription" element={<CompanySubscriptionPilot />} />
        <Route path="/DronePilotSubscription" element={<DronePilotSubscription />} />
        <Route path="/CompanySubscriptionEnterprise" element={<CompanySubscriptionEnterprise />} />
        <Route path="/PilotManagementEnterprise" element={<PilotManagementEnterprise />} />
        <Route path="/DroneRegistryEnterprise" element={<DroneRegistryEnterprise />} />
        <Route path="/FlightLogBookEnterprise" element={<FlightLogBookEnterprise />} />
        <Route path="/SMSReportingEnterprise" element={<SMSReportingEnterprise />} />
        <Route path="/MaintenanceManagementEnterprise" element={<MaintenanceManagementEnterprise />} />
        <Route path="/AirspaceMapEnterprise" element={<AirspaceMapEnterprise />} />

        <Route path="/TraderJournal" element={<TraderJournal />} />
        <Route path="/AdvancedTools" element={<AdvancedTools />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ProfileProvider>
    </AuthProvider>
  )
}

export default App