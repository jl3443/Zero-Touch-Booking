"use client"

import { useState, useEffect } from "react"
import {
  CARRIER_SELECTION_WEIGHTS,
  AUTO_APPROVAL_THRESHOLDS,
  LANE_PREFERENCES,
  ESCALATION_RULES,
  BOOKING_REQUESTS,
} from "@/lib/mock-data"
import { SeverityBadge, ModeIcon } from "./shared"
import {
  Settings2, Sliders, Shield, Scale, AlertTriangle,
  ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Loader2, Zap, Activity, Package,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

// ── Weight Bar ───────────────────────────────────────────────────────────────

function WeightBar({ weight, color }: { weight: number; color: string }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${weight}%` }}
        />
      </div>
      <span className="text-sm font-bold text-gray-700 min-w-[3rem] text-right">{weight}%</span>
    </div>
  )
}

// ── Toggle Switch (visual only) ──────────────────────────────────────────────

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={enabled}
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggle() } }}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        enabled ? "bg-indigo-600" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-4" : "translate-x-0"
        )}
      />
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function AutomationRulesPage() {
  const [thinking, setThinking] = useState(true)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [thresholds, setThresholds] = useState(AUTO_APPROVAL_THRESHOLDS.map((t) => ({ ...t })))
  const [escalations, setEscalations] = useState(ESCALATION_RULES.map((r) => ({ ...r })))

  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 1800)
    return () => clearTimeout(t)
  }, [])

  const toggleThreshold = (idx: number) => {
    setThresholds((prev) => prev.map((t, i) => i === idx ? { ...t, enabled: !t.enabled } : t))
  }

  const toggleEscalation = (id: string) => {
    setEscalations((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  // Map escalation rules to exception types for cross-referencing
  const RULE_EXCEPTION_MAP: Record<string, string> = {
    "ESC-01": "Rate Mismatch",
    "ESC-02": "Carrier Rejection",
    "ESC-03": "Missing Booking Fields",
    "ESC-04": "Portal Unavailable",
    "ESC-05": "Missing Allocation",
    "ESC-06": "None", // timeout - no specific exception type
    "ESC-07": "Credentials Expired",
  }

  const getLinkedBookings = (ruleId: string) => {
    const exType = RULE_EXCEPTION_MAP[ruleId]
    if (!exType || exType === "None") return []
    return BOOKING_REQUESTS.filter((b) => b.exceptionType === exType)
  }

  const weightColors = ["bg-indigo-500", "bg-blue-500", "bg-cyan-500", "bg-teal-500"]

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1400px] mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Settings2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Automation Rules</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Agent decision-making configuration — carrier selection, approval thresholds, and escalation policies
            </p>
          </div>
        </div>

        {thinking ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Loading agent rules</span>
              <ThinkingDots />
            </div>
            <p className="text-xs text-gray-400">Reading active automation configuration</p>
          </div>
        ) : (
          <>
            {/* ── Section 1: Carrier Selection Weights ───────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Sliders size={14} className="text-indigo-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Carrier Selection Weights</span>
                <span className="ml-auto text-[10px] text-gray-400">Total: 100%</span>
              </div>
              <div className="p-4 space-y-4">
                {CARRIER_SELECTION_WEIGHTS.map((w, i) => (
                  <div key={w.factor} className="flex items-center gap-4">
                    <div className="w-[180px] shrink-0">
                      <div className="text-xs font-semibold text-gray-700">{w.factor}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{w.description}</div>
                    </div>
                    <WeightBar weight={w.weight} color={weightColors[i]} />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 2: Auto-Approval Thresholds ────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Shield size={14} className="text-green-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Auto-Approval Thresholds</span>
                <span className="ml-auto text-[10px] text-green-600 font-medium">
                  {thresholds.filter((t) => t.enabled).length}/{thresholds.length} active
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {thresholds.map((t, idx) => (
                  <div key={t.rule} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-700">{t.rule}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-gray-400">Threshold: <span className="font-semibold text-gray-600">{t.threshold}</span></span>
                        <span className="text-[10px] text-gray-300">|</span>
                        <span className="text-[10px] text-gray-400">Current: <span className="font-semibold text-gray-600">{t.currentValue}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.enabled ? (
                        <CheckCircle2 size={12} className="text-green-500" />
                      ) : (
                        <XCircle size={12} className="text-gray-300" />
                      )}
                      <ToggleSwitch enabled={t.enabled} onToggle={() => toggleThreshold(idx)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 3: Lane Preferences ────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Scale size={14} className="text-blue-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Lane Preferences</span>
                <span className="ml-auto text-[10px] text-gray-400">{LANE_PREFERENCES.length} lanes configured</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lane</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Mode</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Preferred Carrier</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fallback</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Max Rate</th>
                      <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Auto-Approve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LANE_PREFERENCES.map((lp, i) => (
                      <tr key={lp.lane} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{lp.lane}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <ModeIcon mode={lp.mode} size={12} />
                            <span className="text-gray-600">{lp.mode}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{lp.preferredCarrier}</td>
                        <td className="px-4 py-2.5 text-gray-500">{lp.fallbackCarrier}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">${lp.maxAcceptableRate.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-center">
                          {lp.autoApprove ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">
                              <CheckCircle2 size={9} /> Auto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
                              <AlertTriangle size={9} /> Manual
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Section 4: Escalation Rules ─────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Zap size={14} className="text-amber-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Escalation Rules</span>
                <span className="ml-auto text-[10px] text-gray-400">
                  {escalations.filter((r) => r.enabled).length}/{escalations.length} active
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {escalations.map((rule) => (
                  <div key={rule.id}>
                    <button
                      onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors"
                    >
                      {expandedRule === rule.id ? (
                        <ChevronDown size={12} className="text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight size={12} className="text-gray-400 shrink-0" />
                      )}
                      <span className="text-[10px] font-mono text-gray-400 shrink-0 w-[50px]">{rule.id}</span>
                      <span className="text-xs text-gray-700 flex-1 text-left">{rule.condition}</span>
                      <SeverityBadge severity={rule.severity} />
                      <ToggleSwitch enabled={rule.enabled} onToggle={() => toggleEscalation(rule.id)} />
                    </button>
                    {expandedRule === rule.id && (() => {
                      const linked = getLinkedBookings(rule.id)
                      return (
                      <div className="px-4 pb-3 ml-[62px]">
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <Activity size={11} className="text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Action</div>
                              <div className="text-xs text-gray-700">{rule.action}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
                            <span className="text-[10px] text-gray-400">
                              Triggered <span className="font-semibold text-gray-600">{rule.triggerCount30d}×</span> in last 30 days
                            </span>
                          </div>
                          {linked.length > 0 && (
                            <div className="pt-1 border-t border-gray-100">
                              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Package size={9} /> Active Exceptions
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {linked.map((b) => (
                                  <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold">
                                    <AlertTriangle size={8} /> {b.id} · {b.lane}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
