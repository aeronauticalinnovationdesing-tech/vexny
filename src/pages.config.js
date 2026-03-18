/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Accounting from './pages/Accounting';
import Admin from './pages/Admin';
import Calendar from './pages/Calendar';
import Courses from './pages/Courses';
import Dashboard from './pages/Dashboard';
import DroneCoDashboard from './pages/DroneCoDashboard';
import Notes from './pages/Notes';
import Profile from './pages/Profile';
import ProfileSelect from './pages/ProfileSelect';
import ProjectDetail from './pages/ProjectDetail';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Secretary from './pages/Secretary';
import Subscription from './pages/Subscription';
import Tasks from './pages/Tasks';
import DronePilotDashboard from './pages/DronePilotDashboard';
import EliteHumanDashboard from './pages/EliteHumanDashboard';
import StartupDashboard from './pages/StartupDashboard';
import TraderDashboard from './pages/TraderDashboard';
import AirspaceMap from './pages/AirspaceMap';
import CompanySubscription from './pages/CompanySubscription';
import DroneRegistry from './pages/DroneRegistry';
import FlightLogBook from './pages/FlightLogBook';
import MaintenanceManagement from './pages/MaintenanceManagement';
import PilotManagement from './pages/PilotManagement';
import SMSReporting from './pages/SMSReporting';
import AirspaceMap from './pages/AirspaceMap';
import CompanyManagement from './pages/CompanyManagement';
import CompanySubscription from './pages/CompanySubscription';
import DroneMissions from './pages/DroneMissions';
import DronePilotFlightLog from './pages/DronePilotFlightLog';
import DronePilotSubscription from './pages/DronePilotSubscription';
import DroneRegistry from './pages/DroneRegistry';
import FlightLogBook from './pages/FlightLogBook';
import MaintenanceManagement from './pages/MaintenanceManagement';
import PilotManagement from './pages/PilotManagement';
import SMSReporting from './pages/SMSReporting';
import EliteHumanGoals from './pages/EliteHumanGoals';
import EliteHumanProjects from './pages/EliteHumanProjects';
import DronePilotReport from './pages/DronePilotReport';
import GenericAccounting from './pages/GenericAccounting';
import GenericNotes from './pages/GenericNotes';
import StartupProjects from './pages/StartupProjects';
import StartupTasks from './pages/StartupTasks';
import AdvancedTools from './pages/AdvancedTools';
import TraderAccounting from './pages/TraderAccounting';
import TraderJournal from './pages/TraderJournal';
import TraderNotes from './pages/TraderNotes';
import TraderTrades from './pages/TraderTrades';
import CompanyManagementEnterprise from './pages/CompanyManagementEnterprise';


export const PAGES = {
    "Accounting": Accounting,
    "Admin": Admin,
    "Calendar": Calendar,
    "Courses": Courses,
    "Dashboard": Dashboard,
    "DroneCoDashboard": DroneCoDashboard,
    "Notes": Notes,
    "Profile": Profile,
    "ProfileSelect": ProfileSelect,
    "ProjectDetail": ProjectDetail,
    "Projects": Projects,
    "Reports": Reports,
    "Secretary": Secretary,
    "Subscription": Subscription,
    "Tasks": Tasks,
    "DronePilotDashboard": DronePilotDashboard,
    "EliteHumanDashboard": EliteHumanDashboard,
    "StartupDashboard": StartupDashboard,
    "TraderDashboard": TraderDashboard,
    "AirspaceMap": AirspaceMap,
    "CompanySubscription": CompanySubscription,
    "DroneRegistry": DroneRegistry,
    "FlightLogBook": FlightLogBook,
    "MaintenanceManagement": MaintenanceManagement,
    "PilotManagement": PilotManagement,
    "SMSReporting": SMSReporting,
    "AirspaceMap": AirspaceMap,
    "CompanyManagement": CompanyManagement,
    "CompanySubscription": CompanySubscription,
    "DroneMissions": DroneMissions,
    "DronePilotFlightLog": DronePilotFlightLog,
    "DronePilotSubscription": DronePilotSubscription,
    "DroneRegistry": DroneRegistry,
    "FlightLogBook": FlightLogBook,
    "MaintenanceManagement": MaintenanceManagement,
    "PilotManagement": PilotManagement,
    "SMSReporting": SMSReporting,
    "EliteHumanGoals": EliteHumanGoals,
    "EliteHumanProjects": EliteHumanProjects,
    "DronePilotReport": DronePilotReport,
    "GenericAccounting": GenericAccounting,
    "GenericNotes": GenericNotes,
    "StartupProjects": StartupProjects,
    "StartupTasks": StartupTasks,
    "AdvancedTools": AdvancedTools,
    "TraderAccounting": TraderAccounting,
    "TraderJournal": TraderJournal,
    "TraderNotes": TraderNotes,
    "TraderTrades": TraderTrades,
    "CompanyManagementEnterprise": CompanyManagementEnterprise,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};