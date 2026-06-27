import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, Target, Award, Percent } from "lucide-react";
import { PageHeader, Card } from "@/crm/AppLayout";
import { ApiService } from "@/crm/api";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Pulse CRM" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [reports, setReports] = useState<any>(null);
  const [weeklyPipeline, setWeeklyPipeline] = useState<any[]>([]);
  const [pipelineRange, setPipelineRange] = useState("weekly");

  useEffect(() => {
    const fetchReports = () => {
      ApiService.getDashboardSummary(pipelineRange).then((res) => {
        setWeeklyPipeline(res.weeklyPipeline || []);
      }).catch(console.error);

      ApiService.getReportsSummary().then((res) => {
        setReports(res);
      }).catch(console.error);
    };

    fetchReports();
    window.addEventListener("leads-updated", fetchReports);
    return () => window.removeEventListener("leads-updated", fetchReports);
  }, [pipelineRange]);

  const cards = [
    { label: "Revenue (MTD)", value: `₹${(reports?.cards?.mtdRevenue || 0).toLocaleString()}`, change: "Current Month", icon: TrendingUp, tint: "bg-[var(--tint-green)]", color: "text-[#166534]" },
    { label: "Conversion Rate", value: `${reports?.cards?.conversionRate || 0}%`, change: "Closed deals / Total deals", icon: Percent, tint: "bg-[var(--tint-blue)]", color: "text-[#1d4ed8]" },
    { label: "Avg. Deal Size", value: `₹${(reports?.cards?.avgDealSize || 0).toLocaleString()}`, change: "Of won deals", icon: Target, tint: "bg-[var(--tint-orange)]", color: "text-[#9a3412]" },
    { label: "Top Performer", value: reports?.cards?.topPerformer || "N/A", change: `${reports?.cards?.topPerformerDeals || 0} deals won`, icon: Award, tint: "bg-[var(--tint-red)]", color: "text-[#991b1b]" },
  ];

  const repPerformance = reports?.repPerformance || [];
  const weeklyActivityLive = reports?.weeklyActivity || [];

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Track performance across your team and pipeline" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-5">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${c.tint}`}>
                <Icon className={`h-6 w-6 ${c.color}`} />
              </div>
              <p className="mt-4 text-[14px] text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-[24px] font-bold tracking-tight">{c.value}</p>
              <p className="mt-1 text-[14px] font-medium text-[#166534]">{c.change}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold">Pipeline Trend</h3>
              <p className="text-[14px] text-muted-foreground">Generated vs Closed deals</p>
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
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={weeklyPipeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={14} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={14} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <Line type="monotone" dataKey="closed" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-[16px] font-semibold">Rep Performance</h3>
          <p className="text-[14px] text-muted-foreground">Leads handled vs closed</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={repPerformance} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={14} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={14} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 14 }} />
                <Bar dataKey="leads" fill="#2563eb" radius={[16, 16, 0, 0]} />
                <Bar dataKey="closed" fill="#22c55e" radius={[16, 16, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="text-[16px] font-semibold">Weekly Activity Volume</h3>
        <p className="text-[14px] text-muted-foreground">Calls and emails by day</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={weeklyActivityLive} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={14} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={14} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", fontSize: 14 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 14 }} />
              <Bar dataKey="calls" stackId="a" fill="#2563eb" />
              <Bar dataKey="emails" stackId="a" fill="#f97316" radius={[16, 16, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}