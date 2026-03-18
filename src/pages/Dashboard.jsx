import { useProfile } from "@/lib/ProfileContext";
import WompiCallback from "@/components/dashboard/WompiCallback";
import TraderDashboard from "./dashboard/TraderDashboard";
import DronePilotDashboard from "./dashboard/DronePilotDashboard";
import DroneCoDashboard from "./dashboard/DroneCoDashboard";
import StartupDashboard from "./dashboard/StartupDashboard";
import EliteHumanDashboard from "./dashboard/EliteHumanDashboard";

const DASHBOARD_MAP = {
  trader: TraderDashboard,
  drone_pilot: DronePilotDashboard,
  drone_company: DroneCoDashboard,
  startup: StartupDashboard,
  elite_human: EliteHumanDashboard,
};

export default function Dashboard() {
  const { activeProfileId } = useProfile();
  const Component = DASHBOARD_MAP[activeProfileId];
  if (!Component) return null;
  return (
    <WompiCallback>
      <Component />
    </WompiCallback>
  );
}