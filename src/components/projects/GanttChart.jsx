import React, { useMemo } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, differenceInDays, parseISO, isWithinInterval, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const priorityColors = {
  low: "bg-green-400",
  medium: "bg-primary",
  high: "bg-orange-400",
  critical: "bg-red-500",
};

export default function GanttChart({ tasks, project }) {
  const today = new Date();

  const validTasks = tasks.filter(t => t.start_date || t.due_date);

  const dates = useMemo(() => {
    const start = project?.start_date ? parseISO(project.start_date) : startOfMonth(today);
    const end = project?.end_date ? parseISO(project.end_date) : addMonths(today, 1);
    return eachDayOfInterval({ start, end });
  }, [project]);

  const projectStart = project?.start_date ? parseISO(project.start_date) : startOfMonth(today);

  if (validTasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Las tareas necesitan fecha de inicio o fecha límite para aparecer en el Gantt
      </div>
    );
  }

  const dayWidth = 36;
  const totalWidth = dates.length * dayWidth;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div style={{ minWidth: totalWidth + 200 }}>
        {/* Header */}
        <div className="flex border-b border-border">
          <div className="w-[200px] flex-shrink-0 px-4 py-3 text-xs font-semibold text-muted-foreground bg-muted/30">
            Tarea
          </div>
          <div className="flex">
            {dates.map((day, i) => {
              const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              const isFirstOfMonth = day.getDate() === 1;
              return (
                <div
                  key={i}
                  style={{ width: dayWidth }}
                  className={cn(
                    "text-center py-2 border-l border-border flex-shrink-0",
                    isToday && "bg-primary/10",
                    isFirstOfMonth && "border-l-2 border-l-primary/40"
                  )}
                >
                  <div className="text-xs text-muted-foreground">{format(day, "d")}</div>
                  {isFirstOfMonth && (
                    <div className="text-xs font-semibold text-primary capitalize">{format(day, "MMM", { locale: es })}</div>
                  )}
                  {isToday && <div className="w-1 h-1 rounded-full bg-primary mx-auto mt-0.5" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        {validTasks.map((task) => {
          const taskStart = task.start_date ? parseISO(task.start_date) : (task.due_date ? parseISO(task.due_date) : null);
          const taskEnd = task.due_date ? parseISO(task.due_date) : taskStart;
          if (!taskStart) return null;

          const startOffset = Math.max(0, differenceInDays(taskStart, projectStart));
          const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);
          const barWidth = duration * dayWidth;
          const barLeft = startOffset * dayWidth;
          const checkDone = (task.checklist || []).filter(c => c.done).length;
          const checkTotal = (task.checklist || []).length;
          const checkPct = checkTotal > 0 ? (checkDone / checkTotal) * 100 : (task.status === "completed" ? 100 : 0);

          return (
            <div key={task.id} className="flex items-center border-b border-border hover:bg-muted/20 group">
              <div className="w-[200px] flex-shrink-0 px-4 py-3">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{task.status?.replace("_", " ")}</p>
              </div>
              <div className="relative flex-1 py-3" style={{ height: 52 }}>
                {dates.map((_, i) => (
                  <div
                    key={i}
                    style={{ left: i * dayWidth, width: dayWidth }}
                    className="absolute top-0 bottom-0 border-l border-border/30"
                  />
                ))}
                {/* Today line */}
                {(() => {
                  const todayOffset = differenceInDays(today, projectStart);
                  if (todayOffset >= 0 && todayOffset < dates.length) {
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-primary/50 z-10"
                        style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                      />
                    );
                  }
                  return null;
                })()}
                {/* Bar */}
                <div
                  className={cn("absolute top-1/2 -translate-y-1/2 h-7 rounded-lg flex items-center overflow-hidden shadow-sm",
                    priorityColors[task.priority] || "bg-primary"
                  )}
                  style={{ left: barLeft, width: Math.max(barWidth, dayWidth) }}
                >
                  {checkPct > 0 && (
                    <div
                      className="h-full bg-black/20 absolute top-0 left-0 rounded-lg"
                      style={{ width: `${checkPct}%` }}
                    />
                  )}
                  <span className="px-2 text-xs text-white font-medium truncate relative z-10">
                    {task.title}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}