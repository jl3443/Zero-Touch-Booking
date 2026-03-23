"use client"

import { useState, useEffect } from "react"
import {
  LANE_PERFORMANCE,
  CARRIER_SCORECARDS,
  BOOKING_REQUESTS,
  RATE_TRENDS,
  CONTRACT_ALERTS,
  AI_RATE_RECOMMENDATIONS,
  type LaneRateTrend,
} from "@/lib/mock-data"
import { ModeIcon } from "./shared"
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Brain, Calendar, ArrowRight, Loader2, Lock,
  RefreshCw, Eye, Zap, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

// ── Thinking Dots ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span className="inline-flex items-end gap-[3px] ml-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  )
}

// ── Rate Comparison derived from existing data ──────────────────────────────

interface RateRow {
  lane: string
  mode: string
  carrier: string
  contractRate: number
  spotRate: number
  agentRate: number
  variance: number
  saving: number
}

function buildRateRows(): RateRow[] {
  return RATE_TRENDS.map((lt) => {
    const latest = lt.dataPoints[lt.dataPoints.length - 1]
    const variance = ((latest.spotRate - latest.contractRate) / latest.contractRate) * 100
    const saving = latest.spotRate - latest.agentNegotiated
    return {
      lane: lt.lane,
      mode: lt.mode,
      carrier: lt.carrier,
      contractRate: latest.contractRate,
      spotRate: latest.spotRate,
      agentRate: latest.agentNegotiated,
      variance: Math.round(variance * 10) / 10,
      saving,
    }
  })
}

// ── Recommendation type config ──────────────────────────────────────────────

