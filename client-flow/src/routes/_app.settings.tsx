import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  User, Bell, Palette, Shield, Check, Settings2,
  Plus, Pencil, Trash2, GripVertical, ToggleLeft, ToggleRight,
  Tag, Zap, Globe, X, AlertTriangle, CheckCircle2, Loader2
} from "lucide-react";
import { PageHeader, Card } from "@/crm/AppLayout";
import { ApiService, CrmSettingItem } from "@/crm/api";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Pulse CRM" }] }),
  component: SettingsPage,
});

const TABS = [
  { id: "profile",       label: "Profile",           icon: User },
  { id: "notifications", label: "Notifications",      icon: Bell },
  { id: "appearance",   label: "Appearance",          icon: Palette },
  { id: "security",     label: "Security",            icon: Shield },
  { id: "crm",          label: "CRM Configuration",  icon: Settings2 },
] as const;

function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("profile");
  const user = ApiService.getCurrentUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your workspace, preferences and security" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="p-2 h-fit">
          <nav className="space-y-1">
            {TABS.map((t) => {
              if (t.id === "crm" && !isSuperAdmin) return null;
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition",
                    active ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-muted",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </Card>

        <div>
          {tab === "profile"       && <ProfileSection user={user} />}
          {tab === "notifications" && <NotificationsSection />}
          {tab === "appearance"    && <AppearanceSection />}
          {tab === "security"      && <SecuritySection />}
          {tab === "crm"           && isSuperAdmin && <CrmConfigSection />}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   CRM Configuration Section
───────────────────────────────────────────────────── */

const CATEGORY_META: Record<string, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  LEAD_STATUS:   { label: "Lead Statuses",   desc: "Manage pipeline stages for leads",          icon: Tag,   color: "text-blue-600 bg-blue-50 border-blue-200" },
  LEAD_SOURCE:   { label: "Lead Sources",    desc: "Manage where your leads come from",         icon: Globe, color: "text-violet-600 bg-violet-50 border-violet-200" },
  ACTIVITY_TYPE: { label: "Activity Types",  desc: "Manage communication and activity options",  icon: Zap,   color: "text-orange-600 bg-orange-50 border-orange-200" },
  CUSTOM_FIELDS: { label: "Custom Fields",   desc: "Manage dynamic fields for leads",            icon: Plus,  color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

type CrmSettings = Record<string, CrmSettingItem[]>;

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const show = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

function CrmConfigSection() {
  const [settings, setSettings] = useState<CrmSettings>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("LEAD_STATUS");
  const { toast, show } = useToast();

  const [customFields, setCustomFields] = useState<any[]>([]);

  const reload = useCallback(async () => {
    try {
      const [data, cfData] = await Promise.all([
        ApiService.getCrmSettings(),
        ApiService.getCustomFields()
      ]);
      setSettings(data);
      setCustomFields(cfData);
    } catch {
      show("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={[
          "fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium shadow-lg",
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        ].join(" ")}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-[16px] font-semibold text-foreground">CRM Configuration</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Manage lead statuses, sources, and activity types used across the CRM. Only SUPER_ADMIN can modify these settings.
        </p>

        {/* Category Tabs */}
        <div className="mt-6 flex gap-2 flex-wrap">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const active = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={[
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium border transition-all",
                  active ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border text-foreground/70 hover:bg-muted"
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : activeCategory === 'CUSTOM_FIELDS' ? (
        <CustomFieldCategoryPanel
          items={customFields}
          meta={CATEGORY_META[activeCategory]}
          onReload={reload}
          onToast={show}
        />
      ) : (
        <SettingCategoryPanel
          category={activeCategory}
          items={settings[activeCategory] || []}
          meta={CATEGORY_META[activeCategory]}
          onReload={reload}
          onToast={show}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Custom Fields Panel
───────────────────────────────────────────────────── */
function CustomFieldCategoryPanel({
  items, meta, onReload, onToast
}: {
  items: any[];
  meta: { label: string; desc: string; icon: React.ElementType; color: string };
  onReload: () => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("TEXT");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState(""); // comma separated
  
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fieldTypes = [
    { value: 'TEXT', label: 'Short Text' },
    { value: 'TEXTAREA', label: 'Long Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'DATE', label: 'Date' },
    { value: 'DROPDOWN', label: 'Dropdown' },
    { value: 'MULTI_SELECT', label: 'Multi Select' },
    { value: 'CHECKBOX', label: 'Checkbox' },
    { value: 'RADIO', label: 'Radio' },
    { value: 'URL', label: 'URL' },
  ];

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      await ApiService.createCustomField({
        label: newLabel.trim(),
        type: newType as any,
        isRequired: newRequired,
        options: newOptions.split(',').map(s => s.trim()).filter(Boolean)
      });
      setNewLabel("");
      setNewType("TEXT");
      setNewRequired(false);
      setNewOptions("");
      setAdding(false);
      onReload();
      onToast(`${newLabel.trim()} added successfully`);
    } catch (e: any) {
      onToast(e?.response?.data?.message || "Failed to add", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: any) => {
    try {
      await ApiService.updateCustomField(item._id, { isActive: !item.isActive });
      onReload();
      onToast(`${item.label} ${!item.isActive ? "activated" : "deactivated"}`);
    } catch {
      onToast("Failed to update", "error");
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete "${item.label}"? This cannot be undone.`)) return;
    try {
      await ApiService.deleteCustomField(item._id);
      onReload();
      onToast(`${item.label} deleted`);
    } catch (e: any) {
      onToast(e?.response?.data?.message || "Failed to delete", "error");
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOver(null); return; }
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex(i => i._id === draggingId);
    const toIdx   = sorted.findIndex(i => i._id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const orderPayload = reordered.map((item, idx) => ({ id: item._id, order: idx }));
    setDraggingId(null);
    setDragOver(null);
    try {
      await ApiService.reorderCustomFields(orderPayload);
      onReload();
    } catch {
      onToast("Failed to reorder", "error");
    }
  };

  const MetaIcon = meta.icon;
  const sorted = [...items].sort((a, b) => a.order - b.order);
  
  const showOptions = ['DROPDOWN', 'MULTI_SELECT', 'RADIO'].includes(newType);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta.color}`}>
            <MetaIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-foreground">{meta.label}</h4>
            <p className="text-[13px] text-muted-foreground">{meta.desc}</p>
          </div>
        </div>
        <button
          onClick={() => { setAdding(true); setNewLabel(""); }}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> Add Field
        </button>
      </div>

      {adding && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <input
              autoFocus
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Field Label (e.g. Tax ID)"
              className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-[13px] font-medium bg-card h-9 px-3 rounded-lg border border-border cursor-pointer">
              <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} className="h-4 w-4 accent-primary" />
              Required
            </label>
          </div>
          
          {showOptions && (
             <div className="flex items-center gap-2">
               <input
                 value={newOptions}
                 onChange={e => setNewOptions(e.target.value)}
                 placeholder="Options (comma separated, e.g. Tech, Health, Finance)"
                 className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
               />
             </div>
          )}

          <div className="flex justify-end gap-2 mt-1">
            <button onClick={() => setAdding(false)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium hover:bg-muted">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={saving || !newLabel.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Field
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-[14px] text-muted-foreground">No custom fields yet. Click "Add Field" to create one.</div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[24px_1fr_120px_auto_auto_auto] gap-3 px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            <span></span>
            <span>Label</span>
            <span>Type</span>
            <span className="w-20 text-center">Required</span>
            <span className="w-16 text-center">Status</span>
            <span className="w-8"></span>
          </div>

          {sorted.map(item => (
            <div
              key={item._id}
              draggable
              onDragStart={() => setDraggingId(item._id)}
              onDragOver={e => { e.preventDefault(); setDragOver(item._id); }}
              onDrop={() => handleDrop(item._id)}
              onDragEnd={() => { setDraggingId(null); setDragOver(null); }}
              className={[
                "grid grid-cols-[24px_1fr_120px_auto_auto_auto] gap-3 items-center rounded-xl border px-3 py-2.5 transition-all",
                dragOver === item._id ? "border-primary/50 bg-primary/5 scale-[1.01]" : "border-border bg-card hover:bg-muted/30",
                !item.isActive ? "opacity-50" : ""
              ].join(" ")}
            >
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/50 hover:text-muted-foreground" />

              <div className="flex items-center gap-2 min-w-0">
                <span className={["text-[14px] font-medium truncate", !item.isActive ? "line-through text-muted-foreground" : "text-foreground"].join(" ")}>
                  {item.label}
                </span>
              </div>
              
              <span className="text-[12px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md inline-block w-fit">
                {item.type}
              </span>

              <span className="w-20 text-center">
                {item.isRequired ? <span className="text-rose-500 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Yes</span> : <span className="text-muted-foreground text-[11px]">No</span>}
              </span>

              <span className={[
                "w-16 text-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              ].join(" ")}>
                {item.isActive ? "Active" : "Inactive"}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(item)}
                  className={["flex h-7 w-7 items-center justify-center rounded-lg transition", item.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"].join(" ")}
                  title={item.isActive ? "Deactivate" : "Activate"}
                >
                  {item.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-5 text-[12px] text-muted-foreground">
        Drag rows to reorder them. Custom fields will appear in this order when creating or viewing a lead.
      </p>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────
   Per-Category Panel
───────────────────────────────────────────────────── */
function SettingCategoryPanel({
  category, items, meta, onReload, onToast
}: {
  category: string;
  items: CrmSettingItem[];
  meta: { label: string; desc: string; icon: React.ElementType; color: string };
  onReload: () => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const value = newLabel.trim().toUpperCase().replace(/\s+/g, "_");
      await ApiService.createCrmSetting({ category, label: newLabel.trim(), value });
      setNewLabel("");
      setAdding(false);
      onReload();
      onToast(`${newLabel.trim()} added successfully`);
    } catch (e: any) {
      onToast(e?.response?.data?.message || "Failed to add", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: CrmSettingItem) => {
    try {
      await ApiService.updateCrmSetting(item._id, { isActive: !item.isActive });
      onReload();
      onToast(`${item.label} ${!item.isActive ? "activated" : "deactivated"}`);
    } catch {
      onToast("Failed to update", "error");
    }
  };

  const handleEdit = async (item: CrmSettingItem) => {
    if (!editLabel.trim() || editLabel === item.label) { setEditId(null); return; }
    try {
      await ApiService.updateCrmSetting(item._id, { label: editLabel.trim() });
      setEditId(null);
      onReload();
      onToast("Label updated");
    } catch {
      onToast("Failed to update", "error");
    }
  };

  const handleDelete = async (item: CrmSettingItem) => {
    if (!confirm(`Delete "${item.label}"? This cannot be undone.`)) return;
    try {
      await ApiService.deleteCrmSetting(item._id);
      onReload();
      onToast(`${item.label} deleted`);
    } catch (e: any) {
      onToast(e?.response?.data?.message || "Failed to delete", "error");
    }
  };

  // Simple drag-to-reorder
  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOver(null); return; }
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex(i => i._id === draggingId);
    const toIdx   = sorted.findIndex(i => i._id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const orderPayload = reordered.map((item, idx) => ({ id: item._id, order: idx }));
    setDraggingId(null);
    setDragOver(null);
    try {
      await ApiService.reorderCrmSettings(category, orderPayload);
      onReload();
    } catch {
      onToast("Failed to reorder", "error");
    }
  };

  const MetaIcon = meta.icon;
  const sorted = [...items].sort((a, b) => a.order - b.order);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta.color}`}>
            <MetaIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-foreground">{meta.label}</h4>
            <p className="text-[13px] text-muted-foreground">{meta.desc}</p>
          </div>
        </div>
        <button
          onClick={() => { setAdding(true); setNewLabel(""); }}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> Add New
        </button>
      </div>

      {/* Add New Row */}
      {adding && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="e.g. Warm Lead"
            className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </button>
          <button onClick={() => setAdding(false)} className="rounded-lg border border-border px-3 py-2 text-[13px]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Items List */}
      {sorted.length === 0 ? (
        <div className="py-10 text-center text-[14px] text-muted-foreground">No items yet. Click "Add New" to create one.</div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[24px_1fr_auto_auto_auto] gap-3 px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            <span></span>
            <span>Label</span>
            <span className="w-16 text-center">Status</span>
            <span className="w-8"></span>
            <span className="w-8"></span>
          </div>

          {sorted.map(item => (
            <div
              key={item._id}
              draggable
              onDragStart={() => setDraggingId(item._id)}
              onDragOver={e => { e.preventDefault(); setDragOver(item._id); }}
              onDrop={() => handleDrop(item._id)}
              onDragEnd={() => { setDraggingId(null); setDragOver(null); }}
              className={[
                "grid grid-cols-[24px_1fr_auto_auto_auto] gap-3 items-center rounded-xl border px-3 py-2.5 transition-all",
                dragOver === item._id ? "border-primary/50 bg-primary/5 scale-[1.01]" : "border-border bg-card hover:bg-muted/30",
                !item.isActive ? "opacity-50" : ""
              ].join(" ")}
            >
              {/* Drag handle */}
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/50 hover:text-muted-foreground" />

              {/* Label / Edit inline */}
              {editId === item._id ? (
                <input
                  autoFocus
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={() => handleEdit(item)}
                  onKeyDown={e => { if (e.key === "Enter") handleEdit(item); if (e.key === "Escape") setEditId(null); }}
                  className="h-8 w-full rounded-lg border border-primary bg-card px-2 text-[14px] outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <span className={["text-[14px] font-medium truncate", !item.isActive ? "line-through text-muted-foreground" : "text-foreground"].join(" ")}>
                    {item.label}
                  </span>
                  {item.isSystem && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">System</span>
                  )}
                </div>
              )}

              {/* Active badge */}
              <span className={[
                "w-16 text-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              ].join(" ")}>
                {item.isActive ? "Active" : "Inactive"}
              </span>

              {/* Edit button */}
              <button
                onClick={() => { setEditId(item._id); setEditLabel(item.label); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
                title="Rename"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              {/* Toggle + Delete */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(item)}
                  className={["flex h-7 w-7 items-center justify-center rounded-lg transition", item.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"].join(" ")}
                  title={item.isActive ? "Deactivate" : "Activate"}
                >
                  {item.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                {!item.isSystem && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-5 text-[12px] text-muted-foreground">
        <span className="font-medium">System</span> items can be activated/deactivated but not deleted. Drag rows to reorder them.
      </p>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────
   Existing Sections (unchanged)
───────────────────────────────────────────────────── */
function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h3 className="text-[16px] font-semibold">{title}</h3>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{desc}</p>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-[14px] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

function ProfileSection({ user }: { user: any }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const { toast, show } = useToast();

  const displayRole = user?.role === "SUPER_ADMIN" ? "Super Admin" : (user?.role === "ADMIN" ? "Admin" : "User");

  const handleSave = async () => {
    setLoading(true);
    try {
      await ApiService.updateProfile({ name, email });
      show("Profile updated successfully");
      // Trigger a refresh or auth me reload if necessary
    } catch (e: any) {
      show(e?.response?.data?.error || "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={[
          "flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium shadow-sm mb-4",
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        ].join(" ")}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
      <Section title="Profile" desc="Update your personal information visible to your team.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name"><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Email Address"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} /></Field>
          <Field label="Role"><input value={displayRole} disabled className={[inputCls, "bg-muted text-muted-foreground"].join(" ")} /></Field>
          <Field label="Account Created"><input value={new Date(user?.createdAt).toLocaleDateString()} disabled className={[inputCls, "bg-muted text-muted-foreground"].join(" ")} /></Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button 
            disabled={loading}
            onClick={handleSave} 
            className="rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save changes"}
          </button>
        </div>
      </Section>
    </div>
  );
}

function Toggle({ label, desc, defaultOn = false }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-[14px] font-medium">{label}</p>
        <p className="text-[12px] text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={["relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-primary" : "bg-border"].join(" ")}
        aria-pressed={on}
      >
        <span className={["absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5"].join(" ")} />
      </button>
    </div>
  );
}

function NotificationsSection() {
  return (
    <Section title="Notifications" desc="Choose how you want to be notified.">
      <div className="divide-y divide-border">
        <Toggle label="Email summary" desc="Daily digest of pipeline activity at 8:00 AM." defaultOn />
        <Toggle label="New lead assigned" desc="Get notified instantly when a lead is assigned to you." defaultOn />
        <Toggle label="Follow-up reminders" desc="15 minutes before each scheduled follow-up." defaultOn />
        <Toggle label="Weekly performance report" desc="Sent every Monday morning." />
        <Toggle label="Product updates" desc="Occasional emails about new features." />
      </div>
    </Section>
  );
}

function AppearanceSection() {
  const { preferences, updatePreferences } = useAuth();
  
  const theme = preferences?.theme ?? "light";
  const accent = preferences?.accentColor ?? "#2563eb";
  const density = preferences?.density ?? "comfortable";
  
  const accents = ["#2563eb", "#7c3aed", "#16a34a", "#f97316", "#ef4444", "#0ea5e9"];

  return (
    <Section title="Appearance" desc="Customize how Pulse looks on your screen.">
      <p className="text-[13px] font-medium">Theme</p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {(["light", "dark", "system"] as const).map((t) => (
          <button
            key={t}
            onClick={() => updatePreferences({ theme: t })}
            className={[
              "rounded-xl border p-3 text-left text-[13px] font-medium capitalize transition",
              theme === t ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:bg-muted",
            ].join(" ")}
          >
            <div className={["mb-2 h-12 rounded-lg", t === "light" ? "bg-white border border-border" : t === "dark" ? "bg-[#0f1729]" : "bg-gradient-to-r from-white to-[#0f1729]"].join(" ")} />
            {t}
          </button>
        ))}
      </div>

      <p className="mt-6 text-[13px] font-medium">Accent color</p>
      <div className="mt-2 flex gap-2">
        {accents.map((c) => (
          <button
            key={c}
            onClick={() => updatePreferences({ accentColor: c })}
            className="grid h-9 w-9 place-items-center rounded-full transition"
            style={{ background: c, boxShadow: accent === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : "none" }}
            aria-label={c}
          >
            {accent === c && <Check className="h-4 w-4 text-white" />}
          </button>
        ))}
      </div>

      <p className="mt-6 text-[13px] font-medium">Density</p>
      <p className="text-[12px] text-muted-foreground">Adjust the spacing between elements in lists and tables.</p>
      <div className="mt-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
          <input type="radio" name="density" checked={density === "comfortable"} onChange={() => updatePreferences({ density: "comfortable" })} className="h-4 w-4 accent-primary" /> Comfortable
        </label>
        <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
          <input type="radio" name="density" checked={density === "compact"} onChange={() => updatePreferences({ density: "compact" })} className="h-4 w-4 accent-primary" /> Compact
        </label>
      </div>
    </Section>
  );
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, show } = useToast();

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      return show("New password and confirm password do not match", "error");
    }
    if (newPassword.length < 6) {
      return show("Password must be at least 6 characters", "error");
    }

    setLoading(true);
    try {
      await ApiService.changePassword({ currentPassword, newPassword, confirmPassword });
      show("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      show(e?.response?.data?.error || "Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={[
          "flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium shadow-sm mb-4",
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        ].join(" ")}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
      <Section title="Security" desc="Keep your account safe and secure.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Current password"><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className={inputCls} /></Field>
          <div />
          <Field label="New password"><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className={inputCls} /></Field>
          <Field label="Confirm new password"><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputCls} /></Field>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            onClick={handleUpdatePassword} 
            className="rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </div>
      </Section>
    </div>
  );
}