import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Trash2, Video, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeLabels = { meeting: "Reunión", deadline: "Fecha límite", reminder: "Recordatorio", personal: "Personal", other: "Otro" };
const typeColors = { meeting: "bg-blue-500", deadline: "bg-red-500", reminder: "bg-primary", personal: "bg-purple-500", other: "bg-muted-foreground" };

function buildMeetUrl(title, date, time) {
  const base = "https://meet.google.com/new";
  // We open Meet directly; Google Calendar deep-link pre-fills event details
  const start = time ? `${date}T${time}:00` : `${date}T09:00:00`;
  const end = time ? `${date}T${String(parseInt(time.split(":")[0]) + 1).padStart(2, "0")}:${time.split(":")[1]}:00` : `${date}T10:00:00`;
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start.replace(/-|:/g, "")}/${end.replace(/-|:/g, "")}&details=${encodeURIComponent("Reunión agendada desde VEXNY")}&add=meet`;
  return gcalUrl;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", time: "", type: "reminder", meet_link: "" });
  const [generatingMeet, setGeneratingMeet] = useState(false);
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: events = [] } = useQuery({
    queryKey: ["events", user?.email],
    queryFn: () => base44.entities.CalendarEvent.filter({ created_by: user.email }, "-date"),
    enabled: !!user,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const createEvent = useMutation({
    mutationFn: (d) => base44.entities.CalendarEvent.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); setShowForm(false); }
  });
  const deleteEvent = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] })
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const dayEvents = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (e.date) {
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
      }
    });
    tasks.forEach(t => {
      if (t.due_date && t.status !== "completed") {
        if (!map[t.due_date]) map[t.due_date] = [];
        map[t.due_date].push({ ...t, type: "deadline", title: `📋 ${t.title}` });
      }
    });
    return map;
  }, [events, tasks]);

  const selectedEvents = selectedDate ? (dayEvents[format(selectedDate, "yyyy-MM-dd")] || []) : [];

  const openNewEvent = (date) => {
    setForm({ title: "", description: "", date: format(date, "yyyy-MM-dd"), time: "", type: "reminder", meet_link: "" });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form };
    createEvent.mutate(data);
  };

  const generateMeetLink = async () => {
    if (!form.title || !form.date) return;
    setGeneratingMeet(true);
    const res = await base44.functions.invoke('createMeetEvent', {
      title: form.title,
      date: form.date,
      time: form.time,
      description: form.description
    });
    if (res.data?.meet_link) {
      setForm(f => ({ ...f, meet_link: res.data.meet_link }));
    }
    setGeneratingMeet(false);
  };

  const openMeetLink = (evt) => {
    if (evt.meet_link) {
      window.open(evt.meet_link, "_blank");
    } else if (evt.type === "meeting") {
      window.open(buildMeetUrl(evt.title, evt.date, evt.time), "_blank");
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
        </div>
        <Button onClick={() => openNewEvent(selectedDate || new Date())} className="gap-2">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo Evento</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-base lg:text-lg font-semibold capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {["D", "L", "M", "X", "J", "V", "S"].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvts = dayEvents[dateKey] || [];
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square p-0.5 lg:p-1 rounded-xl text-sm transition-all flex flex-col items-center justify-start gap-0.5",
                    isToday && "bg-primary/10 font-bold",
                    isSelected && "ring-2 ring-primary",
                    "hover:bg-muted"
                  )}
                >
                  <span className={cn("text-xs", isToday && "text-primary")}>{format(day, "d")}</span>
                  {dayEvts.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayEvts.slice(0, 3).map((e, i) => (
                        <div key={i} className={cn("w-1.5 h-1.5 rounded-full", typeColors[e.type] || "bg-muted-foreground")} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day events panel */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">
            {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : "Selecciona un día"}
          </h3>
          <div className="space-y-2">
            {selectedEvents.map((evt, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/50 group flex items-start gap-2">
                <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", typeColors[evt.type])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{evt.title}</p>
                  {evt.time && <p className="text-xs text-muted-foreground">{evt.time}</p>}
                  {(evt.type === "meeting" || evt.meet_link) && (
                    <button
                      onClick={() => openMeetLink(evt)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                    >
                      <Video className="w-3 h-3" />
                      {evt.meet_link ? "Unirse a Meet" : "Crear Meet"}
                    </button>
                  )}
                </div>
                {evt.id && !evt.due_date && (
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteEvent.mutate(evt.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            {selectedDate && selectedEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin eventos este día</p>
            )}
            {selectedDate && (
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => openNewEvent(selectedDate)}>
                <Plus className="w-3 h-3 mr-1" /> Agregar evento
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* New Event Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalIcon className="w-4 h-4 text-primary" /> Nuevo Evento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Google Meet */}
            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Video className="w-3.5 h-3.5 text-blue-500" />
                Link de Google Meet <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={form.meet_link}
                  onChange={e => setForm({ ...form, meet_link: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateMeetLink}
                  disabled={generatingMeet || !form.title || !form.date}
                  className="whitespace-nowrap border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {generatingMeet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                  {generatingMeet ? "Generando..." : "Generar"}
                </Button>
              </div>
            </div>

            <div>
              <Label>Descripción <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[70px]" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createEvent.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}