const REC_CONFIG: Record<string, { icon: typeof TrendingUp; color: string; bg: string; border: string }> = {
  renegotiate: { icon: RefreshCw, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  switch: { icon: ArrowRight, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  "lock-in": { icon: Lock, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  monitor: { icon: Eye, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
}

const ALERT_CONFIG: Record<string, { color: string; border: string }> = {
  urgent: { color: "text-red-600", border: "border-l-red-500" },
  warning: { color: "text-amber-600", border: "border-l-amber-500" },
  info: { color: "text-blue-600", border: "border-l-blue-500" },
}

// ── Main Component ───────────────────────────────────────────────────────────

export function RateIntelligencePage() {
  const [thinking, setThinking] = useState(true)
  const [activeTrend, setActiveTrend] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 1800)
    return () => clearTimeout(t)
  }, [])

  const rateRows = buildRateRows()
  const parseRate = (s: string) => parseInt(s.replace(/[^0-9]/g, ""))
  const totalContractValue = LANE_PERFORMANCE.reduce((sum, lp) => sum + parseRate(lp.contractRate) * lp.bookingsPerMonth, 0)
  const potentialSavings = AI_RATE_RECOMMENDATIONS.filter((r) => r.potentialSavings !== "N/A")
    .reduce((sum, r) => sum + parseInt(r.potentialSavings.replace(/[^0-9]/g, "")), 0)
  const avgVariance = Math.round(rateRows.reduce((s, r) => s + r.variance, 0) / rateRows.length * 10) / 10
  const expiringCount = CONTRACT_ALERTS.filter((a) => a.daysRemaining < 60).length

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1400px] mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Rate Intelligence</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Contract vs market rate analysis, AI negotiation recommendations, and contract expiry alerts
            </p>
          </div>
        </div>

        {/* ── KPI Strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Value", value: `$${Math.round(totalContractValue / 1000)}K`, icon: <DollarSign size={14} />, color: "border-l-green-500", textColor: "text-green-600" },
            { label: "Savings", value: `$${potentialSavings.toLocaleString()}`, icon: <TrendingDown size={14} />, color: "border-l-indigo-500", textColor: "text-indigo-600" },
            { label: "Spread", value: `+${avgVariance}%`, icon: <TrendingUp size={14} />, color: "border-l-amber-500", textColor: "text-amber-600" },
            { label: "Expiry", value: expiringCount, icon: <Calendar size={14} />, color: "border-l-red-500", textColor: "text-red-600" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={cn("bg-white rounded-lg border border-gray-200 border-l-[3px] px-4 py-3", kpi.color)}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                <span className={kpi.textColor}>{kpi.icon}</span>
                {kpi.label}
              </div>
              <div className={cn("text-xl font-bold", kpi.textColor)}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {thinking ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-green-600">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Analyzing rate data</span>
              <ThinkingDots />
            </div>
            <p className="text-xs text-gray-400">Comparing contract, spot, and agent-negotiated rates across lanes</p>
          </div>
        ) : (
          <>
            {/* ── Section 1: Rate Comparison Table ───────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <DollarSign size={14} className="text-green-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rate Comparison</span>
                <span className="ml-auto text-[10px] text-gray-400">{rateRows.length} lanes analyzed</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lane</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Carrier</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Contract</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Spot</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Agent Rate</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Variance</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Saving</th>
                      <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Exceptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateRows.map((row, i) => {
                      const laneExceptions = BOOKING_REQUESTS.filter(
                        (b) => b.lane === row.lane && (b.bookingStatus === "Exception" || b.bookingStatus === "Awaiting Approval") && b.exceptionType === "Rate Mismatch"
                      )
                      return (
                      <tr key={row.lane} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <ModeIcon mode={row.mode as "Ocean" | "Road" | "Air"} size={12} />
                            <span className="font-semibold text-gray-800">{row.lane}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{row.carrier}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-600">${row.contractRate.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-600">${row.spotRate.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-700">${row.agentRate.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={cn(
                            "font-mono font-semibold",
                            row.variance > 10 ? "text-red-600" : row.variance > 5 ? "text-amber-600" : "text-green-600"
                          )}>
                            +{row.variance}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-mono font-semibold text-green-600">${row.saving}/bkg</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {laneExceptions.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold">
                              <AlertTriangle size={9} /> {laneExceptions.map((e) => e.id).join(", ")}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Section 2: Rate Trends ─────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <TrendingUp size={14} className="text-blue-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rate Trends (6 Months)</span>
              </div>
              <div className="px-4 pt-3">
                <div className="flex gap-2 mb-3">
                  {RATE_TRENDS.map((lt, idx) => (
                    <button
                      key={lt.lane}
                      onClick={() => setActiveTrend(idx)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                        activeTrend === idx
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {lt.lane}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 pb-4" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={RATE_TRENDS[activeTrend].dataPoints} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                    />
                    <Line
                      type="monotone"
                      dataKey="contractRate"
                      name="Contract"
                      stroke="#3B82F6"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="spotRate"
                      name="Spot"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="agentNegotiated"
                      name="Agent"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Legend
                      iconType="line"
                      wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Section 3: AI Recommendations ──────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Brain size={14} className="text-indigo-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">AI Recommendations</span>
                <span className="ml-auto text-[10px] text-gray-400">{AI_RATE_RECOMMENDATIONS.length} active suggestions</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                {AI_RATE_RECOMMENDATIONS.map((rec) => {
                  const config = REC_CONFIG[rec.type]
                  const Icon = config.icon
                  return (
                    <div
                      key={rec.id}
                      className={cn("rounded-lg border p-4", config.bg, config.border)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                          <Icon size={16} className={config.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-800">{rec.title}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 leading-relaxed mb-2">{rec.description}</p>
                          <div className="flex items-center gap-3">
                            {rec.potentialSavings !== "N/A" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                                <TrendingDown size={9} /> {rec.potentialSavings}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 flex-1">
                              <span className="text-[10px] text-gray-400">Confidence</span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[80px]">
                                <div
                                  className={cn("h-full rounded-full", rec.confidence >= 90 ? "bg-green-500" : rec.confidence >= 80 ? "bg-blue-500" : "bg-amber-500")}
                                  style={{ width: `${rec.confidence}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-gray-500">{rec.confidence}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Section 4: Expiring Contracts ──────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Calendar size={14} className="text-red-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Expiring Contracts</span>
                <span className="ml-auto text-[10px] text-gray-400">
                  {CONTRACT_ALERTS.length} contracts tracked
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {CONTRACT_ALERTS.sort((a, b) => a.daysRemaining - b.daysRemaining).map((alert) => {
                  const config = ALERT_CONFIG[alert.severity]
                  return (
                    <div
                      key={alert.id}
                      className={cn("px-4 py-3 border-l-[3px]", config.border)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-800">{alert.lane}</span>
                            <span className="text-[10px] text-gray-400">·</span>
                            <span className="text-xs text-gray-600">{alert.carrier}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mb-1.5">{alert.recommendation}</p>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="text-gray-400">
                              Expires: <span className="font-medium text-gray-600">{alert.contractEnd}</span>
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-400">
                              Current: <span className="font-mono font-medium text-gray-600">${alert.currentRate.toLocaleString()}</span>
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-400">
                              Market: <span className="font-mono font-medium text-gray-600">${alert.marketRate.toLocaleString()}</span>
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={cn("text-lg font-bold", config.color)}>
                            {alert.daysRemaining}d
                          </div>
                          <div className="text-[9px] text-gray-400 uppercase">remaining</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
