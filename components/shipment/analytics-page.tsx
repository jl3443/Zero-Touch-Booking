"use client"

import { useState, useEffect } from "react"
import { SHIPMENTS, EXCEPTION_DISTRIBUTION, AGENT_ACTIVITIES, LANE_PERFORMANCE, DD_RISKS } from "@/lib/mock-data"
import { AgentActivityLog } from "./agent-activity-log"
import { cn } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import { TrendingUp, AlertTriangle, Clock, CheckCircle2, BarChart2, Brain, DollarSign, Leaf, Route, Globe, PhoneCall, RefreshCw, Send, Timer } from "lucide-react"

function PhoneCallIcon() { return <PhoneCall size={16} /> }
function RecalcIcon() { return <RefreshCw size={16} /> }
function SendIcon() { return <Send size={16} /> }
function ClockIcon() { return <Timer size={16} /> }

// ── Derived data ──────────────────────────────────────────────────────────────

const delayByCarrier = Object.values(
  SHIPMENTS.reduce<Record<string, { carrier: string; totalDelay: number; count: number }>>(
    (acc, s) => {
      if (!acc[s.carrier]) acc[s.carrier] = { carrier: s.carrier, totalDelay: 0, count: 0 }
      acc[s.carrier].totalDelay += s.delayHours
      acc[s.carrier].count += 1
      return acc
    },
    {}
  )
).map((d) => ({ carrier: d.carrier.split(" ")[0], avgDelay: Math.round(d.totalDelay / d.count) }))
  .sort((a, b) => b.avgDelay - a.avgDelay)

const modeSplit = [
  { name: "Ocean", value: SHIPMENTS.filter((s) => s.mode === "Ocean").length, color: "#3B82F6" },
  { name: "Air", value: SHIPMENTS.filter((s) => s.mode === "Air").length, color: "#6366F1" },
  { name: "Road", value: SHIPMENTS.filter((s) => s.mode === "Road").length, color: "#F59E0B" },
]

