import { useProfile } from "@/lib/ProfileContext";
import StartupProjects from "./startup/StartupProjects.jsx";
import DroneMissions from "./drone_pilot/DroneMissions.jsx";
import EliteHumanProjects from "./elite_human/EliteHumanProjects.jsx";

const PAGE_MAP = {
  trader: StartupProjects,
  drone_pilot: DroneMissions,
  startup: StartupProjects,
  elite_human: EliteHumanProjects,
};

export default function ProjectsRouter() {
  const { activeProfileId } = useProfile();
  const Component = PAGE_MAP[activeProfileId];
  if (!Component) return null;
  return <Component />;
}