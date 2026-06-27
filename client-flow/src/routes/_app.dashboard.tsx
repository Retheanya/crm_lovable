import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users, UserPlus, PhoneCall, CalendarClock, CheckCircle2, Target, Briefcase,
  ArrowUpRight, ArrowDownRight, ChevronDown, DollarSign, Phone, Send, Calendar, FileText, ChevronLeft, ChevronRight, MoreVertical, AlertCircle, Clock, Bell,
  MessageCircle, Activity, Edit, XCircle, RefreshCw, Pencil, User, MessageSquare, Trophy, CheckCircle
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { PageHeader, Card } from "@/crm/AppLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { activities, activityLogs, sourceBreakdown, formatRelative, statusColor } from "@/crm/data";
import { ApiService } from "@/crm/api";
import { Lead } from "@/crm/data";
import { useEffect } from "react";
import { useCrmSettings } from "@/context/CrmSettingsContext";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Pulse CRM" }] }),
  component: Dashboard,
});

const PIE_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444"];

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

const buildKpis = (summary: any, statuses: any[]) => {
  const kpis = [
    { label: "Total Leads", value: summary?.totalLeads ?? 0, icon: Users, tint: "bg-[var(--tint-blue)]", iconColor: "text-[#1d4ed8]", to: "/leads" }
  ];

  const icons = [UserPlus, PhoneCall, CalendarClock, CheckCircle2, Target, Trophy];
  const tints = ["bg-[var(--tint-green)]", "bg-[var(--tint-orange)]", "bg-[var(--tint-orange)]", "bg-[var(--tint-green)]", "bg-purple-50", "bg-yellow-50"];
  const iconColors = ["text-[#166534]", "text-[#9a3412]", "text-[#9a3412]", "text-[#166534]", "text-purple-600", "text-yellow-600"];

  statuses.slice(0, 4).forEach((status, idx) => {
    // statusCounts keys are the exact label strings stored in DB (e.g. "New", "Contacted", "Follow-Up")
    const count = summary?.statusCounts?.[status.label] ?? 0;
    kpis.push({
      label: status.label,
      value: count,
      icon: icons[idx % icons.length],
      tint: tints[idx % tints.length],
      iconColor: iconColors[idx % iconColors.length],
      to: `/leads?status=${encodeURIComponent(status.label)}`
    });
  });

  kpis.push({ label: "My Assigned Leads", value: summary?.myLeads ?? 0, icon: Briefcase, tint: "bg-[var(--tint-blue)]", iconColor: "text-[#1d4ed8]", to: "/leads" });
  return kpis;
};

function ActionMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl font-medium text-[13px]">
        <DropdownMenuItem onClick={(e) => alert('Edit triggered')} className="cursor-pointer py-1.5">
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => alert('Settings opened')} className="cursor-pointer py-1.5">
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-border" />
        <DropdownMenuItem onClick={(e) => alert('Delete triggered')} className="cursor-pointer py-1.5 text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/30">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function triggerLeadSync() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("leads-updated"));
  try {
    const channel = new BroadcastChannel("crm-data-sync");
    channel.postMessage("leads-updated");
    channel.close();
  } catch (err) {
    try {
      localStorage.setItem("leads-updated", Date.now().toString());
    } catch (e) {}
  }
}

function InteractiveStatusSelect({ lead, baseClass }: { lead: any, baseClass: string }) {
  const [status, setStatus] = useState(lead.status);
  const { statuses } = useCrmSettings();

  useEffect(() => {
    setStatus(lead.status);
  }, [lead.status]);

  return (
    <select 
      className={`${baseClass} ${statusColor(status)}`}
      value={status}
      onChange={async (e) => {
        const newStatus = e.target.value;
        const oldStatus = status;
        setStatus(newStatus);
        lead.status = newStatus;
        try {
          await ApiService.updateLeadStatus(lead.id, newStatus);
          triggerLeadSync();
        } catch (err) {
          console.error("Failed to update status", err);
          setStatus(oldStatus);
          lead.status = oldStatus;
        }
      }}
    >
      {statuses.map(s => <option key={s._id} value={s.label} className="bg-background text-foreground">{s.label}</option>)}
    </select>
  );
}

