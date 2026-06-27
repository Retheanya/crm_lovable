import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Search, Download, UserPlus, Edit, Users, PhoneCall, Send,
  MessageCircle, CalendarClock, CheckCircle2, XCircle, RefreshCw, Activity, FileText, Target, Pencil, User, MessageSquare, Trophy, Calendar, CheckCircle
} from "lucide-react";
import { Card } from "@/crm/AppLayout";
import { ApiService } from "@/crm/api";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({ meta: [{ title: "Activity Timeline — Pulse CRM" }] }),
  component: ActivityTimelinePage,
});

function getActivityIcon(type: string, description: string = '') {
  const desc = description.toLowerCase();
  
  if (type === 'USER_CREATED') {
    return {
      icon: User,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      label: 'User Created'
    };
  }
  if (type === 'LEAD_CREATED') {
    return {
      icon: UserPlus,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      label: 'Lead Added'
    };
  }
  if (type === 'LEAD_UPDATED') {
    return {
      icon: Pencil,
      color: 'text-violet-600 bg-violet-50 border-violet-200',
      label: 'Lead Updated'
    };
  }
  if (type === 'LEAD_ASSIGNED' || type === 'LEAD_REASSIGNED') {
    return {
      icon: User,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      label: type === 'LEAD_ASSIGNED' ? 'Lead Assigned' : 'Lead Reassigned'
    };
  }
  if (type === 'STATUS_CHANGED') {
    return {
      icon: RefreshCw,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      label: 'Status Changed'
    };
  }
  if (type === 'COMMUNICATION_ADDED') {
    if (desc.includes('meeting')) {
      return {
        icon: Calendar,
        color: 'text-pink-600 bg-pink-50 border-pink-200',
        label: 'Meeting Scheduled'
      };
    }
    if (desc.includes('email')) {
      return {
        icon: Send,
        color: 'text-sky-600 bg-sky-50 border-sky-200',
        label: 'Email Sent'
      };
    }
    if (desc.includes('whatsapp')) {
      return {
        icon: MessageSquare,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        label: 'WhatsApp Sent'
      };
    }
    if (desc.includes('call')) {
      return {
        icon: PhoneCall,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        label: 'Call Logged'
      };
    }
    // Default Note Added
    return {
      icon: MessageSquare,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      label: 'Note Added'
    };
  }
  if (type === 'FOLLOWUP_ADDED' || type === 'FOLLOWUP_UPDATED') {
    // Task Created
    return {
      icon: CheckCircle,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      label: type === 'FOLLOWUP_ADDED' ? 'Task Created' : 'Task Updated'
    };
  }
  if (type === 'LEAD_CLOSED') {
    return {
      icon: Trophy,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      label: 'Deal Won'
    };
  }
  if (type === 'LEAD_LOST') {
    return {
      icon: XCircle,
      color: 'text-red-600 bg-red-50 border-red-200',
      label: 'Deal Lost'
    };
  }
  if (type === 'Site visit' || desc.includes('site visit')) {
    return {
      icon: Target,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      label: 'Site Visit'
    };
  }

  return {
    icon: Activity,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    label: type?.replace(/_/g, ' ') || 'Activity'
  };
}

