import { useState, useEffect } from "react";
import { Mail, Phone, Calendar, IndianRupee, Activity as ActivityIcon, PhoneCall, CalendarClock, Users, Sparkles, X, UserCircle2, MapPin, Target, RefreshCw, PlusCircle, Edit2, StickyNote, CheckCircle, XCircle, Loader2, MessageCircle, AlertTriangle, Check, Trash2, Edit3, Clock } from "lucide-react";
import { ApiService } from "@/crm/api";
import { useCrmSettings } from "@/context/CrmSettingsContext";
import { statusColor, formatRelative, Lead } from "@/crm/data";
import { toast } from "sonner";

const getActivityIconAndColor = (type: string, title: string) => {
  const t = (type || '').toUpperCase();
  const name = (title || '').toUpperCase();

  if (t.includes('WHATSAPP') || name.includes('WHATSAPP')) return { icon: MessageCircle, tint: "bg-teal-100", color: "text-teal-600" };
  if (t.includes('COMMUNICATION') || t.includes('CALL') || name.includes('CALL')) return { icon: PhoneCall, tint: "bg-green-100", color: "text-green-600" };
  if (t.includes('MEETING') || name.includes('MEETING') || name.includes('DEMO')) return { icon: Calendar, tint: "bg-blue-100", color: "text-blue-600" };
  if (t.includes('EMAIL') || name.includes('EMAIL')) return { icon: Mail, tint: "bg-sky-100", color: "text-sky-600" };
  if (t.includes('NOTE') || name.includes('NOTE')) return { icon: StickyNote, tint: "bg-amber-100", color: "text-amber-600" };
  if (t.includes('STATUS') || name.includes('STATUS')) return { icon: RefreshCw, tint: "bg-purple-100", color: "text-purple-600" };
  if (name.includes('COMPLETED') && (t.includes('FOLLOWUP') || name.includes('FOLLOW'))) return { icon: CheckCircle, tint: "bg-emerald-100", color: "text-emerald-600" };
  if (t.includes('FOLLOWUP') || name.includes('FOLLOW-UP') || name.includes('SCHEDULED')) return { icon: CalendarClock, tint: "bg-orange-100", color: "text-orange-600" };
  if (t.includes('CREATED') || name.includes('CREATED')) return { icon: PlusCircle, tint: "bg-blue-100", color: "text-blue-600" };
  if (t.includes('UPDATED') || name.includes('UPDATED') || name.includes('EDIT')) return { icon: Edit2, tint: "bg-indigo-100", color: "text-indigo-600" };
  if (name.includes('WON') || name.includes('CLOSED WON')) return { icon: CheckCircle, tint: "bg-emerald-100", color: "text-emerald-600" };
  if (name.includes('LOST') || name.includes('CLOSED LOST')) return { icon: XCircle, tint: "bg-rose-100", color: "text-rose-600" };
  return { icon: StickyNote, tint: "bg-slate-100", color: "text-slate-600" };
};

