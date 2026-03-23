"use client"

import { useState } from "react"
import { INBOX_EMAILS, SIMULATION_BOOKING, type InboxEmail, type EmailTag } from "@/lib/mock-data"
import { type SimulationPhase } from "./app-shell"
import { cn } from "@/lib/utils"
import { Mail, MailOpen, Tag, Clock, Package, ChevronLeft, Brain, AlertTriangle, CheckCircle2, ArrowRight, Zap, Ship, Star, Search, Anchor, X } from "lucide-react"

const TAG_CONFIG: Record<EmailTag, { label: string; color: string }> = {
  sap:       { label: "SAP",       color: "bg-blue-50 border-blue-200 text-blue-700" },
  carrier:   { label: "Carrier",   color: "bg-teal-50 border-teal-200 text-teal-700" },
  booking:   { label: "Booking",   color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  rejection: { label: "Rejection", color: "bg-red-50 border-red-200 text-red-700" },
  rate:      { label: "Rate",      color: "bg-amber-50 border-amber-200 text-amber-700" },
  agent:     { label: "Agent",     color: "bg-purple-50 border-purple-200 text-purple-700" },
}

// Extracts the first BKG-XXXXX from an email body
function extractBookingId(body: string): string | null {
  const match = body.match(/BKG-\d+/)
  return match ? match[0] : null
}

const ROUTE_OPTIONS = [
  {
    carrier: "Maersk",
    vessel: "Maersk Sealand",
    rate: 2850,
    transitDays: 14,
    sla: 92,
    capacity: "Available",
    recommended: true,
    reason: "Best rate-to-performance ratio on NGB→HAM lane",
  },
  {
    carrier: "Hapag-Lloyd",
    vessel: "Hapag Express",
    rate: 2950,
    transitDays: 13,
    sla: 90,
    capacity: "Available",
    recommended: false,
    reason: "Fastest transit but 3.5% higher rate",
  },
  {
    carrier: "MSC",
    vessel: "MSC Gaia",
    rate: 2700,
    transitDays: 17,
    sla: 86,
    capacity: "Available",
    recommended: false,
    reason: "Lowest rate but +3 days transit and lower SLA",
  },
]

interface EmailInboxPageProps {
  onOpenTracking?: (shipmentId: string) => void
  onMarkRead?: (emailId: string) => void
  simPhase?: SimulationPhase
  onStartSimulation?: () => void
  onExecuteSimulation?: () => void
  onFindRoutes?: () => void
  onConfirmRoute?: () => void
  onFullAuto?: () => void
}

export function EmailInboxPage({ onOpenTracking, onMarkRead, simPhase, onStartSimulation, onExecuteSimulation, onFindRoutes, onConfirmRoute, onFullAuto }: EmailInboxPageProps) {
  const [emails, setEmails] = useState<InboxEmail[]>(INBOX_EMAILS)
  const [selected, setSelected] = useState<InboxEmail | null>(null)
  const [activeTagFilter, setActiveTagFilter] = useState<EmailTag | null>(null)
  const [analyzingEmail, setAnalyzingEmail] = useState<string | null>(null)
  const [analyzedEmails, setAnalyzedEmails] = useState<Record<string, string>>({})

  // Wizard local state
  const [wizardPriority, setWizardPriority] = useState<"urgent" | "standard">("urgent")
  const [wizardCarrier, setWizardCarrier] = useState<"none" | "maersk" | "msc" | "hapag">("none")
  const [wizardMaxRate, setWizardMaxRate] = useState("")
  const [wizardRequirements, setWizardRequirements] = useState<string[]>([])
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0)

  const filteredEmails = activeTagFilter
    ? emails.filter((e) => e.tag === activeTagFilter || e.tags.includes(activeTagFilter))
    : emails

  const unreadCount = emails.filter((e) => !e.read).length

  const handleSelect = (email: InboxEmail) => {
    setSelected(email)
    if (!email.read) onMarkRead?.(email.id)
    setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, read: true } : e))
  }

  const handleAnalyze = (email: InboxEmail) => {
    setAnalyzingEmail(email.id)
    setTimeout(() => {
      const extracted = extractBookingId(email.body)
      if (extracted) {
        setAnalyzedEmails((prev) => ({ ...prev, [email.id]: extracted }))
      }
      setAnalyzingEmail(null)
    }, 2000)
  }

  const toggleRequirement = (req: string) => {
    setWizardRequirements((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]
    )
  }

  // Determine if the selected email should show the AI analysis banner
  const showAnalysisBanner = selected && !selected.shipmentId && extractBookingId(selected.body) !== null
  const isAnalyzing = selected ? analyzingEmail === selected.id : false
  const analysisResult = selected ? analyzedEmails[selected.id] : null

  // All unique tags for filter bar
  const allTags = Object.keys(TAG_CONFIG) as EmailTag[]

  const isSimEmail = selected?.id === "EM-SIM"
  const simData = SIMULATION_BOOKING
  const selectedRoute = ROUTE_OPTIONS[selectedRouteIdx]

  // Should the wizard modal be open?
  const showWizardModal = isSimEmail && simPhase && (
    simPhase === "email-order-detected" ||
    simPhase === "email-finding-routes" ||
    simPhase === "email-routes-ready" ||
    simPhase === "email-ready" ||
    simPhase === "transitioning"
  )

  // Wizard step indicator
  const wizardStep = simPhase === "email-order-detected" ? 1
    : simPhase === "email-finding-routes" ? 2
    : simPhase === "email-routes-ready" ? 2
    : (simPhase === "email-ready" || simPhase === "transitioning") ? 3
    : 0

  return (
    <div className="flex-1 overflow-hidden bg-[#F8F9FA] flex flex-col">
      <div className="p-6 pb-3 max-w-[1100px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Mail size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Inbox</h2>
              <p className="text-xs text-gray-400">SAP requirements, carrier confirmations, and agent alerts</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold bg-blue-600 text-white rounded-full px-2.5 py-1">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Tag filter bar */}
        <div className="flex items-center gap-1.5 mb-3">
          <button
            onClick={() => setActiveTagFilter(null)}
            className={cn(
              "text-[10px] font-semibold border rounded-full px-2.5 py-1 transition-colors",
              activeTagFilter === null
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            )}
          >
            All ({emails.length})
          </button>
          {allTags.map((tag) => {
            const count = emails.filter((e) => e.tag === tag || e.tags.includes(tag)).length
            if (count === 0) return null
            const cfg = TAG_CONFIG[tag]
            return (
              <button
                key={tag}
                onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                className={cn(
                  "text-[10px] font-semibold border rounded-full px-2.5 py-1 transition-colors",
                  activeTagFilter === tag
                    ? cfg.color
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                )}
              >
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden max-w-[1100px] mx-auto w-full px-6 pb-6 gap-4">
        {/* Email list */}
        <div className={cn(
          "flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shrink-0",
          selected ? "w-72" : "flex-1"
        )}>
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {filteredEmails.length} messages
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredEmails.map((email) => {
              const tagCfg = TAG_CONFIG[email.tag]
              const isSelected = selected?.id === email.id
              return (
                <button
                  key={email.id}
                  onClick={() => handleSelect(email)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                    isSelected && "bg-blue-50/60 border-l-2 border-l-blue-500",
                    !email.read && "bg-white"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 shrink-0">
                      {email.read
                        ? <MailOpen size={13} className="text-gray-300" />
                        : <Mail size={13} className="text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={cn("text-xs truncate", email.read ? "text-gray-500 font-normal" : "text-gray-800 font-semibold")}>
                          {email.fromName}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">{email.timestamp}</span>
                      </div>
                      <div className={cn("text-[11px] mb-1 truncate", email.read ? "text-gray-500" : "text-gray-700 font-medium")}>
                        {email.subject}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[9px] font-semibold border rounded-full px-1.5 py-0.5", tagCfg.color)}>
                          {tagCfg.label}
                        </span>
                        {email.shipmentId && (
                          <span className="text-[9px] font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                            {email.shipmentId}
                          </span>
                        )}
                        {/* Zero-Touch Ready badge for simulation email */}
                        {email.id === "EM-SIM" && (!simPhase || simPhase === "idle") && (
                          <span className="text-[9px] text-white bg-indigo-600 flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5">
                            <Zap size={8} /> Zero-Touch Ready
                          </span>
                        )}
                        {email.id === "EM-SIM" && simPhase && simPhase !== "idle" && (
                          <span className="text-[9px] text-white bg-green-600 flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5">
                            <CheckCircle2 size={8} /> Processing
                          </span>
                        )}
                        {/* AI Ready badge for emails without registered booking */}
                        {email.id !== "EM-SIM" && !email.shipmentId && extractBookingId(email.body) && (
                          <span className="text-[9px] text-white bg-indigo-600 flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5">
                            <Brain size={8} /> AI Analyze
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Email detail */}
        {selected ? (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Detail header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mb-3 transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 leading-snug">{selected.subject}</h3>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>From: <span className="text-gray-600 font-medium">{selected.fromName}</span> &lt;{selected.from}&gt;</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {selected.timestamp}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", TAG_CONFIG[selected.tag].color)}>
                  <Tag size={9} className="inline mr-1" />{TAG_CONFIG[selected.tag].label}
                </span>
                {selected.tags
                  .filter((t) => t !== selected.tag)
                  .map((t) => (
                    <span key={t} className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", TAG_CONFIG[t].color)}>
                      {TAG_CONFIG[t].label}
                    </span>
                  ))}
                {selected.shipmentId && (
                  <button
                    onClick={() => onOpenTracking?.(selected.shipmentId!)}
                    className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Package size={9} /> {selected.shipmentId}
                  </button>
                )}
              </div>
            </div>

            {/* AI Analysis Banner (non-sim emails) */}
            {showAnalysisBanner && !analysisResult && !isSimEmail && (
              <div className={cn(
                "mx-5 mt-4 rounded-xl border px-4 py-3 flex items-center justify-between gap-3",
                isAnalyzing
                  ? "border-indigo-200 bg-indigo-50"
                  : "border-amber-200 bg-amber-50"
              )}>
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <Brain size={15} className="text-indigo-500 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-700">Analyzing booking reference...</p>
                      <div className="flex items-end gap-[3px] mt-0.5">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                            style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Booking reference detected. AI analysis ready.</p>
                        <p className="text-[11px] text-amber-600">Booking ID found in body -- not yet linked in system</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAnalyze(selected)}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <Brain size={12} /> Analyze with AI
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Analysis Result Card (non-sim emails) */}
            {analysisResult && !isSimEmail && (
              <div className="mx-5 mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs font-semibold text-green-800">AI Analysis Complete</p>
                </div>
                <div className="space-y-1 text-[11px] text-green-700 pl-5">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span>Booking ID identified: <span className="font-mono font-bold text-green-800">{analysisResult}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span>Booking linked to monitoring</span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenTracking?.(analysisResult)}
                  className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Open Booking Detail <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* ============================================ */}
            {/* SIMULATION — EM-SIM email only               */}
            {/* ============================================ */}

            {/* Phase A: Idle — Analyze button (inline) */}
            {isSimEmail && (!simPhase || simPhase === "idle") && (
              <div className="mx-5 mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800">SAP TM requirement detected</p>
                    <p className="text-[11px] text-blue-600">AI agent ready for autonomous processing</p>
                  </div>
                </div>
                <button
                  onClick={() => onStartSimulation?.()}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3.5 py-2 transition-colors"
                >
                  <Brain size={12} /> Analyze with AI Agent
                </button>
              </div>
            )}

            {/* Phase B: Analyzing — AI thinking animation (inline) */}
            {isSimEmail && simPhase === "email-analyzing" && (
              <div className="mx-5 mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Brain size={15} className="text-indigo-500 animate-pulse shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-indigo-700">AI Agent analyzing shipment requirement...</p>
                    <p className="text-[11px] text-indigo-500 mt-0.5">Parsing SAP TM data, evaluating carriers, validating booking fields</p>
                    <div className="flex items-end gap-[3px] mt-1">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                          style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                {selected.body}
              </pre>
            </div>
          </div>
        ) : (
          <div className="hidden" />
        )}

        {/* Empty state when nothing selected and list is shown full-width */}
        {!selected && (
          <div className="hidden" />
        )}
      </div>

      {/* ============================================ */}
      {/* WIZARD MODAL OVERLAY — Phases C/D/E/F       */}
      {/* ============================================ */}
      {showWizardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-[620px] max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                  <Brain size={14} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">AI Booking Wizard</h3>
                  <p className="text-[11px] text-gray-400">SAP-TM-44862 · Ningbo → Hamburg</p>
                </div>
              </div>
              {/* Step indicator */}
              <div className="flex items-center gap-1.5">
                {["Detect", "Route", "Confirm"].map((label, i) => (
                  <div key={label} className="flex items-center gap-1.5">
                    {i > 0 && <div className="w-4 h-px bg-gray-200" />}
                    <div className={cn(
                      "flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 border",
                      (i + 1) < wizardStep
                        ? "bg-green-50 text-green-700 border-green-200"
                        : (i + 1) === wizardStep
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    )}>
                      {(i + 1) < wizardStep ? <CheckCircle2 size={9} /> : <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[8px]">{i + 1}</span>}
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* Phase C: Order Detected + Questions */}
              {simPhase === "email-order-detected" && (
                <div className="space-y-4">
                  {/* ORDER DETECTED card */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package size={14} className="text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Order Detected</p>
                      <span className="ml-auto text-[9px] font-semibold text-emerald-600 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">SAP TM Signal</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-600">SAP Order</span>
                        <span className="font-mono font-bold text-emerald-800">{simData.sapOrderRef}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-600">Route</span>
                        <span className="font-semibold text-emerald-800">{simData.origin.split(",")[0]} → {simData.destination.split(",")[0]}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-600">Mode</span>
                        <span className="font-semibold text-emerald-800">{simData.mode} · {simData.containerType}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-600">Weight</span>
                        <span className="font-semibold text-emerald-800">18,200 kg</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-600">Target Ship</span>
                        <span className="font-semibold text-emerald-800">{simData.targetShipDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-600">Priority</span>
                        <span className="font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5 text-[10px]">High</span>
                      </div>
                    </div>
                  </div>

                  {/* CONFIRM REQUIREMENTS */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-5 py-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Confirm Requirements</span>
                      <span className="text-[10px] text-gray-400 font-normal">(pre-filled from SAP data)</span>
                    </div>

                    {/* Shipping Priority */}
                    <div className="mb-4">
                      <label className="text-[11px] font-semibold text-gray-500 mb-2 block">Shipping Priority</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setWizardPriority("urgent")}
                          className={cn(
                            "text-[11px] font-semibold border rounded-lg px-4 py-2 transition-all",
                            wizardPriority === "urgent"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          Urgent (≤14d)
                        </button>
                        <button
                          onClick={() => setWizardPriority("standard")}
                          className={cn(
                            "text-[11px] font-semibold border rounded-lg px-4 py-2 transition-all",
                            wizardPriority === "standard"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          Standard (≤21d)
                        </button>
                      </div>
                    </div>

                    {/* Preferred Carrier */}
                    <div className="mb-4">
                      <label className="text-[11px] font-semibold text-gray-500 mb-2 block">Preferred Carrier</label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { value: "none", label: "No Preference" },
                          { value: "maersk", label: "Maersk" },
                          { value: "msc", label: "MSC" },
                          { value: "hapag", label: "Hapag-Lloyd" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setWizardCarrier(opt.value as typeof wizardCarrier)}
                            className={cn(
                              "text-[11px] font-semibold border rounded-lg px-4 py-2 transition-all",
                              wizardCarrier === opt.value
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max Rate */}
                    <div className="mb-4">
                      <label className="text-[11px] font-semibold text-gray-500 mb-2 block">Max Acceptable Rate</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 font-medium">$</span>
                        <input
                          type="text"
                          placeholder="e.g. 3000"
                          value={wizardMaxRate}
                          onChange={(e) => setWizardMaxRate(e.target.value)}
                          className="text-[11px] border border-gray-200 rounded-lg px-3 py-2 w-32 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                        />
                        <span className="text-[11px] text-gray-400">per 40&apos;HC</span>
                      </div>
                    </div>

                    {/* Special Requirements */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 mb-2 block">Special Requirements</label>
                      <div className="flex gap-2 flex-wrap">
                        {["Temperature controlled", "Hazardous goods", "Direct routing only", "Insurance required"].map((req) => (
                          <button
                            key={req}
                            onClick={() => toggleRequirement(req)}
                            className={cn(
                              "text-[10px] font-semibold border rounded-lg px-3 py-2 transition-all",
                              wizardRequirements.includes(req)
                                ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            )}
                          >
                            {wizardRequirements.includes(req) ? "✓ " : ""}{req}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase D: Finding Routes — search animation */}
              {simPhase === "email-finding-routes" && (
                <div className="space-y-4">
                  {/* Collapsed order summary */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <p className="text-[11px] font-semibold text-emerald-700">Order {simData.sapOrderRef} — {simData.origin.split(",")[0]} → {simData.destination.split(",")[0]} · {simData.mode} · {simData.containerType}</p>
                    </div>
                  </div>
                  {/* Search animation */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-8 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center mb-4">
                      <Search size={20} className="text-indigo-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-semibold text-indigo-700 mb-1">Finding Best Routes</p>
                    <p className="text-[11px] text-indigo-500">Analyzing 4 carriers on NGB→HAM lane — scoring by rate, SLA, transit time, capacity</p>
                    <div className="flex items-end gap-[3px] mt-3">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                          style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Phase E: Routes Ready — 3 route cards */}
              {simPhase === "email-routes-ready" && (
                <div className="space-y-4">
                  {/* Collapsed order summary */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <p className="text-[11px] font-semibold text-emerald-700">Order {simData.sapOrderRef} — {simData.origin.split(",")[0]} → {simData.destination.split(",")[0]} · {simData.mode}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Anchor size={13} className="text-indigo-600" />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Recommended Routes</span>
                      <span className="text-[10px] text-gray-400 font-normal ml-auto">3 options scored by AI</span>
                    </div>

                    <div className="space-y-2.5">
                      {ROUTE_OPTIONS.map((route, idx) => {
                        const isRouteSelected = selectedRouteIdx === idx
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedRouteIdx(idx)}
                            className={cn(
                              "w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all relative",
                              isRouteSelected
                                ? route.recommended
                                  ? "border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-200 shadow-sm"
                                  : "border-indigo-400 bg-indigo-50/30 ring-1 ring-indigo-200 shadow-sm"
                                : "border-gray-150 bg-white hover:border-gray-300"
                            )}
                          >
                            {/* AI Recommended badge */}
                            {route.recommended && (
                              <div className="absolute -top-2.5 left-3 flex items-center gap-1 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                <Star size={8} className="fill-white" /> AI RECOMMENDED
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              {/* Radio indicator */}
                              <div className={cn(
                                "w-4.5 h-4.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                                isRouteSelected ? "border-indigo-600" : "border-gray-300"
                              )}>
                                {isRouteSelected && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                              </div>
                              {/* Route info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-gray-800">{route.carrier}</span>
                                  <span className="text-[10px] text-gray-400">·</span>
                                  <span className="text-[11px] text-gray-500">{route.vessel}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px]">
                                  <span className="font-bold text-gray-800">${route.rate.toLocaleString()}<span className="font-normal text-gray-400">/40&apos;HC</span></span>
                                  <span className="text-gray-500">{route.transitDays}d transit</span>
                                  <span className="text-gray-500">SLA {route.sla}%</span>
                                  <span className={cn(
                                    "font-semibold",
                                    route.capacity === "Available" ? "text-green-600" : "text-amber-600"
                                  )}>{route.capacity}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 italic">&ldquo;{route.reason}&rdquo;</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Phase F: Route Confirmed — Execute */}
              {(simPhase === "email-ready" || simPhase === "transitioning") && (
                <div className="space-y-4">
                  {/* Collapsed order summary */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <p className="text-[11px] font-semibold text-emerald-700">Order {simData.sapOrderRef} — {simData.origin.split(",")[0]} → {simData.destination.split(",")[0]} · {simData.mode}</p>
                    </div>
                  </div>

                  {/* Confirmed route */}
                  <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-800">Route Confirmed</p>
                        <p className="text-[11px] text-green-600">Ready for autonomous execution</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] mb-4 pl-1">
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">Carrier</span>
                        <span className="font-bold text-green-800">{selectedRoute.carrier}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">Vessel</span>
                        <span className="font-semibold text-green-800">{selectedRoute.vessel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">Rate</span>
                        <span className="font-bold text-green-800">${selectedRoute.rate.toLocaleString()}/40&apos;HC</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">Transit</span>
                        <span className="font-semibold text-green-800">{selectedRoute.transitDays} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">SLA</span>
                        <span className="font-semibold text-green-800">{selectedRoute.sla}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">Sailing</span>
                        <span className="font-semibold text-green-800">Mar 21, 2025</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-green-600 pl-1">
                      <CheckCircle2 size={10} className="text-green-500" />
                      <span>All booking fields validated — zero-touch execution ready</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer — action buttons */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              {simPhase === "email-order-detected" && (
                <>
                  <button
                    onClick={() => onFullAuto?.()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 bg-white rounded-lg px-4 py-2.5 transition-colors"
                  >
                    <Zap size={13} /> Full Auto
                  </button>
                  <button
                    onClick={() => onFindRoutes?.()}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-5 py-2.5 transition-colors shadow-sm"
                  >
                    <Search size={13} /> Find Routes <ArrowRight size={13} />
                  </button>
                </>
              )}
              {simPhase === "email-finding-routes" && (
                <div className="w-full text-center text-[11px] text-indigo-500 font-medium">Scoring carriers...</div>
              )}
              {simPhase === "email-routes-ready" && (
                <>
                  <button
                    onClick={() => onFullAuto?.()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 bg-white rounded-lg px-4 py-2.5 transition-colors"
                  >
                    <Zap size={13} /> Full Auto
                  </button>
                  <button
                    onClick={() => onConfirmRoute?.()}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-5 py-2.5 transition-colors shadow-sm"
                  >
                    <Ship size={13} /> Confirm &amp; Book <ArrowRight size={13} />
                  </button>
                </>
              )}
              {(simPhase === "email-ready" || simPhase === "transitioning") && (
                <>
                  <div />
                  <button
                    onClick={() => onExecuteSimulation?.()}
                    disabled={simPhase === "transitioning"}
                    className={cn(
                      "flex items-center gap-2 text-xs font-bold text-white rounded-lg px-5 py-2.5 transition-all",
                      simPhase === "transitioning"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 animate-pulse"
                    )}
                  >
                    <Ship size={14} /> Execute Zero-Touch Booking <ArrowRight size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
