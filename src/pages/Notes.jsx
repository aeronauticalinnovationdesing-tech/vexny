import { useProfile } from "@/lib/ProfileContext";
import TraderNotes from "./trader/TraderNotes.jsx";
import GenericNotes from "./shared/GenericNotes.jsx";

const PAGE_MAP = {
  trader: TraderNotes,
  drone_pilot: GenericNotes,
  startup: GenericNotes,
  elite_human: GenericNotes,
};

export default function Notes() {
  const { activeProfileId } = useProfile();
  const Component = PAGE_MAP[activeProfileId] || GenericNotes;
  return <Component />;
}