const severityCounts = [
  { label: "Critical", value: SHIPMENTS.filter((s) => s.severity === "Critical").length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { label: "High", value: SHIPMENTS.filter((s) => s.severity === "High").length, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  { label: "Medium", value: SHIPMENTS.filter((s) => s.severity === "Medium").length, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  { label: "Low", value: SHIPMENTS.filter((s) => s.severity === "Low").length, color: "text-green-600", bg: "bg-green-50 border-green-200" },
]

const exceptionData = EXCEPTION_DISTRIBUTION.filter((e) => e.count > 0)

const agentActionCounts = AGENT_ACTIVITIES.reduce<Record<string, number>>((acc, a) => {
  acc[a.actionType] = (acc[a.actionType] || 0) + 1
  return acc
}, {})

const agentBarData = Object.entries(agentActionCounts).map(([type, count]) => ({ type, count }))

// ── Component ─────────────────────────────────────────────────────────────────

export function AnalyticsPage({ etaUpdatedCount = 5 }: { etaUpdatedCount?: number }) {
  const [insightThinking, setInsightThinking] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setInsightThinking(false), 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1400px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/10 flex items-center justify-center">
            <BarChart2 size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
            <p className="text-xs text-gray-400">Performance overview · March 2025 · 7 active shipments</p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Delay Hours", value: `${SHIPMENTS.reduce((s, x) => s + x.delayHours, 0)}h`, icon: <Clock size={16} />, color: "text-red-600" },
            { label: "Avg Delay / Shipment", value: `${Math.round(SHIPMENTS.reduce((s, x) => s + x.delayHours, 0) / SHIPMENTS.length)}h`, icon: <TrendingUp size={16} />, color: "text-amber-600" },
            { label: "At-Risk Shipments", value: `${SHIPMENTS.filter((s) => s.severity !== "Low").length} / ${SHIPMENTS.length}`, icon: <AlertTriangle size={16} />, color: "text-orange-600" },
            { label: "ETA Confirmed (24h)", value: `${etaUpdatedCount}`, icon: <CheckCircle2 size={16} />, color: "text-green-600" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("shrink-0", k.color)}>{k.icon}</span>
                <span className="text-[11px] text-gray-400 font-medium">{k.label}</span>
              </div>
              <div className={cn("text-2xl font-bold", k.color)}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4">

          {/* Exception distribution */}
          <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Exception Types</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={exceptionData}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {exceptionData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {exceptionData.map((e) => (
                <div key={e.type} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="text-gray-600">{e.type}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{e.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Avg delay by carrier */}
          <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Avg Delay by Carrier (h)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={delayByCarrier} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="carrier" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
                <Tooltip cursor={{ fill: "#f3f4f6" }} formatter={(v) => [`${v}h`, "Avg Delay"]} />
                <Bar dataKey="avgDelay" radius={[0, 4, 4, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mode split + severity */}
          <div className="col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Transport Mode Split</h3>
              <div className="space-y-2">
                {modeSplit.map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-10">{m.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(m.value / SHIPMENTS.length) * 100}%`, background: m.color }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-4">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Severity Breakdown</h3>
              <div className="grid grid-cols-2 gap-2">
                {severityCounts.map((s) => (
                  <div key={s.label} className={cn("rounded-lg border px-3 py-2 text-center", s.bg)}>
                    <div className={cn("text-xl font-bold", s.color)}>{s.value}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Agent actions bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} className="text-blue-600" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Action Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={agentBarData} margin={{ left: 0, right: 0 }}>
              <XAxis dataKey="type" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#f3f4f6" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ETA Confidence by shipment */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">ETA Confidence by Shipment</h3>
          <div className="space-y-2">
            {SHIPMENTS.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="font-mono text-xs text-blue-700 w-24 shrink-0">{s.id}</span>
                <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{s.carrier}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", s.etaConfidence >= 80 ? "bg-green-500" : s.etaConfidence >= 60 ? "bg-amber-400" : "bg-red-500")}
                    style={{ width: `${s.etaConfidence}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{s.etaConfidence}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lane Performance — inspired by project44 lane-level OTIF */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Route size={14} className="text-indigo-600" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lane Performance (OTIF)</h3>
            <span className="ml-auto text-[10px] text-gray-400">{LANE_PERFORMANCE.length} active lanes</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Lane", "Mode", "OTIF %", "Avg Transit", "Active", "Avg Delay", "Risk", "Preferred Carrier"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...LANE_PERFORMANCE].sort((a, b) => a.otifPercent - b.otifPercent).map((l, i) => (
                <tr key={l.lane} className={cn("border-b border-gray-50", i % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                  <td className="px-3 py-2 font-mono font-semibold text-blue-700">{l.lane}</td>
                  <td className="px-3 py-2 text-gray-500">{l.mode}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", l.otifPercent >= 75 ? "bg-green-500" : l.otifPercent >= 55 ? "bg-amber-400" : "bg-red-500")}
                          style={{ width: `${l.otifPercent}%` }}
                        />
                      </div>
                      <span className={cn("font-semibold", l.otifPercent >= 75 ? "text-green-700" : l.otifPercent >= 55 ? "text-amber-700" : "text-red-700")}>
                        {l.otifPercent}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{l.avgTransitDays}d</td>
                  <td className="px-3 py-2 text-center text-gray-700">{l.activeShipments}</td>
                  <td className="px-3 py-2">
                    <span className={cn("font-medium", l.avgDelayHours > 24 ? "text-red-600" : l.avgDelayHours > 12 ? "text-amber-600" : "text-gray-600")}>
                      +{l.avgDelayHours}h
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "text-[10px] font-semibold border rounded-full px-2 py-0.5",
                      l.riskLevel === "Critical" ? "bg-red-50 border-red-200 text-red-700" :
                      l.riskLevel === "High"     ? "bg-amber-50 border-amber-200 text-amber-700" :
                      l.riskLevel === "Medium"   ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                      "bg-green-50 border-green-200 text-green-700"
                    )}>{l.riskLevel}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{l.preferredCarrier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* D&D Exposure + Sustainability — two-column */}
        <div className="grid grid-cols-2 gap-4">

          {/* D&D Exposure — inspired by FourKites Dynamic Ocean */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={14} className="text-red-600" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Detention &amp; Demurrage Exposure</h3>
            </div>
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-red-700 font-medium">Total Accrued</span>
              <span className="text-lg font-bold text-red-700">
                ${DD_RISKS.reduce((s, r) => s + r.totalExposureUSD, 0).toLocaleString()}
              </span>
            </div>
            <div className="space-y-2">
              {DD_RISKS.map((r) => (
                <div key={r.shipmentId} className="flex items-center justify-between text-[11px] rounded-md border border-gray-100 px-3 py-2 bg-gray-50/40">
                  <div>
                    <span className="font-mono font-bold text-blue-700">{r.shipmentId}</span>
                    <span className="ml-2 text-gray-400">{r.port}</span>
                  </div>
                  <div className="text-right">
                    <span className={cn("font-semibold", r.status === "accumulating" ? "text-red-600" : r.status === "at-risk" ? "text-amber-600" : "text-green-600")}>
                      {r.totalExposureUSD > 0 ? `$${r.totalExposureUSD.toLocaleString()}` : "Exposure Risk"}
                    </span>
                    <div className="text-[10px] text-gray-400">{r.daysExposed}d · ${r.dailyRateUSD}/day</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sustainability — inspired by FourKites + Flexport carbon dashboards */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Leaf size={14} className="text-green-600" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated CO₂ Emissions</h3>
            </div>
            <div className="mb-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-green-700 font-medium">Fleet Total (est.)</span>
              <span className="text-lg font-bold text-green-700">24.7 tCO₂e</span>
            </div>
            <div className="space-y-2">
              {[
                { mode: "Ocean", shipments: 4, co2: "18.2", unit: "tCO₂e", color: "bg-blue-500", pct: 74 },
                { mode: "Air",   shipments: 2, co2: "5.9",  unit: "tCO₂e", color: "bg-indigo-500", pct: 24 },
                { mode: "Road",  shipments: 1, co2: "0.6",  unit: "tCO₂e", color: "bg-amber-500", pct: 2 },
              ].map((m) => (
                <div key={m.mode} className="text-[11px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-600 font-medium">{m.mode} ({m.shipments} shipments)</span>
                    <span className="font-semibold text-gray-800">{m.co2} {m.unit}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className={cn("h-full rounded-full", m.color)} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-400 pt-1">Estimates based on GLEC Framework v3. Methodology: ETW-compliant.</p>
            </div>
          </div>

        </div>

        {/* Cross-Region Corridor Analysis */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-blue-600" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cross-Region Corridor Performance</h3>
          </div>

          {/* Corridor summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                corridor: "APAC → Americas",
                sub: "Trans-Pacific",
                shipments: 5,
                avgDelay: 19,
                otif: 20,
                topException: "Customs Hold",
                riskLevel: "Critical",
                ids: ["SHP-40672", "SHP-70991", "SHP-10421", "SHP-20334", "SHP-50219"],
                borderColor: "border-l-red-500",
                badgeColor: "bg-red-50 border-red-200 text-red-700",
                delayColor: "text-red-600",
                note: "Highest volume corridor. Port congestion at LA/LB compounding air cargo dwell delays.",
              },
              {
                corridor: "APAC → EMEA",
                sub: "Asia–Europe",
                shipments: 1,
                avgDelay: 12,
                otif: 0,
                topException: "Missing Signal",
                riskLevel: "High",
                ids: ["SHP-30188"],
                borderColor: "border-l-amber-400",
                badgeColor: "bg-amber-50 border-amber-200 text-amber-700",
                delayColor: "text-amber-600",
                note: "Signal gaps on Mumbai–Rotterdam route. Last GPS ping 36h ago at Arabian Sea.",
              },
              {
                corridor: "Americas (Intra)",
                sub: "Domestic",
                shipments: 1,
                avgDelay: 6,
                otif: 0,
                topException: "Traffic Disruption",
                riskLevel: "Medium",
                ids: ["SHP-60441"],
                borderColor: "border-l-yellow-400",
                badgeColor: "bg-yellow-50 border-yellow-200 text-yellow-700",
                delayColor: "text-yellow-600",
                note: "I-40 incident causing minor delay. Road conditions improving; likely self-resolving.",
              },
            ].map((c) => (
              <div key={c.corridor} className={cn("bg-white rounded-xl border border-gray-200 border-l-4 p-4", c.borderColor)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs font-bold text-gray-800">{c.corridor}</div>
                    <div className="text-[10px] text-gray-400">{c.sub}</div>
                  </div>
                  <span className={cn("text-[9px] font-semibold border rounded-full px-2 py-0.5", c.badgeColor)}>
                    {c.riskLevel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800">{c.shipments}</div>
                    <div className="text-[9px] text-gray-400">Shipments</div>
                  </div>
                  <div className="text-center">
                    <div className={cn("text-lg font-bold", c.delayColor)}>+{c.avgDelay}h</div>
                    <div className="text-[9px] text-gray-400">Avg Delay</div>
                  </div>
                  <div className="text-center">
                    <div className={cn("text-lg font-bold", c.otif >= 75 ? "text-green-600" : c.otif >= 50 ? "text-amber-600" : "text-red-600")}>
                      {c.otif}%
                    </div>
                    <div className="text-[9px] text-gray-400">OTIF</div>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 bg-gray-50 rounded-md px-2 py-1.5 mb-2">
                  <span className="font-semibold text-gray-600">Top exception:</span> {c.topException}
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed">{c.note}</p>

                <div className="flex flex-wrap gap-1 mt-2">
                  {c.ids.map((id) => (
                    <span key={id} className="text-[9px] font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">{id}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Corridor comparison table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Corridor Detail — All Active Shipments</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Shipment", "Corridor", "Carrier", "Mode", "Delay", "Exception", "ETA Status", "Action Priority"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { id: "SHP-20334", corridor: "APAC → Americas", carrier: "DHL",    mode: "Air",   delay: 44, exception: "Customs Hold",       etaStatus: "At Risk",   action: "Urgent" },
                  { id: "SHP-70991", corridor: "APAC → Americas", carrier: "Emirates", mode: "Air", delay: 24, exception: "Long Dwell",         etaStatus: "Delayed",   action: "High" },
                  { id: "SHP-10421", corridor: "APAC → Americas", carrier: "COSCO",  mode: "Ocean", delay: 18, exception: "Schedule Slippage", etaStatus: "Delayed",   action: "High" },
                  { id: "SHP-40672", corridor: "APAC → Americas", carrier: "FedEx",  mode: "Air",   delay: 10, exception: "Weather Disruption", etaStatus: "Delayed",   action: "High" },
                  { id: "SHP-30188", corridor: "APAC → EMEA",     carrier: "Maersk", mode: "Ocean", delay: 12, exception: "Missing Signal",    etaStatus: "Unknown",   action: "Medium" },
                  { id: "SHP-60441", corridor: "Americas (Intra)", carrier: "Schneider", mode: "Road", delay: 6, exception: "Traffic Disruption", etaStatus: "Delayed", action: "Low" },
                  { id: "SHP-50219", corridor: "APAC → Americas", carrier: "MSC",    mode: "Ocean", delay: 0,  exception: "Conflicting Sources", etaStatus: "On Time",  action: "Monitor" },
                ].map((r, i) => {
                  const actionColors: Record<string, string> = {
                    Urgent:  "bg-red-50 border-red-200 text-red-700",
                    High:    "bg-amber-50 border-amber-200 text-amber-700",
                    Medium:  "bg-yellow-50 border-yellow-200 text-yellow-700",
                    Low:     "bg-blue-50 border-blue-200 text-blue-700",
                    Monitor: "bg-gray-50 border-gray-200 text-gray-600",
                  }
                  return (
                    <tr key={r.id} className={cn("border-b border-gray-50", i % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                      <td className="px-3 py-2 font-mono font-bold text-blue-700">{r.id}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.corridor}</td>
                      <td className="px-3 py-2 text-gray-600">{r.carrier}</td>
                      <td className="px-3 py-2 text-gray-500">{r.mode}</td>
                      <td className="px-3 py-2">
                        <span className={cn("font-semibold", r.delay > 20 ? "text-red-600" : r.delay > 0 ? "text-amber-600" : "text-green-600")}>
                          {r.delay > 0 ? `+${r.delay}h` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.exception}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-[10px] font-semibold rounded-full px-2 py-0.5",
                          r.etaStatus === "On Time" ? "bg-green-50 text-green-700" :
                          r.etaStatus === "Unknown" ? "bg-gray-100 text-gray-600" :
                          "bg-red-50 text-red-700"
                        )}>
                          {r.etaStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", actionColors[r.action])}>
                          {r.action}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Agent corridor insight */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Brain size={13} className={`text-indigo-600 mt-0.5 shrink-0 ${insightThinking ? "animate-pulse" : ""}`} />
            {insightThinking ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="text-xs text-indigo-600 font-medium">Analyzing corridors</span>
                <span className="inline-flex items-end gap-[3px] ml-0.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }} />
                  ))}
                </span>
              </div>
            ) : (
              <p className="text-xs text-indigo-700 leading-relaxed">
                <span className="font-semibold">Agent insight:</span> APAC→Americas corridor carries 71% of portfolio by shipment count but accounts for 87% of total delay hours.
                Customs holds at US CBP ports (ORD) are the primary escalation driver this week. Recommend reviewing TSCA pre-clearance SOP with procurement for affected commodity classes.
              </p>
            )}
          </div>
        </div>

        {/* Agent Automation Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} className="text-indigo-600" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Automation Summary</h3>
            <span className="ml-auto text-[10px] text-gray-400">Rolling 7 days</span>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Auto Carrier Queries", value: "12", sub: "portal + email", icon: <PhoneCallIcon />, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
              { label: "ETA Recalculations", value: "18", sub: "6 pending approval", icon: <RecalcIcon />, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
              { label: "Notifications Drafted", value: "9", sub: "5 sent by team", icon: <SendIcon />, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
              { label: "Coordinator Time Saved", value: "~2.8h", sub: "per active exception", icon: <ClockIcon />, color: "text-green-600", bg: "bg-green-50 border-green-100" },
            ].map((m) => (
              <div key={m.label} className={cn("rounded-lg border px-3 py-3", m.bg)}>
                <div className={cn("text-xl font-bold mb-0.5", m.color)}>{m.value}</div>
                <div className="text-[11px] font-medium text-gray-700 leading-tight">{m.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <Brain size={11} className={`text-indigo-500 mt-0.5 shrink-0 ${insightThinking ? "animate-pulse" : ""}`} />
            {insightThinking ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="text-[11px] text-indigo-600 font-medium">Computing automation metrics</span>
                <span className="inline-flex items-end gap-[3px] ml-0.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }} />
                  ))}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Agent handled <strong>100%</strong> of initial carrier portal lookups autonomously this week,
                escalating only 2 cases requiring human override. Estimated <strong>~2.8h coordinator time saved per active exception</strong> based on manual task baseline (4.1h) vs. agent-assisted workflow (1.3h).
              </p>
            )}
          </div>
        </div>

        {/* Recent agent activity */}
        <AgentActivityLog condensed maxItems={5} />
      </div>
    </div>
  )
}
