import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckSquare } from "lucide-react";
import TaskItem from "../components/tasks/TaskItem";
import TaskForm from "../components/tasks/TaskForm";

export default function Tasks() {
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleSave = (data) => {
    if (editTask) {
      updateMutation.mutate({ id: editTask.id, data });
    } else {
      createMutation.mutate(data);
    }
    setEditTask(null);
  };

  const handleStatusChange = (task, newStatus) => {
    updateMutation.mutate({ id: task.id, data: { ...task, status: newStatus } });
  };

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

  const filtered = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
        </div>
        <Button onClick={() => { setEditTask(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Tarea
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            projectName={projectMap[task.project_id]}
            onEdit={(t) => { setEditTask(t); setShowForm(true); }}
            onDelete={(t) => deleteMutation.mutate(t.id)}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay tareas que mostrar</p>
        </div>
      )}

      <TaskForm
        open={showForm}
        onOpenChange={setShowForm}
        onSave={handleSave}
        task={editTask}
        projects={projects}
      />
    </div>
  );
}