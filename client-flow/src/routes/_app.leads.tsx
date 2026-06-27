import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import React, { useMemo, useState, useEffect } from "react";
import { Search, Filter, Download, Plus, MoreHorizontal, ChevronLeft, ChevronRight, Eye, Edit, ActivitySquare, Trash2, X, FileSpreadsheet, FileText, UploadCloud } from "lucide-react";
import { PageHeader, Card, AssignedUserSelect } from "@/crm/AppLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { LeadQuickView } from "@/components/LeadQuickView";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { statusColor, formatRelative, type LeadStatus, Lead } from "@/crm/data";
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/crm/api";
import { useCrmSettings } from "@/context/CrmSettingsContext";

export const Route = createFileRoute("/_app/leads")({
  head: () => ({ meta: [{ title: "Leads — Pulse CRM" }] }),
  component: LeadsLayout,
});

function LeadsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/leads") return <Outlet />;
  return <LeadsIndex />;
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



function LeadsIndex() {
  const { user } = useAuth();
  const { statuses: crmStatuses, sources: crmSources, activityTypes } = useCrmSettings();
  const statusFilters = ["All", ...crmStatuses.map(s => s.label)];
  const initialSearch = (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("search") : "") || "";
  const [q, setQ] = useState(initialSearch);
  const [refreshCount, setRefreshCount] = useState(0);
  const [liveLeads, setLiveLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [updatingLead, setUpdatingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const handleAdd = () => setRefreshCount(c => c + 1);
    window.addEventListener("leads-updated", handleAdd);

    // Listen to BroadcastChannel for cross-tab sync
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("crm-data-sync");
      channel.onmessage = (event) => {
        if (event.data === "leads-updated") {
          handleAdd();
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }

    // Listen to storage event (cross-tab fallback)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "leads-updated") {
        handleAdd();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("leads-updated", handleAdd);
      window.removeEventListener("storage", handleStorage);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  useEffect(() => {
    const fetchLeads = async (showLoading = false) => {
      try {
        if (showLoading) setIsLoading(true);
        const { data } = await ApiService.getLeads({ limit: 100 });
        setLiveLeads(data);
      } catch (err) {
        console.error("Failed to fetch leads", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeads(refreshCount === 0);
  }, [refreshCount]);

  const initialStatus = (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("status") : "All") as any;
  const [status, setStatus] = useState<string>(statusFilters.includes(initialStatus) ? initialStatus : "All");
  const [page, setPage] = useState(1);
  const perPage = 8;
  
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  const getStatusLabel = (leadStatus: string) => {
    const matched = crmStatuses.find(s => 
      s.label.toLowerCase() === leadStatus.toLowerCase() ||
      s.value.toLowerCase() === leadStatus.toLowerCase()
    );
    return matched ? matched.label : leadStatus;
  };

  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = { All: liveLeads.length };
    crmStatuses.forEach(s => {
      counts[s.label] = 0;
    });
    liveLeads.forEach(l => {
      const label = getStatusLabel(l.status);
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [liveLeads, crmStatuses]);

  const availableOwners = useMemo(() => {
    const owners = new Set(liveLeads.map(l => l.owner).filter(Boolean));
    return Array.from(owners);
  }, [liveLeads]);

  const filtered = useMemo(() => {
    return liveLeads.filter((l) => {
      const matchQ =
        !q ||
        l.name.toLowerCase().includes(q.toLowerCase()) ||
        l.company.toLowerCase().includes(q.toLowerCase()) ||
        l.email.toLowerCase().includes(q.toLowerCase());
      const matchS = status === "All" || getStatusLabel(l.status) === status;
      const matchO = ownerFilter === "All" || l.owner === ownerFilter;
      const matchSrc = sourceFilter === "All" || l.source === sourceFilter;
      
      let matchDate = true;
      if (dateFilter !== "All") {
        const leadDate = new Date(l.createdAt);
        const now = new Date();
        if (dateFilter === "Today") {
          matchDate = leadDate.toDateString() === now.toDateString();
        } else if (dateFilter === "This Week") {
          const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
          firstDay.setHours(0,0,0,0);
          matchDate = leadDate >= firstDay;
        } else if (dateFilter === "This Month") {
          matchDate = leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
        }
      }

      return matchQ && matchS && matchO && matchSrc && matchDate;
    });
  }, [q, status, ownerFilter, sourceFilter, dateFilter, liveLeads]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-[14px] font-medium text-muted-foreground">Loading leads...</p>
        </div>
      </div>
    );
  }

  const handleExport = (format: "csv" | "xlsx") => {
    try {
      if (filtered.length === 0) {
        toast.error("No data to export");
        return;
      }
      const data = filtered.map(l => ({
        "Lead ID": l.id,
        "Name": l.name,
        "Company": l.company,
        "Email": l.email,
        "Phone": l.phone,
        "Source": l.source,
        "Owner": l.owner,
        "Value": l.value,
        "Status": l.status,
        "Created At": new Date(l.createdAt).toLocaleString(),
        "Last Contact": new Date(l.lastContact).toLocaleString(),
        "Location": l.location || "",
        "Notes": l.notes || ""
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, `leads-export-${new Date().toISOString().split('T')[0]}.${format}`);
      toast.success(`Successfully exported ${filtered.length} leads`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export leads");
    }
  };

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${filtered.length} leads in your pipeline`}
        actions={
          <>
            {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
              <button 
                onClick={() => setShowImportModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[13px] font-semibold hover:bg-muted"
              >
                <UploadCloud className="h-4 w-4" /> Import CSV
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[13px] font-semibold hover:bg-muted">
                  <Download className="h-4 w-4" /> Export
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer font-medium text-[13px] py-2">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="cursor-pointer font-medium text-[13px] py-2">
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
              <button 
                onClick={() => (document.getElementById('new-lead-modal') as HTMLDialogElement)?.showModal()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-soft hover:opacity-95"
              >
                <Plus className="h-4 w-4" /> New Lead
              </button>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by name, company, or email"
              className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-[14px] outline-none focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => { 
                  setStatus(s); 
                  setPage(1); 
                  // Update URL without full reload so links stay shareable
                  const url = new URL(window.location.href);
                  if (s === "All") url.searchParams.delete("status");
                  else url.searchParams.set("status", s);
                  window.history.replaceState({}, "", url);
                }}
                className={[
                  "h-9 rounded-xl px-3 text-[13px] font-medium transition",
                  status === s
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "border border-border bg-card text-foreground/70 hover:bg-muted",
                ].join(" ")}
              >
                {s} ({countsByStatus[s] || 0})
              </button>
            ))}
          </div>
          <details className="relative inline-block text-left group">
            <summary className="list-none cursor-pointer inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
              <Filter className="h-4 w-4" /> More filters {(ownerFilter !== "All" || sourceFilter !== "All" || dateFilter !== "All") && <span className="flex h-2 w-2 rounded-full bg-primary" />}
            </summary>
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card p-4 shadow-xl flex flex-col gap-4 text-[13px] font-medium text-foreground">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-[12px] font-semibold uppercase tracking-wider">Filter by Owner</label>
                <select value={ownerFilter} onChange={e => { setOwnerFilter(e.target.value); setPage(1); }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-[13px] outline-none hover:bg-muted/50 cursor-pointer">
                  <option value="All">All Owners</option>
                  {availableOwners.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-[12px] font-semibold uppercase tracking-wider">Filter by Source</label>
                <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-[13px] outline-none hover:bg-muted/50 cursor-pointer">
                  <option value="All">All Sources</option>
                  {crmSources.map(s => <option key={s._id} value={s.label}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-[12px] font-semibold uppercase tracking-wider">Filter by Date Range</label>
                <select value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-[13px] outline-none hover:bg-muted/50 cursor-pointer">
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>
              {(ownerFilter !== "All" || sourceFilter !== "All" || dateFilter !== "All") && (
                <div className="pt-2 border-t border-border flex justify-end">
                  <button onClick={() => { setOwnerFilter('All'); setSourceFilter('All'); setDateFilter('All'); setPage(1); }} className="text-[12px] text-muted-foreground hover:text-foreground font-semibold">Clear Filters</button>
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[14px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Owner</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Value</th>
                <th className="px-5 py-3 font-medium">Last contact</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="mx-auto max-w-xs">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--tint-blue)]">
                        <Search className="h-6 w-6 text-[#1d4ed8]" />
                      </div>
                      <h4 className="mt-3 font-semibold">No leads found</h4>
                      <p className="mt-1 text-[13px] text-muted-foreground">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              )}
              {pageItems.map((l) => (
                <React.Fragment key={l.id}>
                  <tr 
                    onClick={() => setExpandedLeadId(expandedLeadId === l.id ? null : l.id)}
                    className={`border-b border-border last:border-0 transition-colors cursor-pointer ${expandedLeadId === l.id ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--tint-blue)] text-[12px] font-semibold text-[#1d4ed8]">
                          {l.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{l.name}</div>
                          <div className="truncate text-[12px] text-muted-foreground">{l.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{l.company}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l.source}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l.owner}</td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <InteractiveStatusSelect lead={l} baseClass="appearance-none cursor-pointer border-none outline-none rounded-full px-2.5 py-0.5 pr-6 text-[12px] font-bold bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_6px_center] bg-no-repeat" />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">₹{l.value.toLocaleString()}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatRelative(l.lastContact)}</td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 font-medium text-[13px]">
                          <DropdownMenuItem onClick={() => setExpandedLeadId(expandedLeadId === l.id ? null : l.id)} className="cursor-pointer py-1.5 px-3">
                            <Eye className="h-4 w-4 text-muted-foreground mr-2"/> {expandedLeadId === l.id ? 'Close Quick View' : 'Open Quick View'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingLead(l); setTimeout(() => (document.getElementById('edit-lead-modal-list') as HTMLDialogElement)?.showModal(), 50); }} className="cursor-pointer py-1.5 px-3">
                            <Edit className="mr-2 h-4 w-4 text-muted-foreground"/> Edit Lead
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setUpdatingLead(l); setTimeout(() => (document.getElementById('update-activity-modal-list') as HTMLDialogElement)?.showModal(), 50); }} className="cursor-pointer py-1.5 px-3">
                            <ActivitySquare className="mr-2 h-4 w-4 text-muted-foreground"/> Update Activity
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-border" />
                          <DropdownMenuItem 
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this lead?")) {
                                try {
                                  await ApiService.deleteLead(l.id);
                                  setRefreshCount(c => c + 1);
                                  triggerLeadSync();
                                  toast.success("Lead deleted");
                                } catch (e) {
                                  console.error(e);
                                  toast.error("Failed to delete lead");
                                }
                              }
                            }}
                            className="cursor-pointer py-1.5 px-3 text-red-500 focus:bg-red-50 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4"/> Delete Lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                  {expandedLeadId === l.id && (
                    <tr className="border-b border-border bg-background">
                      <td colSpan={8} className="p-0">
                        <div className="overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
                          <LeadQuickView 
                            leadId={l.id} 
                            onClose={() => setExpandedLeadId(null)} 
                            onEdit={(lead) => { 
                              setEditingLead(lead); 
                              setTimeout(() => (document.getElementById('edit-lead-modal-list') as HTMLDialogElement)?.showModal(), 50); 
                            }}
                            onUpdate={() => setRefreshCount(c => c + 1)}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-[13px]">
          <span className="text-muted-foreground">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card disabled:opacity-40 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={[
                  "h-9 min-w-9 rounded-lg px-3 text-[13px] font-medium",
                  page === i + 1 ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted",
                ].join(" ")}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card disabled:opacity-40 hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {editingLead && (
        <dialog id="edit-lead-modal-list" className="m-auto backdrop:bg-foreground/40 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl border-0 p-0 w-full max-w-lg bg-card open:animate-in open:fade-in-90 open:zoom-in-95">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="text-[18px] font-bold text-foreground">Edit Lead</h2>
            <form method="dialog">
              <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </form>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setSaveError(null);
            const formData = new FormData(e.currentTarget);
            try {
              await ApiService.updateLead(editingLead.id, {
                name: formData.get("name") as string,
                company: formData.get("company") as string,
                phone: formData.get("phone") as string,
                location: formData.get("location") as string,
                source: formData.get("source") as string,
                assignedUser: formData.get("owner") as string,
                value: Number(formData.get("value") || 0),
                notes: formData.get("notes") as string
              });
              (document.getElementById('edit-lead-modal-list') as HTMLDialogElement)?.close();
              setEditingLead(null);
              setRefreshCount(c => c + 1);
              triggerLeadSync();
            } catch(err: any) {
              setSaveError(err?.response?.data?.error || err?.message || 'Failed to save. Please try again.');
              console.error(err);
            } finally {
              setSaving(false);
            }
          }}>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Lead Name <span className="text-red-500">*</span></label>
                  <input name="name" defaultValue={editingLead.name} required type="text" className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Company Name <span className="text-red-500">*</span></label>
                  <input name="company" defaultValue={editingLead.company} required type="text" className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Phone Number <span className="text-red-500">*</span></label>
                  <input name="phone" defaultValue={editingLead.phone} required type="tel" className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Location</label>
                  <input name="location" defaultValue={editingLead.location} placeholder="Optional location update" type="text" className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Lead Source <span className="text-red-500">*</span></label>
                  <select name="source" defaultValue={editingLead.source} required className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
                    {crmSources.map(s => <option key={s._id} value={s.label}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Deal Value (₹) <span className="text-red-500">*</span></label>
                  <input name="value" defaultValue={editingLead.value} required type="number" min="0" placeholder="e.g. 50000" className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Assigned User <span className="text-red-500">*</span></label>
                <AssignedUserSelect name="owner" required defaultValue={editingLead.ownerId || ""} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Notes</label>
                <textarea name="notes" defaultValue={editingLead.notes} placeholder="Any initial notes or requirements..." className="w-full rounded-[10px] border border-input bg-background p-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px]"></textarea>
              </div>
            </div>
            {saveError && (
              <div className="mx-5 mb-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-[13px] text-red-700 font-medium">{saveError}</div>
            )}
            <div className="border-t border-border p-5 flex justify-end gap-3 bg-muted/40 rounded-b-[14px]">
              <button type="button" onClick={() => { (document.getElementById('edit-lead-modal-list') as HTMLDialogElement)?.close(); setEditingLead(null); setSaveError(null); }} className="h-10 rounded-[10px] px-4 text-[13px] font-semibold text-foreground hover:bg-muted transition-colors border border-border bg-card shadow-sm">Cancel</button>
              <button type="submit" disabled={saving} className="h-10 rounded-[10px] bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition-opacity disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </dialog>
      )}

      {updatingLead && (
        <dialog id="update-activity-modal-list" className="m-auto backdrop:bg-foreground/40 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl border-0 p-0 w-full max-w-lg bg-card open:animate-in open:fade-in-90 open:zoom-in-95">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="text-[18px] font-bold text-foreground">Update Lead & Log Activity</h2>
            <form method="dialog">
              <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </form>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setSaveError(null);
            const formData = new FormData(e.currentTarget);
            try {
              const actionTaken = formData.get('actionTaken') as string;
              const followUpDate = formData.get('followUpDate') as string;
              const summary = formData.get('summary') as string;
              const notes = formData.get('notes') as string;
              const status = formData.get('status') as string;
              await ApiService.logLeadActivity(updatingLead.id, {
                actionTaken: actionTaken || undefined,
                summary: summary || undefined,
                followUpDate: followUpDate || undefined,
                notes: notes || undefined,
                status: status || undefined
              });
              (document.getElementById('update-activity-modal-list') as HTMLDialogElement)?.close();
              setUpdatingLead(null);
              setRefreshCount(c => c + 1);
              triggerLeadSync();
            } catch(err: any) {
              setSaveError(err?.response?.data?.error || err?.message || 'Failed to save activity. Please try again.');
              console.error(err);
            } finally {
              setSaving(false);
            }
          }}>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Action Taken Today</label>
                  <select name="actionTaken" className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
                    <option value="">-- None --</option>
                    {activityTypes.map(a => <option key={a._id} value={a.label}>{a.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Lead Status</label>
                  <select name="status" defaultValue={updatingLead.status} className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
                    {crmStatuses.map(s => <option key={s._id} value={s.label}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Discussion Summary</label>
                <textarea name="summary" placeholder="Brief summary of the interaction..." className="w-full rounded-[10px] border border-input bg-background p-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary min-h-[60px]"></textarea>
              </div>
              <div className="space-y-1.5 border-t border-border pt-4">
                <label className="text-[13px] font-medium text-foreground">Next Follow-Up Date</label>
                <input name="followUpDate" type="datetime-local" className="h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Internal Notes</label>
                <textarea name="notes" placeholder="Notes for next follow-up or internal team..." className="w-full rounded-[10px] border border-input bg-background p-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px]"></textarea>
              </div>
            </div>
            {saveError && (
              <div className="mx-5 mb-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-[13px] text-red-700 font-medium">{saveError}</div>
            )}
            <div className="border-t border-border p-5 flex justify-end gap-3 bg-muted/40 rounded-b-[14px]">
              <button type="button" onClick={() => { (document.getElementById('update-activity-modal-list') as HTMLDialogElement)?.close(); setUpdatingLead(null); setSaveError(null); }} className="h-10 rounded-[10px] px-4 text-[13px] font-semibold text-foreground hover:bg-muted transition-colors border border-border bg-card shadow-sm">Cancel</button>
              <button type="submit" disabled={saving} className="h-10 rounded-[10px] bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition-opacity disabled:opacity-60">{saving ? 'Saving...' : 'Save & Log Activity'}</button>
            </div>
          </form>
        </dialog>
      )}

      {showImportModal && (
        <ImportCsvModal 
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => {
            setShowImportModal(false);
            setRefreshCount(c => c + 1);
            triggerLeadSync();
          }} 
        />
      )}
    </div>
  );
}