const FILTER_TYPES = [
  { value: "ALL", label: "All Types" },
  { value: "LEAD_CREATED", label: "Lead Created" },
  { value: "LEAD_UPDATED", label: "Lead Updated" },
  { value: "LEAD_ASSIGNED", label: "Lead Assigned" },
  { value: "STATUS_CHANGED", label: "Status Changed" },
  { value: "COMMUNICATION_ADDED", label: "Communication" },
  { value: "FOLLOWUP_ADDED", label: "Follow-Up Scheduled" },
  { value: "LEAD_CLOSED", label: "Lead Closed" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateGroup(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getDateKey(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ─── Main component ───────────────────────────────────────────────────────────

function ActivityTimelinePage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Re-fetch from server whenever type or date range changes
  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params: any = { limit: 500 };
        if (filterType !== "ALL") params.activityType = filterType;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        const res = await ApiService.getAllActivities(params);
        setActivities(res.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to load activities.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivities();
  }, [filterType, fromDate, toDate]);

  // Client-side: only text search (type+date filtering is server-side)
  const filtered = useMemo(() => {
    if (!searchQuery) return activities;
    const q = searchQuery.toLowerCase();
    return activities.filter(act =>
      act.description?.toLowerCase().includes(q)
      || act.leadId?.leadName?.toLowerCase().includes(q)
      || act.leadId?.companyName?.toLowerCase().includes(q)
      || act.performedBy?.name?.toLowerCase().includes(q)
      || act.activityType?.toLowerCase().includes(q)
    );
  }, [activities, searchQuery]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const act of filtered) {
      const key = getDateKey(act.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(act);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      dateKey: key,
      dateLabel: formatDateGroup(items[0].createdAt),
      items,
    }));
  }, [filtered]);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted-foreground mb-1 font-medium">
            Admin <span className="mx-1">/</span> <span className="font-semibold text-foreground">Activity Timeline</span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight sm:text-[26px] text-foreground">Activity Timeline</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Audit trail of all CRM actions — {activities.length} total events
          </p>
        </div>
        <button
          onClick={() => {
            const csv = ["Date,User,Type,Lead,Description"]
              .concat(filtered.map(a =>
                `"${new Date(a.createdAt).toLocaleString()}","${a.performedBy?.name || 'System'}","${a.activityType}","${a.leadId?.leadName || ''}","${a.description?.replace(/"/g, '""')}"`
              ))
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a"); link.href = url;
            link.download = `activity-timeline-${Date.now()}.csv`; link.click();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-[14px] font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground sm:mt-4"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lead, user, or description..."
              className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-4 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 pr-8 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
          >
            {FILTER_TYPES.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {/* Date range filters */}
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-muted-foreground font-medium whitespace-nowrap">From</label>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-muted-foreground font-medium whitespace-nowrap">To</label>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          {(searchQuery || filterType !== "ALL" || fromDate || toDate) && (
            <button
              onClick={() => { setSearchQuery(""); setFilterType("ALL"); setFromDate(""); setToDate(""); }}
              className="h-10 px-3 rounded-lg border border-input bg-background text-[13px] text-muted-foreground hover:bg-muted transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-[14px] text-muted-foreground">Loading activity timeline...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="p-8 text-center">
            <p className="text-[14px] text-red-500 font-medium">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-[15px] font-medium text-muted-foreground">No activities found</p>
            <p className="text-[13px] text-muted-foreground/70 mt-1">
              {activities.length === 0
                ? "Activities are generated automatically when leads are created, updated, or actioned."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        )}

        {/* Timeline */}
        {!isLoading && !error && grouped.length > 0 && (
          <div className="p-5 space-y-8">
            {grouped.map(({ dateLabel, items }) => (
              <div key={dateLabel}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-border" />
                  <div className="flex items-center gap-2 rounded-full bg-muted border border-border px-4 py-1.5">
                    <span className="text-[12px] font-bold tracking-wide text-foreground">{dateLabel}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5">
                      {items.length} event{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Timeline entries */}
                <div className="relative">
                  {/* Connector line */}
                  <div className="absolute left-[17px] top-0 bottom-0 w-px bg-border" />

                  <div className="space-y-0">
                    {items.map((act, idx) => {
                      const config = getActivityIcon(act.activityType, act.description);
                      const Icon = config.icon;

                      return (
                        <div key={act._id} className="relative flex gap-4 pb-5 last:pb-0">
                          {/* Icon dot */}
                          <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Content card */}
                          <div className="flex-1 min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${config.color}`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {config.label}
                                </span>
                                {act.leadId?.leadName && (
                                  <span className="text-[13px] font-semibold text-[#2563eb]">
                                    {act.leadId.leadName}
                                  </span>
                                )}
                                {act.leadId?.companyName && (
                                  <span className="text-[12px] text-muted-foreground">
                                    · {act.leadId.companyName}
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 text-[12px] text-muted-foreground font-medium">
                                {formatTime(act.createdAt)}
                              </span>
                            </div>

                            <p className="mt-2 text-[13px] text-[#475569] leading-relaxed">{act.description}</p>

                            <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                              {/* Performed by */}
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                  {(act.performedBy?.name || "S")[0].toUpperCase()}
                                </span>
                                <span className="text-[12px] font-medium text-foreground">
                                  {act.performedBy?.name || "System"}
                                </span>
                              </div>

                              {/* Assigned to (for LEAD_ASSIGNED) */}
                              {act.newUser?.name && (
                                <span className="text-[12px] text-muted-foreground">
                                  → <span className="font-medium text-foreground">{act.newUser.name}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Total footer */}
            <div className="pt-4 border-t border-border text-center">
              <p className="text-[13px] text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
                <span className="font-semibold text-foreground">{activities.length}</span> total events
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}