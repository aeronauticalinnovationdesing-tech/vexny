import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Clock, AlertCircle, User, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const COLUMNS = [
  { id: "backlog", label: "Backlog", color: "text-muted-foreground", bg: "bg-muted/40" },
  { id: "pending", label: "Por Hacer", color: "text-blue-600", bg: "bg-blue-50" },
  { id: "in_progress", label: "En Progreso", color: "text-primary", bg: "bg-primary/5" },
  { id: "review", label: "Revisión", color: "text-purple-600", bg: "bg-purple-50" },
  { id: "completed", label: "Completado", color: "text-green-600", bg: "bg-green-50" },
];

const priorityColors = {
  low: "bg-green-100 text-green-700",
  medium: "bg-primary/10 text-primary",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

function TaskCard({ task, index, onClick }) {
  const checklistDone = (task.checklist || []).filter(c => c.done).length;
  const checklistTotal = (task.checklist || []).length;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={cn(
            "bg-card rounded-xl border border-border p-3.5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all mb-2",
            snapshot.isDragging && "shadow-xl ring-2 ring-primary/40 rotate-1"
          )}
        >
          {task.priority && task.priority !== "medium" && (
            <Badge className={cn("text-xs mb-2", priorityColors[task.priority])}>
              {task.priority === "critical" ? "🔥 Crítica" : task.priority === "high" ? "⬆ Alta" : "⬇ Baja"}
            </Badge>
          )}
          <p className="text-sm font-medium leading-snug mb-2">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center justify-between flex-wrap gap-1 mt-2">
            <div className="flex items-center gap-2">
              {task.due_date && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(new Date(task.due_date), "d MMM", { locale: es })}
                </span>
              )}
              {checklistTotal > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckSquare className="w-3 h-3" />
                  {checklistDone}/{checklistTotal}
                </span>
              )}
            </div>
            {task.assignee && (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {task.assignee[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {task.estimated_hours > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              ⏱ {task.logged_hours || 0}h / {task.estimated_hours}h
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanBoard({ tasks, onTaskClick, onAddTask, onDragEnd }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter(t => (t.status || "pending") === col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-[280px]">
              <div className={cn("rounded-xl p-3 mb-3", col.bg)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", col.color)}>{col.label}</span>
                    <span className="text-xs bg-background rounded-full w-5 h-5 flex items-center justify-center font-bold text-muted-foreground">
                      {colTasks.length}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddTask(col.id)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[100px] rounded-xl transition-colors p-1",
                      snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20"
                    )}
                  >
                    {colTasks.map((task, index) => (
                      <TaskCard key={task.id} task={task} index={index} onClick={onTaskClick} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}