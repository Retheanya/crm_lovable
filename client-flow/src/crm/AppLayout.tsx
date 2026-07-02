import { Link, Outlet, useRouterState, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard, Users2, UserCircle2, CalendarCheck2, Activity as ActivityIcon,
  BarChart3, Settings, Search, Bell, Plus, Menu, X, ChevronDown, Sparkles, LogOut
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/crm/api";
import { useCrmSettings } from "@/context/CrmSettingsContext";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users2 },
  { to: "/users", label: "Users", icon: UserCircle2 },
  { to: "/activity", label: "Activity Timeline", icon: ActivityIcon },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await ApiService.getAllActivities({ limit: 8 });
        const mapped = (res.data || []).map((a: any) => {
          let badgeText = 'Logged';
          let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
          if (a.activityType.includes('CREATED')) { badgeText = 'Created'; badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }
          else if (a.activityType.includes('CHANGED')) { badgeText = 'Changed'; badgeColor = 'bg-blue-50 text-blue-700 border-blue-200'; }
          else if (a.activityType.includes('UPDATED')) { badgeText = 'Updated'; badgeColor = 'bg-purple-50 text-purple-700 border-purple-200'; }
          else if (a.activityType.includes('ADDED')) { badgeText = 'Saved'; badgeColor = 'bg-orange-50 text-orange-700 border-orange-200'; }
          else if (a.activityType.includes('COMPLETED')) { badgeText = 'Completed'; badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }

          return {
            id: a._id || a.id,
            title: a.activityType.replace(/_/g, ' ').replace(/\w\S*/g, (w: string) => (w.replace(/^\w/, (c) => c.toUpperCase()))),
            description: a.description,
            time: new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            leadId: a.leadId?._id || a.leadId,
            leadName: a.leadId?.leadName || 'Lead',
            badgeText,
            badgeColor
          };
        });
        setNotifications(mapped);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    fetchNotifications();
    
    const handleUpdate = () => fetchNotifications();
    window.addEventListener("leads-updated", handleUpdate);
    return () => window.removeEventListener("leads-updated", handleUpdate);
  }, [user]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }


  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <div className="flex min-h-screen w-full bg-[#f8fafc]">
      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "lg:w-[76px]" : "lg:w-[252px]",
          "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="text-[15px] font-bold text-white">Pulse CRM</div>
                <div className="text-[11px] text-sidebar-foreground/60">Enterprise</div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-sidebar-foreground/70 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className={["flex items-center gap-3 rounded-xl p-2", collapsed ? "justify-center" : "bg-sidebar-accent/40"].join(" ")}>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shrink-0">
              {user?.role === "SUPER_ADMIN" ? "SA" : (user?.role === "ADMIN" ? "A" : "U")}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="w-full bg-transparent text-[13px] font-semibold text-white outline-none truncate">
                    {user?.name}
                  </div>
                  <div className="truncate text-[11px] text-sidebar-foreground/60">
                    {user?.role === "SUPER_ADMIN" ? "Super Admin" : (user?.role === "ADMIN" ? "Admin" : "User")}
                  </div>
                </div>
                <button onClick={logout} className="text-sidebar-foreground/60 hover:text-white shrink-0" title="Logout">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className={["flex min-h-screen flex-1 flex-col min-w-0 transition-all duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-[252px]"].join(" ")}>
        {/* Sticky header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-foreground/70 hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden h-9 w-9 place-items-center rounded-lg text-foreground/60 hover:bg-muted lg:grid"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 max-w-md md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search leads, contacts, accounts…"
              className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-[14px] outline-none transition focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  window.location.href = `/leads?search=${encodeURIComponent(e.currentTarget.value)}`;
                }
              }}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
              <button 
                onClick={() => (document.getElementById('new-lead-modal') as HTMLDialogElement)?.showModal()}
                className="hidden h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 sm:inline-flex"
              >
                <Plus className="h-4 w-4" /> New Lead
              </button>
            )}            <div className="relative">
              <button 
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground/70 hover:bg-muted" 
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
              
              {notifDropdownOpen && (
                <div className="fixed left-[16px] right-[16px] top-[72px] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
                  <div className="border-b border-border p-3 flex justify-between items-center bg-muted/20">
                    <p className="text-[14px] font-bold text-foreground">Recent Activity</p>
                    {notifications.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        {notifications.length} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-muted/40 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-[13px] font-semibold text-foreground">{n.title}</p>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{n.time}</span>
                          </div>
                          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <Link 
                              to="/leads" 
                              search={{ expanded: n.leadId } as any}
                              onClick={() => setNotifDropdownOpen(false)}
                              className="text-[12px] font-medium text-[#2563eb] hover:underline"
                            >
                              Lead: {n.leadName}
                            </Link>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${n.badgeColor}`}>
                              {n.badgeText}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-[13px] font-medium">All caught up!</p>
                        <p className="text-[11px] text-muted-foreground/75 mt-0.5">No recent activities.</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border p-2">
                    <button 
                      onClick={() => {
                        setNotifDropdownOpen(false);
                        (document.getElementById('all-notifications-modal') as HTMLDialogElement)?.showModal();
                        window.dispatchEvent(new Event('load-all-notifications'));
                      }}
                      className="w-full rounded-lg px-3 py-2 text-[13px] font-semibold text-primary hover:bg-primary/10 transition text-center"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="ml-1 hidden items-center gap-2 rounded-xl border border-border px-2 py-1.5 sm:flex hover:bg-muted transition"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  {(user?.name || 'A').substring(0, 2).toUpperCase()}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              
              {profileDropdownOpen && (
                <div className="fixed left-[16px] right-[16px] top-[72px] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                  <div className="border-b border-border p-3">
                    <p className="text-[14px] font-bold text-foreground truncate">{user?.name}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{user?.email}</p>
                    <div className="mt-1.5 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {user?.role === "SUPER_ADMIN" ? "Super Admin" : (user?.role === "ADMIN" ? "Admin" : "User")}
                    </div>
                  </div>
                  <div className="p-1.5 flex flex-col gap-0.5">
                    <button 
                      onClick={() => { setProfileDropdownOpen(false); logout(); }} 
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-foreground hover:bg-muted transition text-left"
                    >
                      <Users2 className="h-4 w-4 text-muted-foreground" />
                      Switch Account
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button 
                      onClick={() => { setProfileDropdownOpen(false); logout(); }} 
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-red-500 hover:bg-red-50 transition text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
 
        <main 
          className="flex-1 min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8" 
          onClick={() => {
            if (profileDropdownOpen) setProfileDropdownOpen(false);
            if (notifDropdownOpen) setNotifDropdownOpen(false);
          }}
        >
          <Outlet />
        </main>
      </div>

      <NewLeadModal />
      <AllNotificationsModal />
    </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[12px] border border-border bg-card shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function AssignedUserSelect({ name, required = false, defaultValue = "" }: { name: string, required?: boolean, defaultValue?: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ApiService.getUsers({ isActive: true, limit: 100 })
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <select name={name} required={required} defaultValue={defaultValue} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
      {isLoading ? (
        <option value="" disabled>Loading users...</option>
      ) : users.length === 0 ? (
        <option value="" disabled>No active users available</option>
      ) : (
        <>
          <option value="" disabled>Select User</option>
          {users.map(u => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </>
      )}
    </select>
  );
}

function NewLeadModal() {
  const { statuses, sources, customFields } = useCrmSettings();
  const [createError, setCreateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <dialog id="new-lead-modal" className="m-auto backdrop:bg-foreground/40 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl border-0 p-0 w-full max-w-lg bg-card open:animate-in open:fade-in-90 open:zoom-in-95">
      <form onSubmit={async (e) => {
        e.preventDefault();
        setCreateError("");
        setIsSubmitting(true);
        const form = e.currentTarget;
        const data = new FormData(form);
        
        try {
          const cfValues: Record<string, any> = {};
          if (customFields) {
            customFields.forEach(cf => {
              if (cf.type === 'CHECKBOX') {
                cfValues[cf.label] = data.get(`cf_${cf._id}`) === 'on';
              } else if (cf.type === 'MULTI_SELECT') {
                cfValues[cf.label] = data.getAll(`cf_${cf._id}`);
              } else {
                cfValues[cf.label] = data.get(`cf_${cf._id}`);
              }
            });
          }

          await ApiService.createLead({
            name: data.get("name") as string,
            company: data.get("company") as string,
            phone: data.get("phone") as string,
            location: data.get("location") as string,
            source: data.get("source") as string,
            status: data.get("status") as any,
            assignedUser: data.get("owner") as string,
            value: Number(data.get("value") || 0),
            notes: data.get("notes") as string,
            customFields: cfValues
          });
          
          (document.getElementById('new-lead-modal') as HTMLDialogElement)?.close();
          form.reset();
          setCreateError("");
          window.dispatchEvent(new Event("leads-updated"));
        } catch (error: any) {
          const msg = error?.response?.data?.error || error?.response?.data?.message || "Failed to create lead. Please check all fields.";
          setCreateError(msg);
          console.error("Failed to create lead", error);
        } finally {
          setIsSubmitting(false);
        }
      }}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-[18px] font-bold text-foreground">Create New Lead</h2>
          <button type="button" onClick={() => (document.getElementById('new-lead-modal') as HTMLDialogElement)?.close()} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {createError && <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{createError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Lead Name <span className="text-red-500">*</span></label>
              <input name="name" required type="text" placeholder="e.g. Jane Doe" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Company Name <span className="text-red-500">*</span></label>
              <input name="company" required type="text" placeholder="e.g. Acme Corp" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Phone Number <span className="text-red-500">*</span></label>
              <input name="phone" required type="tel" placeholder="+1 (555) 000-0000" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Location <span className="text-red-500">*</span></label>
              <input name="location" required type="text" placeholder="e.g. New York, USA" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Lead Source <span className="text-red-500">*</span></label>
              <select name="source" required className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
                {sources.map(s => <option key={s._id} value={s.label}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Status <span className="text-red-500">*</span></label>
              <select name="status" required className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
                {statuses.map(s => <option key={s._id} value={s.label}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Assigned User</label>
              <AssignedUserSelect name="owner" required={false} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Deal Value (₹) <span className="text-red-500">*</span></label>
              <input name="value" required type="number" min="0" placeholder="e.g. 50000" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Notes</label>
            <textarea name="notes" placeholder="Any initial notes or requirements..." className="w-full rounded-xl border border-input bg-background p-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px]"></textarea>
          </div>
          {customFields && customFields.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border">
              <h3 className="text-[14px] font-bold text-foreground mb-4">Additional Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {customFields.map(cf => (
                  <div key={cf._id} className={cf.type === 'TEXTAREA' ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
                    <label className="text-[13px] font-medium text-foreground">
                      {cf.label} {cf.isRequired && <span className="text-red-500">*</span>}
                    </label>
                    {cf.type === 'TEXTAREA' ? (
                      <textarea name={`cf_${cf._id}`} required={cf.isRequired} className="w-full rounded-xl border border-input bg-background p-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px]"></textarea>
                    ) : (cf.type === 'DROPDOWN' || cf.type === 'MULTI_SELECT') ? (
                      <select name={`cf_${cf._id}`} required={cf.isRequired} multiple={cf.type === 'MULTI_SELECT'} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
                        <option value="" disabled>Select {cf.label}</option>
                        {cf.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : cf.type === 'CHECKBOX' ? (
                      <div className="flex items-center h-10">
                        <input type="checkbox" name={`cf_${cf._id}`} required={cf.isRequired} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      </div>
                    ) : cf.type === 'RADIO' ? (
                      <div className="flex gap-4 items-center h-10">
                        {cf.options?.map((opt: string) => (
                          <label key={opt} className="flex items-center gap-1.5 text-[13px]">
                            <input type="radio" name={`cf_${cf._id}`} value={opt} required={cf.isRequired} className="h-4 w-4 text-primary focus:ring-primary" />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input 
                        name={`cf_${cf._id}`} 
                        required={cf.isRequired} 
                        type={cf.type === 'NUMBER' ? 'number' : cf.type === 'EMAIL' ? 'email' : cf.type === 'DATE' ? 'date' : cf.type === 'URL' ? 'url' : 'text'} 
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" 
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border p-5 flex justify-end gap-3 bg-muted/40 rounded-b-2xl">
          <button type="button" onClick={() => { (document.getElementById('new-lead-modal') as HTMLDialogElement)?.close(); setCreateError(""); }} className="h-10 rounded-xl px-4 text-[13px] font-semibold text-foreground hover:bg-muted transition-colors border border-border bg-card shadow-sm">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="h-10 rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition-opacity disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create Lead'}</button>
        </div>
      </form>
    </dialog>
  );
}

function AllNotificationsModal() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const res = await ApiService.getAllActivities({ limit: 50 });
        const mapped = (res.data || []).map((a: any) => {
          let badgeText = 'Logged';
          let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
          if (a.activityType.includes('CREATED')) { badgeText = 'Created'; badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }
          else if (a.activityType.includes('CHANGED')) { badgeText = 'Changed'; badgeColor = 'bg-blue-50 text-blue-700 border-blue-200'; }
          else if (a.activityType.includes('UPDATED')) { badgeText = 'Updated'; badgeColor = 'bg-purple-50 text-purple-700 border-purple-200'; }
          else if (a.activityType.includes('ADDED')) { badgeText = 'Saved'; badgeColor = 'bg-orange-50 text-orange-700 border-orange-200'; }
          else if (a.activityType.includes('COMPLETED')) { badgeText = 'Completed'; badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }

          return {
            id: a._id || a.id,
            title: a.activityType.replace(/_/g, ' ').replace(/\w\S*/g, (w: string) => (w.replace(/^\w/, (c) => c.toUpperCase()))),
            description: a.description,
            time: new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            leadId: a.leadId?._id || a.leadId,
            leadName: a.leadId?.leadName || 'Lead',
            badgeText,
            badgeColor
          };
        });
        setNotifications(mapped);
      } catch (err) {
        console.error("Failed to fetch all notifs", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    window.addEventListener('load-all-notifications', fetchAll);
    return () => window.removeEventListener('load-all-notifications', fetchAll);
  }, []);

  return (
    <dialog id="all-notifications-modal" className="m-auto backdrop:bg-foreground/40 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl border-0 p-0 w-full max-w-2xl bg-card open:animate-in open:fade-in-90 open:zoom-in-95">
      <div className="flex items-center justify-between border-b border-border p-5">
        <h2 className="text-[18px] font-bold text-foreground">All Notifications</h2>
        <button type="button" onClick={() => (document.getElementById('all-notifications-modal') as HTMLDialogElement)?.close()} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-0 max-h-[70vh] overflow-y-auto">
        {isLoading ? (
           <div className="p-10 text-center text-muted-foreground"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div></div>
        ) : notifications.length === 0 ? (
           <div className="p-10 text-center text-muted-foreground">No notifications found.</div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div key={n.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-[14px] font-semibold text-foreground">{n.title}</p>
                  <span className="text-[12px] text-muted-foreground">{n.time}</span>
                </div>
                <p className="text-[13px] text-muted-foreground mt-1">{n.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Link 
                    to="/leads" 
                    search={{ expanded: n.leadId } as any}
                    onClick={() => (document.getElementById('all-notifications-modal') as HTMLDialogElement)?.close()}
                    className="text-[13px] font-medium text-[#2563eb] hover:underline"
                  >
                    Lead: {n.leadName}
                  </Link>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${n.badgeColor}`}>
                    {n.badgeText}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}