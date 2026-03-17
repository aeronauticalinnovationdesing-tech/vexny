import { useProfile } from "@/lib/ProfileContext";
import TraderAccounting from "./trader/TraderAccounting.jsx";
import GenericAccounting from "./shared/GenericAccounting.jsx";

const PAGE_MAP = {
  trader: TraderAccounting,
  drone_pilot: GenericAccounting,
  startup: GenericAccounting,
  elite_human: GenericAccounting,
};

export default function Accounting() {
  const { activeProfileId } = useProfile();
  const Component = PAGE_MAP[activeProfileId] || GenericAccounting;
  return <Component />;
}