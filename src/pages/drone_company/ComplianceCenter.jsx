import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Wrench, CheckSquare, AlertCircle } from "lucide-react";
import ManualsManagement from "./ManualsManagement";
import MaintenanceRecords from "./MaintenanceRecords";
import InternalAudits from "./InternalAudits";
import AerocivialFilings from "./AerocivialFilings";

export default function ComplianceCenter() {
  const [activeTab, setActiveTab] = useState("manuales");

  const tabs = [
    { id: "manuales", label: "Manuales", icon: FileText, component: ManualsManagement },
    { id: "mantenimiento", label: "Mantenimiento", icon: Wrench, component: MaintenanceRecords },
    { id: "auditorias", label: "Auditorías", icon: CheckSquare, component: InternalAudits },
    { id: "radicados", label: "Aerocivil", icon: AlertCircle, component: AerocivialFilings },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  const ActiveComponent = activeTabData?.component || ManualsManagement;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Centro de Cumplimiento</h1>
        <p className="text-muted-foreground">Gestión de documentación, mantenimiento, auditorías y radicados ante Aerocivil</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className="gap-2 whitespace-nowrap"
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      <Card className="p-6">
        <ActiveComponent />
      </Card>
    </div>
  );
}