import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderKanban, LayoutGrid, List, Search } from "lucide-react";
import ProjectCard from "../components/projects/ProjectCard";
import ProjectForm from "../components/projects/ProjectForm";
import ProjectDetail from "./ProjectDetail";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Projects() {
  const [showForm, setShowForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  if (selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    all: projects.length,
    planning: projects.filter(p => p.status === "planning").length,
    active: projects.filter(p => p.status === "active").length,
    paused: projects.filter(p => p.status === "paused").length,
    completed: projects.filter(p => p.status === "completed").length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Proyecto
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Todos" },
          { key: "active", label: "Activos" },
          { key: "planning", label: "Planeación" },
          { key: "paused", label: "Pausados" },
          { key: "completed", label: "Completados" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filterStatus === tab.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tab.label} <span className="ml-1 opacity-70">{statusCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proyectos..." className="pl-9" />
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={cn("px-3 py-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={cn("px-3 py-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const projectTasks = tasks.filter(t => t.project_id === project.id);
            const completedTasks = projectTasks.filter(t => t.status === "completed");
            return (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={projectTasks.length}
                completedCount={completedTasks.length}
                onClick={() => setSelectedProjectId(project.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((project) => {
            const projectTasks = tasks.filter(t => t.project_id === project.id);
            const completedTasks = projectTasks.filter(t => t.status === "completed");
            const progress = projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;
            const statusColors = { planning: "bg-blue-100 text-blue-700", active: "bg-green-100 text-green-700", paused: "bg-yellow-100 text-yellow-700", completed: "bg-muted text-muted-foreground" };
            const statusLabels = { planning: "Planeación", active: "Activo", paused: "Pausado", completed: "Completado" };
            return (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || "#F59E0B" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{project.name}</p>
                    <Badge className={cn("text-xs", statusColors[project.status])}>{statusLabels[project.status]}</Badge>
                  </div>
                  <Progress value={progress} className="h-1 w-full max-w-xs" />
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium">{progress}%</p>
                  <p className="text-xs text-muted-foreground">{completedTasks.length}/{projectTasks.length} tareas</p>
                </div>
                {project.end_date && (
                  <div className="text-right flex-shrink-0 hidden md:block">
                    <p className="text-xs text-muted-foreground">Vence</p>
                    <p className="text-sm font-medium">{format(new Date(project.end_date), "d MMM", { locale: es })}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No se encontraron proyectos</p>
        </div>
      )}

      <ProjectForm
        open={showForm}
        onOpenChange={setShowForm}
        onSave={(data) => createMutation.mutate(data)}
        project={null}
      />
    </div>
  );
}