function Dashboard() {
  const { statuses, sources } = useCrmSettings();
  const { user } = useAuth();
  const [recentLeadsFilter, setRecentLeadsFilter] = useState("This Week");
  const [timeframe, setTimeframe] = useState("This Month");
  const [pipelineRange, setPipelineRange] = useState("weekly");
  const [summary, setSummary] = useState<any>(null);
  const [liveLeads, setLiveLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const sum = await ApiService.getDashboardSummary(pipelineRange);
        setSummary(sum);
        const { data } = await ApiService.getLeads({ limit: 50 });
        setLiveLeads(data);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();

    const handleUpdate = () => {
      fetchDashboard();
    };

    window.addEventListener("leads-updated", handleUpdate);

    // Listen to BroadcastChannel for cross-tab sync
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("crm-data-sync");
      channel.onmessage = (event) => {
        if (event.data === "leads-updated") {
          handleUpdate();
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }

    // Listen to storage event (cross-tab fallback)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "leads-updated") {
        handleUpdate();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("leads-updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
      if (channel) {
        channel.close();
      }
    };
  }, [pipelineRange]);

  const now = Date.now();
  const filteredLeads = liveLeads.filter(l => {
    if (recentLeadsFilter === "All Time") return true;
    const date = new Date(l.createdAt);
    const diff = now - date.getTime();
    if (recentLeadsFilter === "Today") return diff <= 86400000;
    if (recentLeadsFilter === "This Week") return diff <= 86400000 * 7;
    if (recentLeadsFilter === "This Month") return diff <= 86400000 * 30;
    return true;
  });

  const recentLeadsMapped = filteredLeads.slice(0, 10).map((l, index) => {
    const score = 60 + (index * 7 + l.name.length * 3) % 40; 
    const scoreColor = score > 80 ? "#22c55e" : score > 60 ? "#f97316" : "#ef4444";
    return {
      ...l,
      initials: l.avatar,
      statusColor: statusColor(l.status),
      score: score,
      scoreColor: scoreColor,
      assigned: `https://i.pravatar.cc/150?u=${l.owner.replace(/\s/g, '')}`,
      lastActivityTime: formatRelative(l.lastContact),
      nextFollowUpDate: index % 2 === 0 ? "Tomorrow" : "Today",
      nextFollowUpTime: "10:30 AM"
    };
  });

  const PIE_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#ec4899", "#14b8a6", "#8b5cf6"];
  
  const activeSourceLabels = new Set(sources.map(s => s.label.toLowerCase()));
  const activeSourceValues = new Set(sources.map(s => s.value.toLowerCase()));

  const initialBreakdown = sources.map((s, i) => {
    const value = summary?.sourceCounts?.[s.value] || summary?.sourceCounts?.[s.label] || 0;
    return {
      name: s.label,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length]
    };
  });

  let colorIdx = sources.length;
  Object.entries(summary?.sourceCounts || {}).forEach(([key, val]) => {
    const count = Number(val);
    if (count > 0 && !activeSourceLabels.has(key.toLowerCase()) && !activeSourceValues.has(key.toLowerCase())) {
      const isAlreadyAdded = initialBreakdown.some(s => s.name.toLowerCase() === key.toLowerCase());
      if (!isAlreadyAdded) {
        initialBreakdown.push({
          name: key,
          value: count,
          color: PIE_COLORS[colorIdx % PIE_COLORS.length]
        });
        colorIdx++;
      }
    }
  });

  const sourceBreakdownLive = initialBreakdown.filter(s => s.value > 0);
  if (sourceBreakdownLive.length === 0) {
    sourceBreakdownLive.push({ name: "Website", value: 1, color: "#8b5cf6" });
  }

  const totalSource = sourceBreakdownLive.reduce((acc, curr) => acc + curr.value, 0) || 1;

  const kpis = buildKpis(summary, statuses);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-[14px] font-medium text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name ?? 'there'}. Here's what's happening today.`}
        actions={
          <span className="text-[13px] text-muted-foreground font-medium hidden sm:inline-block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        }
      />

      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              to={k.to}
              className="block"
            >
              <Card className="p-5 flex flex-col h-full rounded-[12px] transition-all hover:-translate-y-0.5 hover:shadow-soft cursor-pointer border border-border bg-card">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] ${k.tint} ${k.iconColor} shadow-sm mb-4`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="text-[26px] font-bold tracking-tight text-foreground leading-none mb-1.5">{k.value}</div>
                <div className="text-[13px] font-medium text-muted-foreground">{k.label}</div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pipeline Overview - SVG Trapezoid Funnel */}
        <Card className="p-5 lg:col-span-2 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-[#1e293b]">Pipeline Overview</h3>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8 pt-8 pb-2 flex-1">
            {/* SVG Funnel */}
            <div className="shrink-0">
              <svg width="220" height="260" viewBox="0 0 220 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* New Leads - widest */}
                <polygon points="10,0 210,0 175,60 45,60" fill="#3b82f6" />
                {/* Contacted */}
                <polygon points="45,64 175,64 150,124 70,124" fill="#60a5fa" />
                {/* Follow-Up */}
                <polygon points="70,128 150,128 130,188 90,188" fill="#fbbf24" />
                {/* Closed Won */}
                <polygon points="90,192 130,192 115,252 105,252" fill="#34d399" />
              </svg>
            </div>
            {/* Legend */}
            <div className="flex-1 w-full space-y-4">
              {statuses.slice(0,4).map((stage, idx) => {
                const colors = ["#3b82f6", "#60a5fa", "#fbbf24", "#34d399"];
                const dotBgs = ["bg-blue-500", "bg-blue-400", "bg-yellow-400", "bg-emerald-400"];
                const value = summary?.statusCounts?.[stage.value] || summary?.statusCounts?.[stage.label] || summary?.statusCounts?.[stage.label.toUpperCase().replace(/[\s-]+/g, '_')] || 0;
                const total = Math.max((summary?.totalLeads || 0), 1);
                const pct = ((value / total) * 100).toFixed(1);
                return (
                  <div key={stage.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 rounded-full shrink-0 ${dotBgs[idx % dotBgs.length]}`} />
                      <span className="text-[14px] text-[#475569] font-medium">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#1e293b]">{value}</span>
                      <span className="text-[13px] text-muted-foreground">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Lead Sources */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#1e293b]">Lead Sources</h3>
              <p className="text-[13px] text-muted-foreground">Distribution across channels</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sourceBreakdownLive} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                  {sourceBreakdownLive.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 500, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} itemStyle={{ color: '#1e293b', fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-3">
            {sourceBreakdownLive.map((s, i) => (
              <li key={s.name} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-[#475569]">{s.name}</span>
                </span>
                <span className="font-bold text-[#1e293b]">{s.value} <span className="font-normal text-muted-foreground ml-1">({Math.round((s.value / totalSource) * 100)}%)</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Recent Leads */}
        <Card className="p-5 xl:col-span-2 overflow-hidden flex flex-col justify-start">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-[#1e293b]">Recent Leads</h3>
            <div className="flex items-center gap-3">
              <select 
                value={recentLeadsFilter} 
                onChange={(e) => setRecentLeadsFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-[12px] font-medium outline-none"
              >
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="All Time">All Time</option>
              </select>
              <Link to="/leads" className="text-[13px] font-semibold text-[#2563eb] hover:underline">View All</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4 lg:hidden">
            {recentLeadsMapped.map((l) => (
              <div key={l.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition hover:shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e0e7ff] text-[14px] font-bold text-[#4f46e5]">
                    {l.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to="/leads/$id" params={{ id: l.id }} className="font-bold text-[#1e293b] hover:underline">{l.name}</Link>
                      <span className="text-[12px] text-[#64748b]">· {l.company}</span>
                      <div className="relative inline-block">
                        <InteractiveStatusSelect lead={l} baseClass="appearance-none cursor-pointer border-none outline-none rounded-full px-2 py-0.5 pr-5 text-[11px] font-bold bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_4px_center] bg-no-repeat" />
                      </div>
                    </div>
                    <p className="mt-1 text-[13px] text-[#64748b] truncate">{l.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px]">
                       <div className="flex items-center gap-1.5">
                         <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: `conic-gradient(${l.scoreColor} ${l.score}%, #f1f5f9 0)`, padding: '1px' }}>
                           <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[8px]" style={{ color: l.scoreColor }}></div>
                         </div>
                         <span className="font-medium text-[#64748b]">Score: <span className="text-[#1e293b]">{l.score}</span></span>
                       </div>
                       <div className="flex items-center gap-1.5">
                         <span className="text-[#64748b]">Created:</span>
                         <span className="font-medium text-[#1e293b]">{new Date(l.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block -mx-5 overflow-x-auto mt-4">
            <table className="w-full min-w-[900px] text-[14px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLeadsMapped.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Link to="/leads/$id" params={{ id: l.id }} className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--tint-blue)] text-[12px] font-semibold text-[#1d4ed8]">
                          {l.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{l.name}</div>
                          <div className="truncate text-[12px] text-muted-foreground">{l.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{l.company}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l.source}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l.owner}</td>
                    <td className="px-5 py-3">
                      <div className="relative inline-block">
                        <InteractiveStatusSelect lead={l} baseClass="appearance-none cursor-pointer border-none outline-none rounded-full px-2.5 py-0.5 pr-6 text-[12px] font-bold bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_6px_center] bg-no-repeat" />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(l.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="pt-4 flex items-center justify-between text-[13px] text-[#64748b] px-2 border-t border-border mt-4">
            <div className="font-medium">Showing latest {recentLeadsMapped.length} leads</div>
            <Link to="/leads" className="text-[#2563eb] hover:underline font-semibold">View All Leads</Link>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-0 flex flex-col h-full overflow-hidden xl:col-span-1">
          <div className="p-5 flex items-center justify-between border-b border-border">
            <h3 className="text-[16px] font-semibold text-[#1e293b]">Recent Activity</h3>
            <div className="flex items-center gap-2">
              <Link to="/activity" className="text-[13px] font-semibold text-[#2563eb] hover:underline">View All</Link>
              <ActionMenu />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-5">
            <div className="relative">
              {(summary?.recentActivities || []).slice(0, 5).length > 0 && (
                <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />
              )}
              <div className="space-y-0">
                {(summary?.recentActivities || []).slice(0, 5).map((log: any) => {
                  const { icon: Icon, color, label } = getActivityIcon(log.activityType, log.description);
                  const timeStr = new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={log._id} className="relative flex items-start gap-4 pb-6 last:pb-0 group">
                      <div className={`relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center bg-card rounded-full border-2 ${color} transition-colors`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-[#1e293b]">
                          <span>{log.performedBy?.name || 'System'}</span>
                          <span className="font-normal text-muted-foreground ml-1.5 capitalize">
                            {label.toLowerCase()}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-[#475569] line-clamp-2">{log.description}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <Link to="/leads/$id" params={{ id: log.leadId?._id || '1' }} className="font-medium text-[#2563eb] hover:underline">
                            {log.leadId?.leadName || 'Leads'}
                          </Link>
                          <span>•</span>
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {(!summary?.recentActivities || summary.recentActivities.length === 0) && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-[14px] font-medium text-muted-foreground">No recent activities</p>
                <p className="text-[13px] text-muted-foreground/70 mt-1">Activity will appear here as leads are updated</p>
              </div>
            )}
          </div>
          <div className="p-4 text-center border-t border-border">
            <Link to="/activity" className="text-[14px] font-semibold text-[#2563eb] hover:underline">View All Activity</Link>
          </div>
        </Card>
      </div>

      <div className="mt-6 mb-6">
        {/* Weekly Pipeline Chart */}
        <Card className="p-6 flex flex-col w-full">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#1e293b]">Pipeline Trend</h3>
              <p className="text-[13px] text-[#64748b] mt-0.5">Leads generated vs deals closed</p>
            </div>
            <select 
              value={pipelineRange} 
              onChange={(e) => setPipelineRange(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-[12px] font-medium outline-none cursor-pointer"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex-1 w-full pt-2">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={summary?.weeklyPipeline || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="leads" name="Leads Generated" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="closed" name="Deals Closed" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorClosed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

    </div>
  );
}