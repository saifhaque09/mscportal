"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";
import { Plus, ChevronLeft, ChevronRight, Trash2, Search, Eye, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import useEventApi from "@/api/useEventApi";
import useDeadlineApi from "@/api/useDeadlineApi";
import useOrganisationApi from "@/api/useOrganisationApi";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const SCROLL_TO_7AM = new Date();
SCROLL_TO_7AM.setHours(7, 0, 0, 0);

// Cycled per client so each organisation gets a stable, distinct color across events + deadlines
const CLIENT_COLOR_PALETTE = [
  { key: "blue", light: { bg: "#dbeafe", text: "#1d4ed8", border: "#3b82f6" }, dark: { bg: "rgba(59,130,246,0.18)", text: "#93c5fd", border: "#3b82f6" }, avatar: "#3b82f6" },
  { key: "green", light: { bg: "#dcfce7", text: "#15803d", border: "#22c55e" }, dark: { bg: "rgba(34,197,94,0.18)", text: "#86efac", border: "#22c55e" }, avatar: "#22c55e" },
  { key: "purple", light: { bg: "#f3e8ff", text: "#7e22ce", border: "#a855f7" }, dark: { bg: "rgba(168,85,247,0.18)", text: "#d8b4fe", border: "#a855f7" }, avatar: "#a855f7" },
  { key: "orange", light: { bg: "#ffedd5", text: "#c2410c", border: "#f97316" }, dark: { bg: "rgba(249,115,22,0.18)", text: "#fdba74", border: "#f97316" }, avatar: "#f97316" },
  { key: "red", light: { bg: "#fee2e2", text: "#b91c1c", border: "#ef4444" }, dark: { bg: "rgba(239,68,68,0.18)", text: "#fca5a5", border: "#ef4444" }, avatar: "#ef4444" },
  { key: "teal", light: { bg: "#ccfbf1", text: "#0f766e", border: "#14b8a6" }, dark: { bg: "rgba(20,184,166,0.18)", text: "#5eead4", border: "#14b8a6" }, avatar: "#14b8a6" },
  { key: "pink", light: { bg: "#fce7f3", text: "#be185d", border: "#ec4899" }, dark: { bg: "rgba(236,72,153,0.18)", text: "#f9a8d4", border: "#ec4899" }, avatar: "#ec4899" },
  { key: "indigo", light: { bg: "#e0e7ff", text: "#4338ca", border: "#6366f1" }, dark: { bg: "rgba(99,102,241,0.18)", text: "#a5b4fc", border: "#6366f1" }, avatar: "#6366f1" },
];

const DEADLINE_STATUS_CLASSES = {
  pending: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  completed: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  overdue: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
};

const getInitials = (name) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Formats an "HH:MM" (24-hour) time string, tolerating "1 pm" / "9 am" backend variants
const formatTimeForSelect = (timeStr) => {
  if (!timeStr) return "";
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const pmMatch = timeStr.match(/^(\d+)\s*pm$/i);
  if (pmMatch) {
    const h = parseInt(pmMatch[1], 10);
    const hour24 = h === 12 ? 12 : h + 12;
    return `${String(hour24).padStart(2, "0")}:00`;
  }
  const amMatch = timeStr.match(/^(\d+)\s*am$/i);
  if (amMatch) {
    const h = parseInt(amMatch[1], 10);
    const hour24 = h === 12 ? 0 : h;
    return `${String(hour24).padStart(2, "0")}:00`;
  }
  return timeStr;
};

const formatTime12Hour = (timeStr) => {
  const normalized = formatTimeForSelect(timeStr);
  const match = normalized.match(/^(\d{2}):(\d{2})/);
  if (!match) return timeStr;
  const hour = parseInt(match[1], 10);
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${match[2]} ${period}`;
};

const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourStr = String(hour).padStart(2, "0");
    options.push(`${hourStr}:00`);
    options.push(`${hourStr}:30`);
  }
  return options;
};
const timeOptions = generateTimeOptions();

const buildEventRange = (dateStr, fromTime, toTime) => {
  if (!dateStr) return null;
  const datePart = dateStr.substring(0, 10);
  if (!fromTime) {
    return { start: new Date(`${datePart}T00:00:00`), end: new Date(`${datePart}T23:59:59`), allDay: true };
  }
  const start = new Date(`${datePart}T${formatTimeForSelect(fromTime)}:00`);
  let end = toTime ? new Date(`${datePart}T${formatTimeForSelect(toTime)}:00`) : null;
  if (!end || end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end, allDay: false };
};

// due_date arrives as a UTC-midnight ISO timestamp; parse the date parts directly so the
// deadline lands on the calendar day the backend meant, regardless of the viewer's timezone.
const buildDeadlineRange = (dueDateStr) => {
  if (!dueDateStr) return null;
  const datePart = dueDateStr.substring(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { start: new Date(y, m - 1, d), end: new Date(y, m - 1, d, 23, 59, 59), allDay: true };
};

const todayDateStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// Date/time comparisons are done on local calendar parts, not Date.parse of the
// raw string — "2026-08-17" parses as UTC midnight and would read as yesterday
// for anyone west of GMT.
const isPastDate = (dateStr) => {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.substring(0, 10).split("-").map(Number);
  const midnightToday = new Date();
  midnightToday.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d) < midnightToday;
};

const isPastDateTime = (dateStr, timeStr) => {
  if (!dateStr) return false;
  if (isPastDate(dateStr)) return true;
  if (!timeStr) return false;
  const normalized = formatTimeForSelect(timeStr);
  const match = normalized.match(/^(\d{2}):(\d{2})/);
  if (!match) return false;
  const [y, m, d] = dateStr.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, Number(match[1]), Number(match[2])) < new Date();
};

const emptyEventForm = { id: "", title: "", email: "", date: "", from_time: "", to_time: "", description: "" };

const CalendarContext = React.createContext();

const EventContent = ({ event: entry }) => {
  const { isAccountant } = React.useContext(CalendarContext);
  return (
    <div className="flex items-center gap-1 min-w-0 text-[11px] leading-tight py-0.5">
      {isAccountant && (
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 text-white"
          style={{ backgroundColor: entry.color.avatar }}
        >
          {getInitials(entry.clientName)}
        </span>
      )}
      {entry.type === "deadline" && <Clock3 className="w-3 h-3 shrink-0" />}
      <span className="truncate font-medium">{entry.title}</span>
    </div>
  );
};

const CalendarToolbar = ({ label, onNavigate, onView, view: toolbarView, date }) => {
  const { setCurrentDate } = React.useContext(CalendarContext);
  
  // Default 5-year span for smooth scrolling: -2 years to +2 years from today
  const currentYear = new Date().getFullYear();
  const baseYear = currentYear - 2; 

  let min = 0, max = 0, calendarValue = 0;
  
  if (toolbarView === Views.MONTH) {
    min = 0;
    max = 59; // 5 years * 12 months - 1
    calendarValue = (date.getFullYear() - baseYear) * 12 + date.getMonth();
    // Clamp value within bounds
    if (calendarValue < min) calendarValue = min;
    if (calendarValue > max) calendarValue = max;
  } else if (toolbarView === Views.WEEK) {
    min = 0;
    max = 260; // 5 years * ~52 weeks
    const startOfYearBase = new Date(baseYear, 0, 1);
    const diffTime = date.getTime() - startOfYearBase.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    calendarValue = Math.floor(diffDays / 7);
    if (calendarValue < min) calendarValue = min;
    if (calendarValue > max) calendarValue = max;
  }

  const [localValue, setLocalValue] = React.useState(calendarValue);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    if (!isDragging) {
      setLocalValue(calendarValue);
    }
  }, [calendarValue, isDragging]);

  const handleSliderChange = (e) => {
    const rawVal = parseFloat(e.target.value);
    setLocalValue(rawVal);
    
    const val = Math.round(rawVal);
    if (toolbarView === Views.MONTH) {
      const newYear = baseYear + Math.floor(val / 12);
      const newMonth = val % 12;
      setCurrentDate(new Date(newYear, newMonth, 1));
    } else if (toolbarView === Views.WEEK) {
      const newDate = new Date(baseYear, 0, 1);
      newDate.setDate(newDate.getDate() + val * 7);
      setCurrentDate(newDate);
    }
  };

  return (
    <div className="flex flex-col gap-3 mb-3">
      <div className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1 py-1">
          <button
            type="button"
            onClick={() => onNavigate("PREV")}
            className="p-1.5 rounded hover:bg-accent/60 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-card-foreground px-2 whitespace-nowrap min-w-[140px] text-center">{label}</span>
          <button
            type="button"
            onClick={() => onNavigate("NEXT")}
            className="p-1.5 rounded hover:bg-accent/60 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={toolbarView} onValueChange={onView}>
            <TabsList>
              <TabsTrigger value={Views.MONTH} className="cursor-pointer">Month</TabsTrigger>
              <TabsTrigger value={Views.WEEK} className="cursor-pointer">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" onClick={() => onNavigate("TODAY")} className="h-8 px-3 text-sm font-semibold cursor-pointer">
            Today
          </Button>
        </div>
      </div>
      
      {/* Timeline Slider */}
      <div className="w-full flex flex-col gap-1 px-1 mt-1 mb-2 relative group">
        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          <span>{baseYear}</span>
          <span>{toolbarView === Views.MONTH ? "Slide to navigate months" : "Slide to navigate weeks"}</span>
          <span>{baseYear + 4}</span>
        </div>
        <input 
          type="range" 
          min={min} 
          max={max} 
          step="any"
          value={localValue} 
          onChange={handleSliderChange} 
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onPointerLeave={() => setIsDragging(false)}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary border border-border/50 shadow-sm transition-opacity" 
        />
      </div>
    </div>
  );
};

const CalendarBoard = () => {
  const { loading: eventsLoading, getAllEvents, createEvent, editEvent, deleteEvent } = useEventApi();
  const { getOrganizationDeadlines } = useDeadlineApi();
  const { getBusinessClientsForCalendar, calendarClients, calendarClientsLoading } = useOrganisationApi();
  const { settings } = useTheme();
  const isDarkTheme = settings?.theme === "dark";

  const [userRole, setUserRole] = useState("");
  const [ownFirmId, setOwnFirmId] = useState("");
  const [ownFirmGuid, setOwnFirmGuid] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showCreatedEvents, setShowCreatedEvents] = useState(true);

  const [calendarEntries, setCalendarEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(Views.MONTH);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // What an edit dialog opened with — an already-past event stays editable
  // (fixing its title shouldn't be blocked); only a *changed* date/time is
  // held to the no-past-timing rule.
  const [originalSchedule, setOriginalSchedule] = useState({ date: "", from_time: "" });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeadlineDialogOpen, setIsDeadlineDialogOpen] = useState(false);
  const [activeDeadline, setActiveDeadline] = useState(null);
  const [newEvent, setNewEvent] = useState(emptyEventForm);

  const isAccountant = userRole === "accountant" || userRole === "admin";

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(localStorage.getItem("userRole") || "");
      setOwnFirmId(localStorage.getItem("firmId") || "");
      setOwnFirmGuid(localStorage.getItem("firmGuid") || "");
    }
  }, []);

  useEffect(() => {
    if (isAccountant) {
      getBusinessClientsForCalendar();
    }
  }, [isAccountant, getBusinessClientsForCalendar]);

  // Default to showing every client's calendar until the user narrows the selection
  useEffect(() => {
    if (isAccountant && calendarClients.length > 0) {
      setSelectedClientIds(calendarClients.map((c) => c.id));
    }
  }, [isAccountant, calendarClients]);

  useEffect(() => {
    if (!isAccountant && ownFirmId) {
      setSelectedClientIds([ownFirmId]);
    }
  }, [isAccountant, ownFirmId]);

  const clientList = useMemo(() => (isAccountant ? calendarClients : []), [isAccountant, calendarClients]);

  const filteredClientList = useMemo(() => {
    if (!clientSearch.trim()) return clientList;
    const q = clientSearch.trim().toLowerCase();
    return clientList.filter((c) => c.firm_name?.toLowerCase().includes(q));
  }, [clientList, clientSearch]);

  const clientById = useMemo(() => {
    const map = new Map();
    clientList.forEach((c) => map.set(c.id, c));
    return map;
  }, [clientList]);

  const colorForClient = useCallback(
    (id) => {
      if (!isAccountant) return CLIENT_COLOR_PALETTE[0];
      const idx = clientList.findIndex((c) => c.id === id);
      return CLIENT_COLOR_PALETTE[(idx >= 0 ? idx : 0) % CLIENT_COLOR_PALETTE.length];
    },
    [clientList, isAccountant]
  );

  const activeClientId = selectedClientIds.length === 1 ? selectedClientIds[0] : null;
  const activeClientEmail = activeClientId ? clientById.get(activeClientId)?.contact_email || "" : "";
  const activeClientName = activeClientId
    ? clientById.get(activeClientId)?.firm_name || (activeClientId === ownFirmId ? "My Firm" : activeClientId)
    : null;

  // Fetch deadlines and manually-created events for every selected client and merge into one list.
  useEffect(() => {
    if (selectedClientIds.length === 0) {
      setCalendarEntries([]);
      return;
    }
    let cancelled = false;
    setEntriesLoading(true);

    (async () => {
      const perClient = await Promise.all(
        selectedClientIds.map(async (id) => {
          const clientGuid = clientById.get(id)?.guid || (id === ownFirmId ? ownFirmGuid : null);
          const [deadlinesPayload, eventsPayload] = await Promise.all([
            clientGuid ? getOrganizationDeadlines(clientGuid, { resultsPerPage: 100 }) : Promise.resolve(null),
            getAllEvents(id, { resultsPerPage: 100 }),
          ]);
          const deadlineList = deadlinesPayload?.data || [];
          const eventList = Array.isArray(eventsPayload) ? eventsPayload : eventsPayload?.data || [];
          const clientName = clientById.get(id)?.firm_name || (id === ownFirmId ? "My Firm" : id);
          const color = colorForClient(id);

          const deadlineEntries = deadlineList
            .map((d) => {
              const range = buildDeadlineRange(d.due_date);
              if (!range) return null;
              return {
                id: `deadline-${d.id}`,
                type: "deadline",
                title: d.deadline?.name || "Deadline",
                start: range.start,
                end: range.end,
                allDay: true,
                clientId: id,
                clientName,
                color,
                raw: d,
              };
            })
            .filter(Boolean);

          const eventEntries = eventList
            .map((ev) => {
              const range = buildEventRange(ev.date, ev.from_time, ev.to_time);
              if (!range) return null;
              return {
                id: `event-${ev.guid || ev.id}`,
                type: "event",
                title: ev.event_name || "Event",
                start: range.start,
                end: range.end,
                allDay: range.allDay,
                clientId: id,
                clientName,
                color,
                raw: ev,
              };
            })
            .filter(Boolean);

          return [...deadlineEntries, ...eventEntries];
        })
      );

      if (!cancelled) {
        setCalendarEntries(perClient.flat());
        setEntriesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientIds, refreshTick, clientById, colorForClient, ownFirmId, ownFirmGuid]);

  const refreshEntries = () => setRefreshTick((t) => t + 1);

  const visibleEntries = useMemo(
    () => calendarEntries.filter((e) => e.type === "deadline" || showCreatedEvents),
    [calendarEntries, showCreatedEvents]
  );

  const toggleClient = (id) => {
    setSelectedClientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllClients = () => {
    const allIds = clientList.map((c) => c.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedClientIds.includes(id));
    setSelectedClientIds(allSelected ? [] : allIds);
  };

  // Form helpers
  const validateForm = () => {
    if (!newEvent.title.trim()) {
      toast.error("Please enter a title");
      return false;
    }
    if (!newEvent.email.trim()) {
      toast.error("Please enter a notification email");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEvent.email.trim())) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!newEvent.date) {
      toast.error("Please select a date");
      return false;
    }
    const scheduleUnchanged =
      isEditMode &&
      newEvent.date === originalSchedule.date &&
      newEvent.from_time === originalSchedule.from_time;
    if (!scheduleUnchanged) {
      if (isPastDate(newEvent.date)) {
        toast.error("Event date cannot be in the past");
        return false;
      }
      if (isPastDateTime(newEvent.date, newEvent.from_time)) {
        toast.error("Start time cannot be in the past");
        return false;
      }
    }
    if (
      newEvent.from_time &&
      newEvent.to_time &&
      formatTimeForSelect(newEvent.to_time) <= formatTimeForSelect(newEvent.from_time)
    ) {
      toast.error("End time must be after the start time");
      return false;
    }
    return true;
  };

  const openCreateDialog = (dateStr, fromTime = "", toTime = "") => {
    if (isAccountant && !activeClientId) {
      toast.info("Select exactly one client in the sidebar to create an event");
      return;
    }
    if (isPastDate(dateStr)) {
      toast.error("Events cannot be created on a past date");
      return;
    }
    if (isPastDateTime(dateStr, fromTime)) {
      toast.error("Events cannot be created at a past time");
      return;
    }
    // The selected client's contact email seeds the notification field — it
    // stays a plain editable input, so it can be overridden per event.
    setNewEvent({ ...emptyEventForm, email: activeClientEmail, date: dateStr, from_time: fromTime, to_time: toTime });
    setOriginalSchedule({ date: "", from_time: "" });
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleSelectSlot = ({ start, action }) => {
    if (action === "select" || action === "click") {
      const dateStr = format(start, "yyyy-MM-dd");
      const isMidnight = start.getHours() === 0 && start.getMinutes() === 0 && view === Views.MONTH;
      if (isMidnight) {
        openCreateDialog(dateStr);
      } else {
        const fromTimeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
        const toDate = new Date(start.getTime() + 60 * 60 * 1000);
        const toTimeStr = `${String(toDate.getHours()).padStart(2, "0")}:${String(toDate.getMinutes()).padStart(2, "0")}`;
        openCreateDialog(dateStr, fromTimeStr, toTimeStr);
      }
    }
  };

  const handleSelectEvent = (entry) => {
    if (entry.type === "deadline") {
      setActiveDeadline(entry);
      setIsDeadlineDialogOpen(true);
      return;
    }
    const event = entry.raw;
    setNewEvent({
      id: event.guid || event.id || "",
      title: event.event_name || "",
      email: event.email || "",
      date: event.date ? event.date.substring(0, 10) : "",
      from_time: formatTimeForSelect(event.from_time) || "",
      to_time: formatTimeForSelect(event.to_time) || "",
      description: event.description || "",
    });
    setOriginalSchedule({
      date: event.date ? event.date.substring(0, 10) : "",
      from_time: formatTimeForSelect(event.from_time) || "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleAddEvent = async () => {
    if (!validateForm()) return;
    const eventData = {
      firm_id: activeClientId || ownFirmId,
      event_name: newEvent.title,
      email: newEvent.email,
      date: newEvent.date,
      from_time: newEvent.from_time,
      to_time: newEvent.to_time,
      description: newEvent.description,
    };
    const result = await createEvent(eventData);
    if (result) {
      setIsDialogOpen(false);
      refreshEntries();
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;
    const eventData = {
      firm_id: activeClientId || ownFirmId,
      event_name: newEvent.title,
      email: newEvent.email,
      date: newEvent.date,
      from_time: newEvent.from_time,
      to_time: newEvent.to_time,
      description: newEvent.description,
    };
    const result = await editEvent(newEvent.id, eventData);
    if (result) {
      setIsDialogOpen(false);
      refreshEntries();
    }
  };

  const handleDeleteEvent = async () => {
    if (!newEvent.id) return;
    const result = await deleteEvent(newEvent.id);
    if (result) {
      setIsDeleteDialogOpen(false);
      setIsDialogOpen(false);
      refreshEntries();
    }
  };

  const eventPropGetter = useCallback(
    (entry) => {
      const shade = isDarkTheme ? entry.color.dark : entry.color.light;
      return {
        style: {
          backgroundColor: shade.bg,
          color: shade.text,
          borderLeft: `3px solid ${shade.border}`,
          borderRadius: 6,
        },
        className: entry.type === "deadline" ? "rbc-deadline-event" : "rbc-user-event",
      };
    },
    [isDarkTheme]
  );

  const calendarComponents = useMemo(() => ({
    toolbar: CalendarToolbar,
    event: EventContent,
  }), []);

  const isBusy = eventsLoading || entriesLoading;

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-300">
      <CalendarContext.Provider value={{ setCurrentDate, isAccountant }}>
      <div className="flex flex-row justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Calendar
            {isBusy && <Spinner className="w-5 h-5 text-primary" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your schedule and upcoming events.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button
            onClick={() => openCreateDialog(format(new Date(), "yyyy-MM-dd"))}
            disabled={isAccountant && !activeClientId}
            title={isAccountant && !activeClientId ? "Select exactly one client in the sidebar first" : undefined}
            className="flex items-center gap-2 shadow-xs transition-transform hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
          <DialogContent className="sm:max-w-[480px] border-border bg-background/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {isEditMode ? "Edit Event Details" : "Create New Event"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isAccountant && activeClientName && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium text-muted-foreground">Client</Label>
                  <div className="col-span-3 text-sm font-medium">{activeClientName}</div>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="col-span-3"
                  placeholder="Meeting with client"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right font-medium">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newEvent.email}
                  onChange={(e) => setNewEvent({ ...newEvent, email: e.target.value })}
                  className="col-span-3"
                  placeholder="testing@gmail.com"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right font-medium">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={todayDateStr()}
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="from_time" className="text-right font-medium">Start Time</Label>
                <div className="col-span-3">
                  <Select
                    value={newEvent.from_time || "none"}
                    onValueChange={(val) => setNewEvent({ ...newEvent, from_time: val === "none" ? "" : val })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      <SelectItem value="none">None (All day)</SelectItem>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time} disabled={isPastDateTime(newEvent.date, time)}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="to_time" className="text-right font-medium">End Time</Label>
                <div className="col-span-3">
                  <Select
                    value={newEvent.to_time || "none"}
                    onValueChange={(val) => setNewEvent({ ...newEvent, to_time: val === "none" ? "" : val })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      <SelectItem value="none">None</SelectItem>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time} disabled={isPastDateTime(newEvent.date, time)}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right font-medium mt-2">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="col-span-3 min-h-[80px]"
                  placeholder="Event description..."
                />
              </div>
            </div>
            <DialogFooter className="flex flex-row justify-between items-center w-full gap-2 sm:gap-0 mt-2">
              {isEditMode ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={eventsLoading}
                  className="flex items-center gap-1.5 cursor-pointer hover:bg-destructive/90"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={eventsLoading} className="cursor-pointer">
                  Cancel
                </Button>
                <Button onClick={isEditMode ? handleSaveEdit : handleAddEvent} disabled={eventsLoading} className="cursor-pointer">
                  {eventsLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  {isEditMode ? "Save Changes" : "Save Event"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-background/95 backdrop-blur-md border-border max-w-[440px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete Event
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground mt-2">
                Are you sure you want to delete the event <strong>{newEvent.title}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 flex gap-2">
              <AlertDialogCancel className="cursor-pointer" disabled={eventsLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteEvent();
                }}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer flex items-center gap-1.5"
                disabled={eventsLoading}
              >
                {eventsLoading && <Spinner className="w-4 h-4" />}
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isDeadlineDialogOpen} onOpenChange={setIsDeadlineDialogOpen}>
          <DialogContent className="sm:max-w-[440px] border-border bg-background/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-muted-foreground" />
                Deadline Details
              </DialogTitle>
            </DialogHeader>
            {activeDeadline && (
              <div className="flex flex-col gap-3 py-2">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Client</div>
                  <div className="text-sm font-medium">{activeDeadline.clientName}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Deadline</div>
                  <div className="text-sm font-medium">{activeDeadline.title}</div>
                  {activeDeadline.raw.deadline?.description && (
                    <div className="text-sm text-muted-foreground mt-0.5">{activeDeadline.raw.deadline.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Due Date</div>
                    <div className="text-sm font-medium">{format(activeDeadline.start, "MMM d, yyyy")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Status</div>
                    <span
                      className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        DEADLINE_STATUS_CLASSES[activeDeadline.raw.status] || DEADLINE_STATUS_CLASSES.pending
                      }`}
                    >
                      {activeDeadline.raw.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeadlineDialogOpen(false)} className="cursor-pointer">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <Card className="flex-1 min-w-0 w-full border-border shadow-md bg-card/60 backdrop-blur-xs overflow-hidden transition-all hover:shadow-lg">
          <CardContent className="p-3 md:p-4">
            <BigCalendar
              localizer={localizer}
              events={visibleEntries}
              date={currentDate}
              onNavigate={setCurrentDate}
              view={view}
              onView={setView}
              views={[Views.MONTH, Views.WEEK]}
              selectable
              popup
              scrollToTime={SCROLL_TO_7AM}
              style={{ height: 720 }}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter}
              components={calendarComponents}
            />
          </CardContent>
        </Card>

        {isAccountant && (
          <Card className="w-full lg:w-[320px] shrink-0 border-border shadow-md bg-card/60 backdrop-blur-xs">
            <CardHeader className="flex flex-col gap-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">All Client</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-created-events" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                    Show Created Events
                  </Label>
                  <Switch id="show-created-events" checked={showCreatedEvents} onCheckedChange={setShowCreatedEvents} />
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                onClick={toggleAllClients}
                className="flex items-center gap-2 cursor-pointer w-fit"
              >
                <Eye className="w-4 h-4" />
                All Clients
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 max-h-[560px] overflow-y-auto">
              {calendarClientsLoading ? (
                <div className="flex justify-center py-6"><Spinner className="w-5 h-5 text-primary" /></div>
              ) : filteredClientList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No clients found.</p>
              ) : (
                filteredClientList.map((client) => {
                  const color = colorForClient(client.id);
                  const checked = selectedClientIds.includes(client.id);
                  return (
                    <label
                      key={client.id}
                      className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/40 transition-colors cursor-pointer"
                    >
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                        style={{ backgroundColor: color.avatar }}
                      >
                        {getInitials(client.firm_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{client.firm_name}</span>
                        <span className="block text-xs text-muted-foreground truncate">{client.contact_email}</span>
                      </span>
                      <Checkbox checked={checked} onCheckedChange={() => toggleClient(client.id)} />
                    </label>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </CalendarContext.Provider>
    </div>
  );
};

export default CalendarBoard;
