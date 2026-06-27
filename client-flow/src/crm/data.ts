export type LeadStatus = string;

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  owner: string;
  ownerId?: string | null;
  value: number;
  status: LeadStatus;
  createdAt: string;
  lastContact: string;
  avatar: string;
  location?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

const firstNames = ["Aarav","Priya","Marcus","Sofia","Liam","Noah","Ava","Mia","Ethan","Olivia","Ryan","Zara","Diego","Hana","Yuki","Chen","Amara","Leon","Nora","Theo","Iris","Kai","Maya","Jonas","Eva","Omar","Rhea","Sara","Vera","Felix","Anya","Ivan","Lila","Aria","Hugo","Luca"];
const lastNames = ["Patel","Sharma","Lee","Garcia","Khan","Singh","Brown","Davis","Martinez","Wilson","Anderson","Taylor","Thomas","Walker","Hall","Young","Lopez","Hernandez","King","Wright","Scott","Green","Adams","Baker","Nguyen","Kim","Rossi","Müller","Schmidt","Nakamura","Costa"];
const companies = ["Acme Inc","Globex","Initech","Umbrella","Hooli","Soylent","Massive Dynamic","Stark Industries","Wayne Enterprises","Wonka","Pied Piper","Cyberdyne","Aperture","Tyrell","Vehement"];
const sources = ["Website","Referral","LinkedIn","Cold Call","Event","Advertisement","Email Campaign"];
const owners = ["Sarah Chen","Marcus Wong","Priya Patel","David Kim","Elena Rossi"];
const statuses: LeadStatus[] = ["New","Contacted","Follow-Up","Closed"];

function seeded(i: number) {
  // deterministic pseudo random
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export const leads: Lead[] = Array.from({ length: 48 }, (_, i) => {
  const r = (n: number) => Math.floor(seeded(i + n) * 1000);
  const fn = firstNames[r(1) % firstNames.length];
  const ln = lastNames[r(2) % lastNames.length];
  const status = statuses[r(3) % statuses.length];
  const company = companies[r(4) % companies.length];
  const owner = owners[r(5) % owners.length];
  const source = sources[r(6) % sources.length];
  const daysAgo = r(7) % 60;
  const lastDays = r(8) % 14;
  const value = 1000 + (r(9) % 50) * 500;
  const date = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const lastContact = new Date(Date.now() - lastDays * 86400000).toISOString();
  return {
    id: `LD-${(1000 + i).toString()}`,
    name: `${fn} ${ln}`,
    company,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
    phone: `+1 (555) ${(100 + (r(10) % 899)).toString()}-${(1000 + (r(11) % 8999)).toString()}`,
    source,
    owner,
    value,
    status,
    createdAt: date,
    lastContact,
    avatar: `${fn[0]}${ln[0]}`,
  };
});

export interface CrmUser {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  status: "Active" | "Away" | "Offline";
  leads: number;
  initials: string;
}

export const users: CrmUser[] = [
  { id: "U-1", name: "Sarah Chen", email: "sarah.chen@pulse.io", role: "Sales Manager", team: "Enterprise", status: "Active", leads: 42, initials: "SC" },
  { id: "U-2", name: "Marcus Wong", email: "marcus@pulse.io", role: "Account Executive", team: "Enterprise", status: "Active", leads: 31, initials: "MW" },
  { id: "U-3", name: "Priya Patel", email: "priya@pulse.io", role: "SDR", team: "Mid-Market", status: "Away", leads: 56, initials: "PP" },
  { id: "U-4", name: "David Kim", email: "david@pulse.io", role: "Account Executive", team: "SMB", status: "Active", leads: 24, initials: "DK" },
  { id: "U-5", name: "Elena Rossi", email: "elena@pulse.io", role: "Customer Success", team: "Retention", status: "Offline", leads: 18, initials: "ER" },
  { id: "U-6", name: "James O'Connor", email: "james@pulse.io", role: "SDR", team: "SMB", status: "Active", leads: 37, initials: "JO" },
  { id: "U-7", name: "Aiko Tanaka", email: "aiko@pulse.io", role: "Sales Ops", team: "Operations", status: "Active", leads: 0, initials: "AT" },
  { id: "U-8", name: "Noah Becker", email: "noah@pulse.io", role: "Account Executive", team: "Mid-Market", status: "Away", leads: 29, initials: "NB" },
];

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  company: string;
  type: "Call" | "Email" | "Meeting" | "Demo";
  due: string;
  owner: string;
  notes: string;
  completed: boolean;
}