export function LeadQuickView({ leadId, onClose, onEdit, onUpdate }: { leadId: string, onClose: () => void, onEdit: (lead: Lead) => void, onUpdate: () => void }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [followUpsList, setFollowUpsList] = useState<any[]>([]);
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const { statuses, activityTypes, customFields } = useCrmSettings();
  
  const [activeTab, setActiveTab] = useState<"activity" | "followup">("activity");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!lead) setIsLoading(true);
        else setIsRefreshing(true);
        const fetchedLead = await ApiService.getLead(leadId);
        setLead(fetchedLead);
        
        const actRes = await ApiService.getActivities(leadId);
        const sortedHistory = actRes.data.map((act: any) => {
          const { icon, tint, color } = getActivityIconAndColor(act.activityType, act.title || act.description || '');
          return {
            id: act._id,
            title: act.activityType.replace('_', ' '),
            detail: act.description,
            who: act.performedBy?.name || 'System',
            rawDate: new Date(act.createdAt),
            whenFull: new Date(act.createdAt).toLocaleString(),
            whenRelative: formatRelative(act.createdAt),
            icon, tint, color
          };
        }).sort((a: any, b: any) => b.rawDate.getTime() - a.rawDate.getTime());
        setHistory(sortedHistory);
        
        const fuRes = await ApiService.getFollowUps({ leadId: leadId });
        setFollowUpsList(fuRes.data.map((fu: any) => ({
          id: fu._id,
          notes: fu.notes,
          due: fu.followUpDate,
          status: fu.status,
          priority: fu.priority || 'MEDIUM'
        })).sort((a: any, b: any) => new Date(a.due).getTime() - new Date(b.due).getTime()));
      } catch (err) {
        console.error("Failed to fetch lead details", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchData();
  }, [leadId, refreshCount]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    const oldStatus = lead.status;
    setLead({ ...lead, status: newStatus });
    try {
      // Optimistic append to history
      const { icon, tint, color } = getActivityIconAndColor('STATUS_CHANGED', `Changed status to ${newStatus}`);
      const optimisticActivity = {
        id: Date.now().toString(),
        title: 'Status Changed',
        detail: `Status changed from ${oldStatus} to ${newStatus}`,
        who: "You",
        rawDate: new Date(),
        whenFull: new Date().toLocaleString(),
        whenRelative: "Just now",
        icon, tint, color
      };
      setHistory(prev => [optimisticActivity, ...prev]);

      await ApiService.updateLeadStatus(lead.id, newStatus);
      setRefreshCount(c => c + 1);
      onUpdate();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("leads-updated"));
      toast.success("Status updated");
    } catch (e) {
      setLead({ ...lead, status: oldStatus });
      setRefreshCount(c => c + 1); // Revert optimistic UI on fail
      toast.error("Failed to update status");
    }
  };

  const handleLogActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lead) return;
    const formData = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const actionTaken = formData.get('actionTaken') as string;
      const summary = formData.get('summary') as string;
      
      // Optimistic append
      const { icon, tint, color } = getActivityIconAndColor(actionTaken, summary);
      const optimisticActivity = {
        id: Date.now().toString(),
        title: actionTaken,
        detail: summary,
        who: "You",
        rawDate: new Date(),
        whenFull: new Date().toLocaleString(),
        whenRelative: "Just now",
        icon, tint, color
      };
      setHistory(prev => [optimisticActivity, ...prev]);

      await ApiService.logLeadActivity(lead.id, {
        actionTaken,
        summary,
        followUpDate: formData.get('followUpDate') as string,
        notes: formData.get('notes') as string,
      });
      (e.target as HTMLFormElement).reset();
      
      // Background sync
      setRefreshCount(c => c + 1);
      onUpdate();
      toast.success("Activity logged");
    } catch (err) {
      toast.error("Failed to log activity");
      setRefreshCount(c => c + 1); // Revert optimistic UI on fail
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lead) return;
    const formData = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const due = formData.get('due') as string;
      const notes = formData.get('notes') as string;

      // Optimistic append to history
      const priority = formData.get('priority') as string || 'MEDIUM';
      const detailStr = `Priority: ${priority}\nScheduled: ${new Date(due).toLocaleString()}\nNotes:\n${notes}`;
      const { icon, tint, color } = getActivityIconAndColor('Follow-up Scheduled', detailStr);
      const optimisticActivity = {
        id: Date.now().toString(),
        title: 'Follow-up Scheduled',
        detail: detailStr,
        who: "You",
        rawDate: new Date(),
        whenFull: new Date().toLocaleString(),
        whenRelative: "Just now",
        icon, tint, color
      };
      setHistory(prev => [optimisticActivity, ...prev]);

      // Optimistic append
      const optimisticFollowup = {
        id: Date.now().toString(),
        due,
        notes,
        status: 'PENDING',
        priority: formData.get('priority') as string || 'MEDIUM'
      };
      setFollowUpsList(prev => [...prev, optimisticFollowup].sort((a: any, b: any) => new Date(a.due).getTime() - new Date(b.due).getTime()));

      await ApiService.createFollowUp(lead.id, {
        due,
        notes,
        priority: formData.get('priority') as string,
      });
      (e.target as HTMLFormElement).reset();
      
      setRefreshCount(c => c + 1);
      onUpdate();
      toast.success("Follow-up scheduled");
    } catch (err) {
      toast.error("Failed to schedule follow-up");
      setRefreshCount(c => c + 1);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFollowUp = async (id: string, updates: any) => {
    try {
      // Optimistic UI update
      setFollowUpsList(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      
      if (updates.status === 'COMPLETED' || updates.status === 'CANCELLED' || updates.followUpDate) {
        const target = followUpsList.find(f => f.id === id);
        let title = 'Follow-up Updated';
        let detailStr = '';
        if (updates.status === 'COMPLETED') {
          title = 'Follow-up Completed';
          detailStr = `Priority: ${target?.priority || 'MEDIUM'}\nCompleted Date: ${new Date().toLocaleString()}`;
        } else if (updates.status === 'CANCELLED') {
          title = 'Follow-up Cancelled';
          detailStr = `Priority: ${target?.priority || 'MEDIUM'}\nScheduled Date: ${new Date(target?.due || Date.now()).toLocaleString()}\nCancellation status: Cancelled`;
        } else if (updates.followUpDate) {
          title = 'Follow-up Rescheduled';
          detailStr = `${new Date(target?.due || Date.now()).toLocaleString()} → ${new Date(updates.followUpDate).toLocaleString()}`;
        }

        const { icon, tint, color } = getActivityIconAndColor(title, detailStr);
        setHistory(prev => [{
          id: Date.now().toString(),
          title,
          detail: detailStr,
          who: "You",
          rawDate: new Date(),
          whenFull: new Date().toLocaleString(),
          whenRelative: "Just now",
          icon, tint, color
        }, ...prev]);
      }

      await ApiService.updateFollowUp(id, updates);
      toast.success("Follow-up updated");
      setRefreshCount(c => c + 1);
      onUpdate();
    } catch (err) {
      toast.error("Failed to update follow-up");
      setRefreshCount(c => c + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center p-6 animate-in slide-in-from-top-2 fade-in duration-300">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] font-medium text-muted-foreground">Loading quick view...</p>
        </div>
      </div>
    );
  }

  if (!lead) return <div className="p-10 text-center text-[13px] text-muted-foreground">Lead not found.</div>;

  return (
    <div className="border-x-4 border-x-primary/0 border-y border-y-border bg-card p-5 shadow-[inset_0px_8px_12px_-6px_rgba(0,0,0,0.08)] cursor-default" onClick={e => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <h3 className="text-[16px] font-bold text-foreground">Quick View</h3>
           {isRefreshing && <span title="Syncing..."><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /></span>}
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted transition-colors hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* COLUMN 1: Lead & Pipeline Info */}
        <div className="flex flex-col gap-4 xl:col-span-3">
          <div className="flex items-center gap-3 bg-muted/5 p-4 rounded-xl border border-border shadow-sm group hover:border-border/80 transition-all">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-[15px] font-bold text-blue-700">
              {lead.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[18px] font-bold leading-tight text-foreground">{lead.name}</h2>
              <p className="truncate text-[13px] font-medium text-muted-foreground mt-0.5">{lead.company || 'Not Available'}</p>
            </div>
            <button onClick={() => onEdit(lead)} className="shrink-0 h-8 px-3 rounded-lg border border-border bg-card text-[12px] font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-muted" title="Edit Lead">Edit</button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
               <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-1.5"><IndianRupee className="h-3.5 w-3.5 text-emerald-600"/> Value</label>
               <p className="text-[14px] font-bold text-foreground">₹{lead.value.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
               <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-1.5"><UserCircle2 className="h-3.5 w-3.5 text-blue-600"/> Owner</label>
               <p className="text-[13px] font-semibold text-foreground truncate">{lead.owner || 'Not Available'}</p>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5 block">Current Status</label>
            <select 
              className={`h-8 w-full cursor-pointer appearance-none rounded-lg border border-border/50 px-2.5 py-0 text-[12px] font-bold outline-none ${statusColor(lead.status)} bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_8px_center] bg-no-repeat transition-all hover:brightness-95`}
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isRefreshing}
            >
              {statuses.map(s => <option key={s._id} value={s.label} className="bg-background text-foreground">{s.label}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden text-[13px]">
            <div className="flex items-center gap-3 p-3 border-b border-border/50 group">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-muted/50 text-muted-foreground group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                 <Mail className="h-3.5 w-3.5" />
              </div>
              <span className="truncate font-medium text-foreground flex-1">{lead.email || 'Not Available'}</span>
            </div>
            <div className="flex items-center gap-3 p-3 border-b border-border/50 group">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-muted/50 text-muted-foreground group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                 <Phone className="h-3.5 w-3.5" />
              </div>
              <span className="truncate font-medium text-foreground flex-1">{lead.phone || 'Not Available'}</span>
            </div>
            <div className="flex items-center gap-3 p-3 border-b border-border/50 group">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-muted/50 text-muted-foreground group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                 <MapPin className="h-3.5 w-3.5" />
              </div>
              <span className="truncate font-medium text-foreground flex-1">{lead.location || 'Not Available'}</span>
            </div>
            <div className="flex items-center gap-3 p-3 group">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-muted/50 text-muted-foreground group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                 <Target className="h-3.5 w-3.5" />
              </div>
              <span className="truncate font-medium text-foreground flex-1">{lead.source || 'Not Available'}</span>
            </div>
          </div>

          {customFields && customFields.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm mt-1 overflow-hidden">
              <div className="bg-muted/30 px-3 py-2 border-b border-border/50">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Custom Information</h4>
              </div>
              <div className="p-3 grid grid-cols-1 gap-3 text-[13px]">
                {customFields.map(cf => {
                  const val = lead.customFields?.[cf.label];
                  if (val === undefined || val === null || val === '') return null;
                  
                  return (
                    <div key={cf._id} className="flex flex-col">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">{cf.label}</span>
                      <span className="font-medium text-foreground mt-0.5 break-words">
                        {Array.isArray(val) ? val.join(', ') : typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val}
                      </span>
                    </div>
                  );
                })}
                {customFields.every(cf => {
                  const val = lead.customFields?.[cf.label];
                  return val === undefined || val === null || val === '';
                }) && (
                  <div className="text-muted-foreground italic text-center py-2">No custom data available.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 2: Timeline */}
        <div className="xl:col-span-5 rounded-2xl border border-border bg-card p-5 flex flex-col h-[460px] shadow-sm">
          <h4 className="text-[13px] font-bold text-foreground mb-5 uppercase tracking-wider flex items-center justify-between">
            Communication Timeline
            <span className="text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{history.length}</span>
          </h4>
          <div className="flex-1 overflow-y-auto pr-3 scrollbar-thin">
            {history.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] font-medium text-muted-foreground">No activities recorded yet.</div>
            ) : (
              <ol className="relative ml-3 border-l-2 border-muted mt-2">
                {history.map((h, i) => {
                  const Icon = h.icon;
                  return (
                    <li key={h.id} className={`relative pl-8 animate-in fade-in slide-in-from-bottom-2 duration-300 ${i === history.length - 1 ? "" : "pb-6"}`} style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                      <span className={`absolute -left-[17px] top-0.5 grid h-8 w-8 place-items-center rounded-full ${h.tint} ring-4 ring-card shadow-sm z-10`}>
                        <Icon className={`h-4 w-4 ${h.color}`} />
                      </span>
                      <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <div className="flex justify-between items-start mb-1.5">
                          <p className="text-[14px] font-bold text-foreground leading-none">{h.title}</p>
                          <p className="text-[12px] font-bold text-muted-foreground cursor-help" title={h.whenFull}>{h.whenRelative}</p>
                        </div>
                        <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-snug break-words whitespace-pre-wrap">{h.detail}</p>
                        {h.who !== "System" && (
                          <div className="mt-3 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <div className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground shrink-0 uppercase">
                              {(h.who || 'A').substring(0, 2)}
                            </div>
                            <p className="text-[11px] font-bold text-muted-foreground">by {h.who}</p>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* COLUMN 3: Actions */}
        <div className="xl:col-span-4 rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[460px]">
          <div className="flex border-b border-border bg-muted/10 p-1.5 gap-1.5">
            <button 
              onClick={() => setActiveTab("activity")}
              className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-all ${activeTab === "activity" ? "bg-background shadow text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              Log Activity
            </button>
            <button 
              onClick={() => setActiveTab("followup")}
              className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-all ${activeTab === "followup" ? "bg-background shadow text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              Follow-Up
            </button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto relative">
            {activeTab === "activity" && (
              <form onSubmit={handleLogActivity} className="flex flex-col h-full animate-in fade-in duration-200">
                <div className="space-y-4 flex-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Activity Type <span className="text-red-500">*</span></label>
                    <select name="actionTaken" required className="h-9 w-full rounded-lg border border-input bg-card px-3 text-[13px] font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-border/80 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_10px_center] bg-no-repeat cursor-pointer">
                      <option value="">Select activity type...</option>
                      {activityTypes.map(a => <option key={a._id} value={a.label}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Summary <span className="text-red-500">*</span></label>
                    <textarea name="summary" required placeholder="What was discussed?" className="w-full rounded-lg border border-input bg-card p-3 text-[13px] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-border/80 min-h-[80px] resize-y"></textarea>
                  </div>
                  <div className="space-y-1.5 border-t border-border pt-4">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Next Follow-Up (Optional)</label>
                    <div className="relative">
                       <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                       <input name="followUpDate" type="datetime-local" className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-[13px] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-border/80" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Internal Notes (Optional)</label>
                    <textarea name="notes" placeholder="Additional notes..." className="w-full rounded-lg border border-input bg-card p-3 text-[13px] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-border/80 min-h-[60px] resize-y"></textarea>
                  </div>
                </div>
                
                <div className="sticky bottom-0 bg-card pt-4 pb-1 mt-4 border-t border-border z-10">
                  <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Saving Activity..." : "Save Activity"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "followup" && (
              <div className="animate-in fade-in duration-200 flex flex-col h-full">
                {followUpsList.length > 0 && (
                  <div className="mb-5 space-y-2.5">
                    <h5 className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                      Follow-Ups
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{followUpsList.length}</span>
                    </h5>
                    <div className="space-y-4 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                      {['OVERDUE', 'UPCOMING', 'COMPLETED'].map(group => {
                        const items = followUpsList.filter(f => {
                          if (group === 'COMPLETED') return f.status === 'COMPLETED';
                          const isPast = new Date(f.due).getTime() < Date.now();
                          if (group === 'OVERDUE') return (f.status === 'PENDING' || f.status === 'MISSED') && isPast;
                          return f.status === 'PENDING' && !isPast;
                        });
                        if (items.length === 0) return null;
                        
                        return (
                          <div key={group} className="space-y-2">
                            <h6 className={`text-[10px] font-bold uppercase tracking-wider ${group === 'OVERDUE' ? 'text-red-600' : group === 'COMPLETED' ? 'text-emerald-600' : 'text-orange-600'}`}>{group}</h6>
                            {items.map(f => (
                              <div key={f.id} className={`rounded-xl border p-3 flex flex-col gap-2 shadow-sm transition-colors ${group === 'OVERDUE' ? 'border-red-200 bg-red-50/50 hover:bg-red-50' : group === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50' : 'border-orange-200 bg-orange-50/50 hover:bg-orange-50'}`}>
                                <div className="flex justify-between items-start">
                                  <div className="flex gap-2 items-start">
                                    <CalendarClock className={`h-4 w-4 shrink-0 mt-0.5 ${group === 'OVERDUE' ? 'text-red-500' : group === 'COMPLETED' ? 'text-emerald-500' : 'text-orange-500'}`} />
                                    <div>
                                      <p className={`text-[13px] font-semibold leading-snug ${group === 'OVERDUE' ? 'text-red-900' : group === 'COMPLETED' ? 'text-emerald-900' : 'text-orange-900'}`}>{f.notes}</p>
                                      <p className={`text-[11px] font-bold mt-1 ${group === 'OVERDUE' ? 'text-red-600' : group === 'COMPLETED' ? 'text-emerald-600' : 'text-orange-600'}`}>{new Date(f.due).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${f.priority === 'HIGH' ? 'bg-red-100 text-red-700' : f.priority === 'LOW' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>{f.priority}</span>
                                </div>
                                {editingFollowUpId === f.id ? (
                                  <div className="flex flex-col gap-2 mt-2">
                                    <input type="datetime-local" id={`date-${f.id}`} defaultValue={f.due.slice(0,16)} className="h-8 text-[11px] rounded border px-2 w-full" />
                                    <div className="flex gap-2">
                                      <button type="button" onClick={() => {
                                        const newVal = (document.getElementById(`date-${f.id}`) as HTMLInputElement).value;
                                        if (newVal) {
                                          handleUpdateFollowUp(f.id, { followUpDate: newVal });
                                          setEditingFollowUpId(null);
                                        }
                                      }} className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold">Save</button>
                                      <button type="button" onClick={() => setEditingFollowUpId(null)} className="bg-slate-200 text-slate-700 text-[10px] px-2 py-1 rounded font-bold">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  (f.status === 'PENDING' || f.status === 'MISSED') && (
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-black/5">
                                      <button type="button" onClick={() => handleUpdateFollowUp(f.id, { status: 'COMPLETED' })} className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-100/50 hover:bg-emerald-100 px-2 py-1 rounded">
                                        <Check className="h-3 w-3" /> Complete
                                      </button>
                                      <button type="button" onClick={() => setEditingFollowUpId(f.id)} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100 px-2 py-1 rounded">
                                        <Clock className="h-3 w-3" /> Reschedule
                                      </button>
                                      <button type="button" onClick={() => handleUpdateFollowUp(f.id, { status: 'CANCELLED' })} className="flex items-center gap-1 text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-100/50 hover:bg-red-100 px-2 py-1 rounded ml-auto">
                                        <Trash2 className="h-3 w-3" /> Cancel
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <form onSubmit={handleScheduleFollowUp} className="flex flex-col flex-1 mt-auto border-t border-border pt-4">
                  <h5 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-4">Schedule New</h5>
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Date & Time <span className="text-red-500">*</span></label>
                      <div className="relative">
                         <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                         <input name="due" required type="datetime-local" className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-[13px] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-border/80" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Priority</label>
                      <select name="priority" className="h-9 w-full rounded-lg border border-input bg-card px-3 text-[13px] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-border/80">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM" defaultValue="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">Reminder Note <span className="text-red-500">*</span></label>
                      <textarea name="notes" required placeholder="What to follow up about..." className="w-full rounded-lg border border-input bg-card p-3 text-[13px] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-border/80 min-h-[80px] resize-y"></textarea>
                    </div>
                  </div>
                  
                  <div className="sticky bottom-0 bg-card pt-4 pb-1 border-t border-border z-10">
                    <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-orange-100 text-orange-700 border border-orange-200 text-[13px] font-bold hover:bg-orange-200 transition-colors disabled:opacity-50 shadow-sm">
                      {saving && <Loader2 className="h-4 w-4 animate-spin text-orange-700" />}
                      {saving ? "Scheduling..." : "Schedule Follow-Up"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
