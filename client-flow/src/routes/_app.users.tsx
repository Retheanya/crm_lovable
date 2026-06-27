import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Plus, MoreHorizontal, X, Edit2, Trash2, Shield, Power } from "lucide-react";
import { PageHeader, Card } from "@/crm/AppLayout";
import { ApiService } from "@/crm/api";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Users — Pulse CRM" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser } = useAuth();
  
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const res = await ApiService.getUsers({ limit: 100, search: q });
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [refreshCount, q]);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) {
      try {
        await ApiService.updateUserStatus(id, !currentStatus);
        setRefreshCount(c => c + 1);
      } catch (err) {
        console.error("Failed to update status", err);
      }
    }
  };

  const deleteUser = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) {
      try {
        await ApiService.deleteUser(id);
        setRefreshCount(c => c + 1);
      } catch (err) {
        console.error("Failed to delete user", err);
      }
    }
  };

  if (currentUser?.role !== "SUPER_ADMIN" && currentUser?.role !== "ADMIN") {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only Admins and Super Admins can access User Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Team & Users"
        subtitle="Manage your employees, roles and access"
        actions={
          <button onClick={() => (document.getElementById('invite-user-modal') as HTMLDialogElement)?.showModal()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-soft hover:opacity-95">
            <Plus className="h-4 w-4" /> Create User
          </button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users by name or email"
              className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-[14px] outline-none focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>

        {isLoading ? (
           <div className="p-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">No users match your filters.</div>
            )}
            {users.map((u) => (
              <div key={u._id} className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-soft">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--tint-blue)] text-[14px] font-bold text-[#1d4ed8]">
                        {(u.name || 'A B').split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                      </div>
                      <span
                        className={[
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card",
                          u.isActive ? "bg-green-500" : "bg-red-500",
                        ].join(" ")}
                        title={u.isActive ? "Active" : "Inactive"}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{u.name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{u.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => {
                      setEditingUser(u);
                      setTimeout(() => (document.getElementById('edit-user-modal') as HTMLDialogElement)?.showModal(), 50);
                    }} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit User">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => toggleStatus(u._id, u.isActive)} className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-muted ${u.isActive ? 'text-amber-500' : 'text-green-500'}`} title={u.isActive ? "Deactivate" : "Activate"}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteUser(u._id)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50" title="Delete User">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-4 truncate text-[13px] text-muted-foreground">{u.email}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <InviteUserModal setRefreshCount={setRefreshCount} />
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} setRefreshCount={setRefreshCount} />}
    </div>
  );
}

function InviteUserModal({ setRefreshCount }: { setRefreshCount: React.Dispatch<React.SetStateAction<number>> }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <dialog id="invite-user-modal" className="m-auto backdrop:bg-foreground/40 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl border-0 p-0 w-full max-w-md bg-card open:animate-in open:fade-in-90 open:zoom-in-95">
      <form onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        const form = e.currentTarget;
        const data = new FormData(form);
        
        try {
          await ApiService.createUser({
            name: data.get("name") as string,
            email: data.get("email") as string,
            password: data.get("password") as string,
            role: data.get("role") as string
          });
          setRefreshCount(c => c + 1);
          (document.getElementById('invite-user-modal') as HTMLDialogElement)?.close();
          form.reset();
        } catch (err: any) {
          setError(err.response?.data?.error || err.response?.data?.message || "Failed to create user");
        } finally {
          setIsLoading(false);
        }
      }}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-[18px] font-bold text-foreground">Create User</h2>
          <button type="button" onClick={() => (document.getElementById('invite-user-modal') as HTMLDialogElement)?.close()} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="text-[13px] text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Full Name <span className="text-red-500">*</span></label>
            <input name="name" required type="text" placeholder="e.g. John Doe" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Email Address <span className="text-red-500">*</span></label>
            <input name="email" required type="email" placeholder="john@example.com" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Password <span className="text-red-500">*</span></label>
            <input name="password" required minLength={6} type="password" placeholder="Min 6 characters" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Role <span className="text-red-500">*</span></label>
            <select name="role" required className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
        </div>
        <div className="border-t border-border p-5 flex justify-end gap-3 bg-muted/40 rounded-b-2xl">
          <button type="button" onClick={() => (document.getElementById('invite-user-modal') as HTMLDialogElement)?.close()} className="h-10 rounded-xl px-4 text-[13px] font-semibold text-foreground hover:bg-muted transition-colors border border-border bg-card shadow-sm">Cancel</button>
          <button type="submit" disabled={isLoading} className="h-10 rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition-opacity disabled:opacity-50">Create User</button>
        </div>
      </form>
    </dialog>
  );
}

function EditUserModal({ user, onClose, setRefreshCount }: { user: any, onClose: () => void, setRefreshCount: React.Dispatch<React.SetStateAction<number>> }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <dialog id="edit-user-modal" className="m-auto backdrop:bg-foreground/40 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl border-0 p-0 w-full max-w-md bg-card open:animate-in open:fade-in-90 open:zoom-in-95" onClose={onClose}>
      <form onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        const form = e.currentTarget;
        const data = new FormData(form);
        
        try {
          const payload: any = {
            name: data.get("name") as string,
            email: data.get("email") as string,
            role: data.get("role") as string
          };
          const pwd = data.get("password") as string;
          if (pwd) payload.password = pwd; // Only update if provided

          await ApiService.updateUser(user._id, payload);
          setRefreshCount(c => c + 1);
          (document.getElementById('edit-user-modal') as HTMLDialogElement)?.close();
        } catch (err: any) {
          setError(err.response?.data?.error || err.response?.data?.message || "Failed to update user");
        } finally {
          setIsLoading(false);
        }
      }}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-[18px] font-bold text-foreground">Edit User</h2>
          <button type="button" onClick={() => (document.getElementById('edit-user-modal') as HTMLDialogElement)?.close()} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="text-[13px] text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Full Name <span className="text-red-500">*</span></label>
            <input name="name" defaultValue={user.name} required type="text" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Email Address <span className="text-red-500">*</span></label>
            <input name="email" defaultValue={user.email} required type="email" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">New Password <span className="text-muted-foreground font-normal">(Leave blank to keep current)</span></label>
            <input name="password" minLength={6} type="password" placeholder="Min 6 characters" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Role <span className="text-red-500">*</span></label>
            <select name="role" defaultValue={user.role} required className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat">
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
        </div>
        <div className="border-t border-border p-5 flex justify-end gap-3 bg-muted/40 rounded-b-2xl">
          <button type="button" onClick={() => (document.getElementById('edit-user-modal') as HTMLDialogElement)?.close()} className="h-10 rounded-xl px-4 text-[13px] font-semibold text-foreground hover:bg-muted transition-colors border border-border bg-card shadow-sm">Cancel</button>
          <button type="submit" disabled={isLoading} className="h-10 rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition-opacity disabled:opacity-50">Save Changes</button>
        </div>
      </form>
    </dialog>
  );
}