export const followUps: FollowUp[] = [
  { id: "F-1", leadId: "LD-1000", leadName: leads[0].name, company: leads[0].company, type: "Call", due: new Date(Date.now() + 2*3600000).toISOString(), owner: "Sarah Chen", notes: "Confirm contract terms and pricing tier.", completed: false },
  { id: "F-2", leadId: "LD-1001", leadName: leads[1].name, company: leads[1].company, type: "Email", due: new Date(Date.now() + 5*3600000).toISOString(), owner: "Marcus Wong", notes: "Send follow-up deck and case studies.", completed: false },
  { id: "F-3", leadId: "LD-1002", leadName: leads[2].name, company: leads[2].company, type: "Demo", due: new Date(Date.now() + 26*3600000).toISOString(), owner: "Priya Patel", notes: "Product demo with technical stakeholders.", completed: false },
  { id: "F-4", leadId: "LD-1003", leadName: leads[3].name, company: leads[3].company, type: "Meeting", due: new Date(Date.now() - 1*86400000).toISOString(), owner: "David Kim", notes: "Quarterly business review.", completed: true },
  { id: "F-5", leadId: "LD-1004", leadName: leads[4].name, company: leads[4].company, type: "Call", due: new Date(Date.now() - 3*86400000).toISOString(), owner: "Elena Rossi", notes: "Discovery call for renewal expansion.", completed: true },
  { id: "F-6", leadId: "LD-1005", leadName: leads[5].name, company: leads[5].company, type: "Email", due: new Date(Date.now() + 4*86400000).toISOString(), owner: "Sarah Chen", notes: "Procurement & legal questions.", completed: false },
  { id: "F-7", leadId: "LD-1006", leadName: leads[6].name, company: leads[6].company, type: "Call", due: new Date(Date.now() + 1*86400000).toISOString(), owner: "James O'Connor", notes: "Intro call after demo request.", completed: false },
];

export interface Activity {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "deal" | "task";
  title: string;
  detail: string;
  who: string;
  when: string;
}

export const activities: Activity[] = [
  { id: "A-1", type: "deal", title: "Deal closed — Acme Inc", detail: "₹24,500 — Annual subscription, Enterprise tier", who: "Sarah Chen", when: new Date(Date.now() - 30*60000).toISOString() },
  { id: "A-2", type: "call", title: "Call with Priya Patel", detail: "Discussed pricing and onboarding timeline (32 min)", who: "Marcus Wong", when: new Date(Date.now() - 2*3600000).toISOString() },
  { id: "A-3", type: "email", title: "Sent proposal to Globex", detail: "Proposal v3 attached — awaiting feedback", who: "Priya Patel", when: new Date(Date.now() - 5*3600000).toISOString() },
  { id: "A-4", type: "meeting", title: "Demo with Hooli", detail: "Product demo scheduled for Thursday 3:00pm", who: "David Kim", when: new Date(Date.now() - 9*3600000).toISOString() },
  { id: "A-5", type: "note", title: "Added note to Wonka", detail: "Champion identified — looping in their CTO next week", who: "Elena Rossi", when: new Date(Date.now() - 1*86400000).toISOString() },
  { id: "A-6", type: "task", title: "Task completed", detail: "Sent renewal quote to Initech", who: "Sarah Chen", when: new Date(Date.now() - 1.4*86400000).toISOString() },
  { id: "A-7", type: "call", title: "Cold call — Massive Dynamic", detail: "No answer — voicemail left", who: "James O'Connor", when: new Date(Date.now() - 2*86400000).toISOString() },
  { id: "A-8", type: "deal", title: "New deal created", detail: "Tyrell Corporation — ₹48,000 opportunity", who: "Noah Becker", when: new Date(Date.now() - 3*86400000).toISOString() },
];

