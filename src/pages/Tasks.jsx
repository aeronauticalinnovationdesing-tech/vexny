import { useProfile } from "@/lib/ProfileContext";
import TraderTrades from "./trader/TraderTrades.jsx";
import DronePilotFlightLog from "./drone_pilot/DronePilotFlightLog.jsx";
import StartupTasks from "./startup/StartupTasks.jsx";
import EliteHumanGoals from "./elite_human/EliteHumanGoals.jsx";

const PAGE_MAP = {
  trader: TraderTrades,
  drone_pilot: DronePilotFlightLog,
  startup: StartupTasks,
  elite_human: EliteHumanGoals,
};

export default function Tasks() {
  const { activeProfileId } = useProfile();
  const Component = PAGE_MAP[activeProfileId];
  if (!Component) return null;
  return <Component />;
}