import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const statusLabels = { planning: "Planeación", active: "Activo", paused: "Pausado", completed: "Completado" };
const statusColors = {
  planning: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-muted text-muted-foreground",
};

export default function ProjectDetailHeader({ project, taskCount, completedCount, onBack, onEdit }) {
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 mb-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || "#F59E0B" }} />
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge className={cn("text-xs", statusColors[project.status])}>
              {statusLabels[project.status]}
            </Badge>
            {project.priority === "critical" && <Badge className="bg-red-100 text-red-700 text-xs">🔥 Crítico</Badge>}
          </div>
          {project.description && <p className="text-sm text-muted-foreground mb-3">{project.description}</p>}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(project.start_date), "d MMM yyyy", { locale: es })}
              </span>
            )}
            {project.end_date && (
              <span className="flex items-center gap-1">
                → {format(new Date(project.end_date), "d MMM yyyy", { locale: es })}
              </span>
            )}
            {(project.team_members || []).length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {project.team_members.length} miembro(s)
              </span>
            )}
            {project.budget > 0 && (
              <span className="font-medium text-foreground">
                💰 ${(project.spent || 0).toLocaleString()} / ${project.budget.toLocaleString()}
              </span>
            )}
          </div>

          {taskCount > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{completedCount} de {taskCount} tareas completadas</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {(project.tags || []).length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {project.tags.map(tag => (
                <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">#{tag}</span>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-shrink-0">
          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
        </Button>
      </div>
    </div>
  );
}