export const activityLogs = [
  { id: 12, user: "David", initials: "D", module: "Leads", action: "Communication Added", details: "Sent Project Proposal via Email", ip: "192.168.1.104", timestamp: "Today, 06:15 PM", type: "Email" },
  { id: 11, user: "David", initials: "D", module: "Leads", action: "Site Visit Completed", details: "Visited client HQ for presentation", ip: "192.168.1.104", timestamp: "Today, 05:45 PM", type: "Site visit" },
  { id: 10, user: "Manager", initials: "M", module: "Meetings", action: "Meeting Scheduled", details: "Scheduled Sync with Stakeholders", ip: "192.168.1.100", timestamp: "Today, 05:30 PM", type: "Meeting" },
  { id: 9, user: "John", initials: "J", module: "Leads", action: "Communication Added", details: "WhatsApp message sent to lead", ip: "192.168.1.105", timestamp: "Today, 05:15 PM", type: "WhatsApp" },
  { id: 8, user: "David", initials: "D", module: "Leads", action: "Lead Closed", details: "Lead Closed", ip: "192.168.1.104", timestamp: "Today, 05:00 PM", type: "Note" },
  { id: 7, user: "David", initials: "D", module: "Leads", action: "Follow-Up Updated", details: "Follow-Up Marked as Completed", ip: "192.168.1.104", timestamp: "Today, 03:00 PM", type: "Followup" },
  { id: 6, user: "Manager", initials: "M", module: "Leads", action: "Lead Reassigned", details: "Lead Reassigned from John to David", ip: "192.168.1.100", timestamp: "Today, 02:00 PM", type: "Note" },
  { id: 5, user: "John", initials: "J", module: "Leads", action: "Follow-Up Added", details: "Follow-Up Scheduled", ip: "192.168.1.105", timestamp: "Today, 12:00 PM", type: "Followup" },
  { id: 4, user: "John", initials: "J", module: "Leads", action: "Lead Status Changed", details: "Status Changed from New to Contacted", ip: "192.168.1.105", timestamp: "Today, 11:00 AM", type: "Note" },
  { id: 3, user: "John", initials: "J", module: "Leads", action: "Communication Added", details: "Call Log Added", ip: "192.168.1.105", timestamp: "Today, 10:30 AM", type: "Call" },
  { id: 2, user: "System", initials: "S", module: "Leads", action: "Lead Assigned", details: "Lead Assigned to John", ip: "192.168.1.100", timestamp: "Today, 10:05 AM", type: "Note" },
  { id: 1, user: "System", initials: "S", module: "Leads", action: "Lead Created", details: "Lead Created from web form", ip: "192.168.1.100", timestamp: "Today, 10:00 AM", type: "Note" }
];



export const sourceBreakdown = [
  { name: "Website", value: 38 },
  { name: "Referral", value: 24 },
  { name: "LinkedIn", value: 18 },
  { name: "Events", value: 12 },
  { name: "Cold Call", value: 8 },
];

export const weeklyActivity = [
  { day: "Mon", calls: 24, emails: 42 },
  { day: "Tue", calls: 31, emails: 38 },
  { day: "Wed", calls: 28, emails: 51 },
  { day: "Thu", calls: 35, emails: 47 },
  { day: "Fri", calls: 41, emails: 56 },
  { day: "Sat", calls: 12, emails: 18 },
  { day: "Sun", calls: 8, emails: 9 },
];

export function statusColor(s: string) {
  switch (s) {
    case "New": return "bg-blue-100 text-blue-700";
    case "Contacted": return "bg-purple-100 text-purple-700";
    case "Follow-Up": return "bg-orange-100 text-orange-700";
    case "Proposal Sent": return "bg-indigo-100 text-indigo-700";
    case "Negotiation": return "bg-amber-100 text-amber-700";
    case "Closed Won":
    case "Closed": return "bg-green-100 text-green-700";
    case "Closed Lost": return "bg-red-100 text-red-700";
    default: return "bg-slate-100 text-slate-700";
  }
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}