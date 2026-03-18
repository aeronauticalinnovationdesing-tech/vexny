import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusLabels = {
  planning: "Planeación",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
};

const statusColors = {
  planning: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-muted text-muted-foreground",
};

export default function ProjectCard({ project, taskCount = 0, completedCount = 0, onClick, onDelete }) {
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  const budgetUsed = project.budget > 0 ? Math.round(((project.spent || 0) / project.budget) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || "#F59E0B" }} />
          <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{project.name}</h3>
        </div>
        <Badge className={cn("text-xs", statusColors[project.status])}>
          {statusLabels[project.status]}
        </Badge>
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {project.budget > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Presupuesto</span>
            <span>${(project.spent || 0).toLocaleString()} / ${project.budget.toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span>{taskCount} tareas</span>
          {project.end_date && (
            <span>Vence {format(new Date(project.end_date), "d MMM", { locale: es })}</span>
          )}
        </div>
      </div>
    </div>
  );
}