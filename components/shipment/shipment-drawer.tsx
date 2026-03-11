"use client"

import { useState, useEffect } from "react"
import { type Shipment, type TimelineEvent } from "@/lib/mock-data"
import {
  SeverityBadge, ModeBadge, ExceptionBadge, ReasonChips,
  ConfidenceBar, SourceBadge, OTMStatusBadge,
} from "./shared"
import { cn } from "@/lib/utils"
import {
  X, Brain, CheckCircle, Send, AlertOctagon, RotateCcw, PauseCircle,
  ArrowRight, ChevronRight, Check, Loader2, Radio, ScanSearch, Phone, PhoneCall,
} from "lucide-react"
import { ModeIcon } from "./shared"
import { EmailComposer } from "./email-composer"
import { type SentEmailItem } from "./email-sent-page"

type DrawerTab = "overview" | "signals" | "otm"

interface ActionState {
  etaApproved: boolean
  notified: boolean
  escalated: boolean
  otmSynced: boolean
  emailSent: boolean
}

interface ShipmentDrawerProps {
  shipment: Shipment | null
  onClose: () => void
  onOpenWeather?: (shipmentId: string) => void
  onSendNotification?: (email: SentEmailItem) => void
  onEtaApproved?: () => void
}

const LOADING_STEPS = [
  {
    title: "Pulling real-time data",
    subtitle: "Querying carrier portals, GPS feeds & customs systems",
    items: ["Carrier Portal API", "AIS / GPS Data Feed", "Customs Broker System"],
  },
  {
    title: "Analyzing signals",
    subtitle: "Cross-referencing sources for ETA drift & discrepancies",
    items: ["Route Deviation Check", "ETA Recalculation", "Exception Scoring"],
  },
  {
    title: "Connecting to Weather AI API",
    subtitle: "Enriching shipment context with disruption intelligence",
    items: ["Weather Forecast Layer", "Traffic Incident Feed", "Risk Assessment Engine"],
  },
]

export function ShipmentDrawer({ shipment, onClose, onOpenWeather, onSendNotification, onEtaApproved }: ShipmentDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview")
  const [actions, setActions] = useState<ActionState>({
    etaApproved: false,
    notified: false,
    escalated: false,
    otmSynced: false,
    emailSent: false,
  })
  const [syncing, setSyncing] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingTick, setLoadingTick] = useState(0)
  const [reconciling, setReconciling] = useState(false)
  const [resolvedSource, setResolvedSource] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setLoadingTick(0)
    setActiveTab("overview")
    setReconciling(false)
    setResolvedSource(null)
    const tick = setInterval(() => setLoadingTick((prev) => prev + 1), 340)
    const done = setTimeout(() => { clearInterval(tick); setIsLoading(false) }, 3200)
    return () => { clearInterval(tick); clearTimeout(done) }
  }, [shipment?.id])

  const handleReconcile = () => {
    if (!shipment) return
    setReconciling(true)
    setTimeout(() => {
      const winner = shipment.sources.find(s => s.aligned === true && s.fresh)
        ?? shipment.sources.filter(s => s.fresh).sort((a, b) => (a.source.includes("Portal") ? -1 : 1))[0]
        ?? shipment.sources[0]
      setResolvedSource(winner?.source ?? null)
      setReconciling(false)
    }, 2200)
  }

  const loadingStep = Math.min(Math.floor(loadingTick / 3), 2)
  const loadingSubItem = loadingTick % 3

  if (!shipment) return null

  const handleAction = (key: keyof ActionState) => {
    setActions((prev) => ({ ...prev, [key]: true }))
  }

  const handleOTMSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setActions((prev) => ({ ...prev, otmSynced: true, etaApproved: true }))
      onEtaApproved?.()
    }, 1200)
  }

  const TABS: { key: DrawerTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "signals", label: "Source Signals" },
    { key: "otm", label: "OTM & Notifications" },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 h-full w-[46%] min-w-[580px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-label={`Shipment ${shipment.id} details`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ModeIcon mode={shipment.mode} size={16} />
              <span className="font-mono text-lg font-bold text-blue-700">{shipment.id}</span>
              <ModeBadge mode={shipment.mode} />
              <SeverityBadge severity={shipment.severity} />
              {shipment.criticalMaterial && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold tracking-wide uppercase">
                  Critical Material
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>{shipment.carrier}</span>
              <span className="text-gray-300">|</span>
              <span className="font-mono">{shipment.trackingRef}</span>
              <span className="text-gray-300">|</span>
              <span>{shipment.origin}</span>
              <ArrowRight size={10} />
              <span>{shipment.destination}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="text-xs text-gray-500 font-medium">{shipment.currentStatus}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400">ETA Confidence:</span>
                <div className="w-24">
                  <ConfidenceBar score={shipment.etaConfidence} />
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ml-4 p-1.5 rounded hover:bg-gray-200 transition-colors" aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0 bg-white">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-5 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "text-blue-700 border-blue-700"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-white">
            <div className="flex items-center gap-3">
              <Brain size={22} className="text-indigo-500 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Agent intelligence loading…</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Building real-time shipment snapshot</p>
              </div>
            </div>
            <div className="w-80 space-y-4">
              {LOADING_STEPS.map((step, i) => {
                const done = loadingStep > i
                const active = loadingStep === i
                return (
                  <div key={i} className="flex gap-3">
                    {/* Step indicator */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                        done ? "bg-green-500" : active ? "bg-indigo-500 animate-pulse" : "bg-gray-200"
                      )}>
                        {done ? (
                          <Check size={10} className="text-white" />
                        ) : (
                          <span className="text-[9px] font-bold text-white">{i + 1}</span>
                        )}
                      </div>
                      {i < 2 && <div className={cn("w-px flex-1 min-h-[12px]", done ? "bg-green-300" : "bg-gray-200")} />}
                    </div>
                    {/* Step content */}
                    <div className="flex-1 pb-2">
                      <p className={cn(
                        "text-xs font-semibold transition-colors duration-300",
                        done ? "text-green-700" : active ? "text-indigo-700" : "text-gray-300"
                      )}>{step.title}</p>
                      {(done || active) && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{step.subtitle}</p>
                      )}
                      {(done || active) && (
                        <div className="mt-2 space-y-1">
                          {step.items.map((item, j) => {
                            const itemDone = done || (active && loadingSubItem > j)
                            const itemActive = active && loadingSubItem === j
                            return (
                              <div key={j} className="flex items-center gap-1.5">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-200",
                                  itemDone ? "bg-green-400" : itemActive ? "bg-indigo-400 animate-pulse" : "bg-gray-200"
                                )} />
                                <span className={cn(
                                  "text-[10px] transition-colors duration-200",
                                  itemDone ? "text-green-600 font-medium" : itemActive ? "text-indigo-600" : "text-gray-300"
                                )}>{item}</span>
                                {itemDone && <Check size={8} className="text-green-400 ml-auto" />}
                                {itemActive && <Loader2 size={8} className="text-indigo-400 ml-auto animate-spin" />}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className={cn("flex-1 overflow-y-auto", isLoading && "hidden")}>
          {activeTab === "overview" && (
            <OverviewTab shipment={shipment} actions={actions} onAction={handleAction} onOpenWeather={onOpenWeather} onShowEmail={() => setShowEmailModal(true)} />
          )}
          {activeTab === "signals" && (
            <SignalsTab
              shipment={shipment}
              reconciling={reconciling}
              resolvedSource={resolvedSource}
              onReconcile={handleReconcile}
            />
          )}
          {activeTab === "otm" && (
            <OTMTab
              shipment={shipment}
              actions={actions}
              syncing={syncing}
              onOTMSync={handleOTMSync}
              onAction={handleAction}
              onShowEmail={() => setShowEmailModal(true)}
              onSendNotification={onSendNotification}
            />
          )}
        </div>
      </aside>

      {/* Email Composer */}
      {showEmailModal && (
        <EmailComposer
          shipment={shipment}
          onClose={() => setShowEmailModal(false)}
          onSent={() => {
            handleAction("emailSent")
            handleAction("notified")
          }}
          onSendNotification={onSendNotification}
        />
      )}
    </>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ shipment, actions, onAction, onOpenWeather, onShowEmail }: { shipment: Shipment; actions: ActionState; onAction: (k: keyof ActionState) => void; onOpenWeather?: (id: string) => void; onShowEmail: () => void }) {
  const [summaryThinking, setSummaryThinking] = useState(true)
  const [extraEvents, setExtraEvents] = useState<TimelineEvent[]>([])
  const [escalateConfirm, setEscalateConfirm] = useState(false)
  const [escalateCalling, setEscalateCalling] = useState(false)
  const [escalateCallStep, setEscalateCallStep] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setSummaryThinking(false), 1600)
    return () => clearTimeout(t)
  }, [shipment.id])

  // Reset extra events and escalation state when shipment changes
  useEffect(() => {
    setExtraEvents([])
    setEscalateConfirm(false)
    setEscalateCalling(false)
    setEscalateCallStep(0)
  }, [shipment.id])

  const handleEscalateCall = () => {
    setEscalateConfirm(false)
    setEscalateCalling(true)
    setEscalateCallStep(0)
    const steps = [800, 1600, 2400, 3200]
    steps.forEach((delay, i) => {
      setTimeout(() => setEscalateCallStep(i + 1), delay)
    })
    setTimeout(() => {
      setEscalateCalling(false)
      onAction("escalated")
    }, 4000)
  }

  // Add dark-green event when ETA is approved
  useEffect(() => {
    if (!actions.etaApproved) return
    setExtraEvents((prev) => {
      if (prev.some((e) => e.event.includes("ETA Approved"))) return prev
      const now = new Date()
      const ts = `${now.toLocaleDateString("en", { month: "short", day: "numeric" })} ${now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}`
      return [{ timestamp: ts, event: "ETA Approved — Updated in OTM", location: "", source: "Agent", status: "agent" }, ...prev]
    })
  }, [actions.etaApproved])

  // Add dark-green event when notification is sent
  useEffect(() => {
    if (!actions.notified) return
    setExtraEvents((prev) => {
      if (prev.some((e) => e.event.includes("Notification Sent"))) return prev
      const now = new Date()
      const ts = `${now.toLocaleDateString("en", { month: "short", day: "numeric" })} ${now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}`
      return [{ timestamp: ts, event: "Notification Sent — Destination Team Alerted", location: "", source: "Agent", status: "agent" }, ...prev]
    })
  }, [actions.notified])

  return (
    <div className="p-5 space-y-4">
      {/* ETA Comparison Card */}
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">ETA Comparison</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-400 mb-0.5">Planned ETA</div>
            <div className="font-mono text-sm font-medium text-gray-700">{shipment.plannedETA}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-0.5">Revised ETA</div>
            <div className={cn("font-mono text-sm font-semibold", shipment.delayHours > 0 ? "text-red-600" : "text-green-600")}>
              {shipment.revisedETA}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-0.5">Delay</div>
            <div className="text-sm font-bold text-red-600">{shipment.delayHours > 0 ? `+${shipment.delayHours}h` : "None"}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-0.5">Confidence</div>
            <div className="mt-1"><ConfidenceBar score={shipment.etaConfidence} /></div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-[10px] text-gray-400 mb-1">Reason</div>
          <div className="flex items-center gap-2">
            <ReasonChips chips={shipment.reasonChips} />
          </div>
          <div className="mt-2 text-[10px] text-gray-500">
            Last source: <span className="font-medium">{shipment.lastSignalSource}</span> &middot; {shipment.lastSignal}
          </div>
        </div>
      </div>

      {/* Disruption Context */}
      {shipment.disruptionContext && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h4 className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-2">Disruption Context</h4>
          <p className="text-xs text-gray-700 leading-relaxed">{shipment.disruptionContext}</p>
          <div className="mt-2 flex items-center gap-2">
            <ReasonChips chips={shipment.reasonChips} />
          </div>
          {onOpenWeather && (shipment.exceptionType === "Weather Disruption" || shipment.exceptionType === "Traffic Disruption") && (
            <button
              onClick={() => onOpenWeather(shipment.id)}
              className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 hover:text-blue-900 transition-colors"
            >
              <ChevronRight size={12} /> View full disruption details in Weather / Traffic
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div>
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Tracking Timeline</h4>
        <div className="space-y-0">
          {/* Pending ETA entry — shown until ETA is approved, only when there's a delay to confirm */}
          {!actions.etaApproved && shipment.delayHours > 0 && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
                </div>
                <div className="w-px flex-1 bg-gray-200 my-0.5 min-h-[20px]" />
              </div>
              <div className="pb-3 flex-1">
                <p className="text-xs font-semibold text-gray-900">Pending — Awaiting ETA Confirmation</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Agent monitoring active · ETA update pending review</p>
              </div>
            </div>
          )}
          {[...extraEvents, ...[...shipment.timeline].reverse()].map((event, i, arr) => {
            const isLast = i === arr.length - 1
            const isException = event.status === "warning" || event.status === "critical"
            const isResolved = event.status === "agent"
            // 3-color icon map
            const dot = isException
              ? <div className="w-5 h-5 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-red-600" /></div>
              : isResolved
              ? <div className="w-5 h-5 rounded-full bg-green-700 border-2 border-green-600 flex items-center justify-center"><Check size={9} className="text-white" /></div>
              : <div className="w-5 h-5 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /></div>
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {dot}
                  {!isLast && <div className="w-px flex-1 bg-gray-200 my-0.5" />}
                </div>
                <div className="pb-3 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-xs font-medium",
                        isException ? "text-red-700" : isResolved ? "text-green-800 font-semibold" : "text-gray-800"
                      )}>
                        {event.event}
                      </span>
                      {event.anomaly && (
                        <p className="text-[10px] mt-0.5 text-red-600">{event.anomaly}</p>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400">{event.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SourceBadge source={event.source} />
                      <span className="font-mono text-[10px] text-gray-400">{event.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Exception Analysis */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Exception Analysis</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ExceptionBadge type={shipment.exceptionType} />
            <SeverityBadge severity={shipment.severity} />
          </div>
          <div className="text-xs space-y-1.5 mt-2">
            <InfoRow label="Triggered" value={shipment.exceptionTrigger} />
            <InfoRow label="Likely Cause" value={shipment.likelyCause} />
            <InfoRow label="Impact" value={shipment.businessImpact} highlight />
          </div>
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">OTM Status:</span>
              <OTMStatusBadge status={shipment.otmStatus} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">Notification:</span>
              <span className={cn(
                "text-[11px] font-medium",
                shipment.notificationStatus === "Sent" || actions.notified ? "text-green-600" : "text-gray-500"
              )}>
                {actions.notified ? "Sent" : shipment.notificationStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agent Summary */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={14} className={`text-blue-600 ${summaryThinking ? "animate-pulse" : ""}`} />
          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Agent Assessment</span>
        </div>
        {summaryThinking ? (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="text-xs text-blue-500 font-medium">Assessing shipment</span>
            <span className="inline-flex items-end gap-[3px] ml-0.5">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }} />
              ))}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-700 leading-relaxed">{shipment.agentSummary}</p>
        )}
      </div>

      {/* Action Buttons — only shown when there's an active exception/delay to resolve */}
      {shipment.delayHours > 0 && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommended Actions</h4>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              label={actions.etaApproved ? "ETA Approved" : "Approve ETA Update"}
              variant="primary"
              done={actions.etaApproved}
              icon={<Check size={12} />}
              onClick={() => onAction("etaApproved")}
            />
            <ActionButton
              label={actions.notified ? "Team Notified" : "Notify Destination Team"}
              variant="primary"
              done={actions.notified}
              icon={<Send size={12} />}
              onClick={() => { if (!actions.notified) onShowEmail() }}
            />
            <ActionButton
              label={actions.escalated ? "Escalated" : "Escalate"}
              variant="secondary"
              done={actions.escalated}
              icon={<AlertOctagon size={12} />}
              onClick={() => { if (!actions.escalated && !escalateCalling) setEscalateConfirm(true) }}
            />
            <ActionButton
              label="Override ETA"
              variant="secondary"
              icon={<RotateCcw size={12} />}
              onClick={() => {}}
            />
            <ActionButton
              label="Hold for Review"
              variant="tertiary"
              icon={<PauseCircle size={12} />}
              onClick={() => {}}
            />
          </div>

          {/* Escalation Confirmation Card */}
          {escalateConfirm && !actions.escalated && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={14} className="text-red-600" />
                <span className="text-xs font-semibold text-red-800">Escalate to VP Operations?</span>
              </div>
              <p className="text-[11px] text-red-700 mb-3 leading-relaxed">
                AI agent will place a notification call to VP Operations regarding {shipment.id} — {shipment.severity} severity {shipment.exceptionType} ({shipment.delayHours > 0 ? `+${shipment.delayHours}h delay` : "no delay"}).
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEscalateCall}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <PhoneCall size={11} /> Yes, Escalate Now
                </button>
                <button
                  onClick={() => setEscalateConfirm(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Escalation Call Animation */}
          {escalateCalling && (
            <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <PhoneCall size={14} className="text-indigo-600 animate-pulse" />
                <span className="text-xs font-semibold text-indigo-800">AI Agent — Escalation Call in Progress</span>
              </div>
              <div className="space-y-2">
                {[
                  { step: 1, text: "Connecting to VP Operations..." },
                  { step: 2, text: `Relaying shipment ${shipment.id} status — ${shipment.severity} ${shipment.exceptionType}` },
                  { step: 3, text: `Informing of +${shipment.delayHours}h delay impact on ${shipment.plant}` },
                  { step: 4, text: "Call complete — Escalation acknowledged by VP Operations" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-center gap-2">
                    {escalateCallStep >= step ? (
                      <CheckCircle size={12} className={step === 4 ? "text-green-600" : "text-indigo-600"} />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-indigo-300" />
                    )}
                    <span className={cn(
                      "text-[11px]",
                      escalateCallStep >= step
                        ? step === 4 ? "text-green-700 font-semibold" : "text-indigo-700"
                        : "text-indigo-400"
                    )}>
                      {text}
                    </span>
                    {escalateCallStep === step - 1 && step <= 3 && (
                      <span className="inline-flex items-end gap-[2px] ml-1">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }} />
                        ))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Signals Tab ───────────────────────────────────────────────────────────────
interface SignalsTabProps {
  shipment: Shipment
  reconciling: boolean
  resolvedSource: string | null
  onReconcile: () => void
}
function SignalsTab({ shipment, reconciling, resolvedSource, onReconcile }: SignalsTabProps) {
  const totalSources = shipment.sources.length
  const alignedCount = shipment.sources.filter(s => s.aligned === true).length
  const hasConflict = shipment.sources.some(s => s.aligned === false)
  const staleSources = shipment.sources.filter(s => !s.fresh)
  const freshSources = shipment.sources.filter(s => s.fresh && s.timestamp)
  const mostRecent = freshSources.length > 0 ? freshSources[0] : null
  const stalest = staleSources.length > 0 ? staleSources[0] : null

  return (
    <div className="p-5 space-y-4">
      {/* Concordance summary with visual bar */}
      <div className={cn("rounded-lg border p-4", hasConflict ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200")}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Source Alignment</span>
          <span className="text-sm font-bold text-gray-800">{alignedCount}/{totalSources} aligned</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", hasConflict ? "bg-amber-500" : "bg-green-500")}
            style={{ width: `${totalSources > 0 ? (alignedCount / totalSources) * 100 : 0}%` }}
          />
        </div>
        {/* Most Recent / Stalest highlights */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {mostRecent && (
            <div className="text-[10px]">
              <span className="text-gray-400">Most Recent:</span>{" "}
              <span className="font-medium text-green-700">{mostRecent.source}</span>{" "}
              <span className="text-gray-500">({mostRecent.freshness})</span>
            </div>
          )}
          {stalest && (
            <div className="text-[10px]">
              <span className="text-gray-400">Stalest Source:</span>{" "}
              <span className="font-medium text-amber-700">{stalest.source}</span>{" "}
              <span className="text-gray-500">({stalest.freshness})</span>
            </div>
          )}
        </div>
      </div>

      {/* Source matrix */}
      <div>
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Source Concordance</h4>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Source</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Latest Status</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Timestamp</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Freshness</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Aligned</th>
              </tr>
            </thead>
            <tbody>
              {shipment.sources.map((src) => (
                <tr key={src.source} className={cn(
                  "border-b border-gray-100",
                  src.aligned === true ? "bg-green-50/40" :
                  src.aligned === false ? "bg-red-50/40" :
                  !src.fresh ? "bg-gray-50/60" :
                  "bg-white"
                )}>
                  <td className="px-3 py-2.5"><SourceBadge source={src.source} /></td>
                  <td className="px-3 py-2.5 text-gray-600">{src.status || <span className="text-gray-300 italic">No update</span>}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-500">{src.timestamp || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-[11px] font-medium", src.fresh ? "text-green-600" : "text-amber-600")}>
                      {src.freshness}
                      {!src.fresh && " — Stale"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {src.aligned === true && <span className="text-green-600 font-semibold">Yes</span>}
                    {src.aligned === false && <span className="text-red-600 font-semibold">Conflict</span>}
                    {src.aligned === null && <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflict callout + AI Reconcile */}
      {hasConflict && (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">Source Conflict Detected</div>
                <p className="text-xs text-red-800">
                  {resolvedSource
                    ? `Agent has resolved the conflict — trusting ${resolvedSource} as the authoritative source.`
                    : "One or more sources are reporting conflicting status. Use AI Reconcile to automatically identify the authoritative source."
                  }
                </p>
              </div>
              {!resolvedSource && (
                <button
                  onClick={onReconcile}
                  disabled={reconciling}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  <Brain size={11} className={reconciling ? "animate-pulse" : ""} />
                  {reconciling ? "Reconciling…" : "AI Reconcile"}
                </button>
              )}
            </div>
            {reconciling && (
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-indigo-700">
                <Loader2 size={11} className="animate-spin shrink-0" />
                <span>Agent cross-validating sources — checking timestamp recency, carrier authority, and GPS correlation…</span>
              </div>
            )}
          </div>

          {/* AI Resolution card */}
          {resolvedSource && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Check size={13} className="text-green-700 shrink-0" />
                <span className="text-[11px] font-semibold text-green-800 uppercase tracking-wider">AI Reconciliation Complete</span>
              </div>
              <p className="text-xs text-green-900">
                <strong>{resolvedSource}</strong> selected as authoritative source —
                {" "}most recent signal, highest carrier authority, and GPS correlation confirmed.
              </p>
              <p className="text-[10px] text-green-700">
                Recommendation: Update OTM using {resolvedSource} data. Stale/conflicting sources flagged for re-sync.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── OTM Tab ───────────────────────────────────────────────────────────────────
function OTMTab({ shipment, actions, syncing, onOTMSync, onAction, onShowEmail, onSendNotification }: {
  shipment: Shipment
  actions: ActionState
  syncing: boolean
  onOTMSync: () => void
  onAction: (k: keyof ActionState) => void
  onShowEmail: () => void
  onSendNotification?: (email: SentEmailItem) => void
}) {
  const [sendChannel, setSendChannel] = useState<"email" | "message" | "both">("email")
  const otmStatus = actions.otmSynced ? "Synced" : shipment.otmStatus

  const handleSendNotification = () => {
    const now = new Date()
    const timeStr = now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    const email: SentEmailItem = {
      id: `SE-${Date.now()}`,
      to: getNotificationRecipients(shipment.severity),
      toName: `${shipment.plant} — Receiving Team`,
      subject: `ETA Update — ${shipment.id} — Revised ETA +${shipment.delayHours}h`,
      body: `Dear Receiving Team,

This is an automated notification from the Shipment Tracking Agent.

Shipment ${shipment.id} (${shipment.carrier}) en route from ${shipment.origin} to ${shipment.destination} has been updated in OTM.

Revised ETA: ${shipment.revisedETA} (+${shipment.delayHours}h from planned)
Reason: ${shipment.reasonChips.map((c) => c.label).join(", ")}
Exception: ${shipment.exceptionType}

OTM has been updated and this notification has been sent via ${sendChannel === "both" ? "email and message" : sendChannel}.

Please plan accordingly and contact us if you have questions.

Best regards,
Export Coordination Team`,
      timestamp: timeStr,
      shipmentId: shipment.id,
      tag: "delay",
    }
    onSendNotification?.(email)
    onAction("notified")
  }

  return (
    <div className="p-5 space-y-4">
      {/* OTM Sync Card */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">OTM Update Simulation</h4>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
            <div className="text-[10px] text-gray-400 mb-0.5">OTM Planned ETA</div>
            <div className="font-mono text-sm font-medium text-gray-700">{shipment.plannedETA}</div>
          </div>
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <div className="text-[10px] text-blue-500 mb-0.5">Proposed Revised ETA</div>
            <div className="font-mono text-sm font-semibold text-blue-700">{shipment.revisedETA}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-gray-500">Sync Status:</span>
          <OTMStatusBadge status={otmStatus} />
          {actions.otmSynced && (
            <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <CheckCircle size={12} /> Pushed to OTM
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOTMSync}
            disabled={syncing || actions.otmSynced}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors",
              actions.otmSynced
                ? "bg-green-50 text-green-700 border border-green-200 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {syncing && <Loader2 size={12} className="animate-spin" />}
            {actions.otmSynced ? "Synced to OTM" : syncing ? "Pushing..." : "Approve & Push to OTM"}
          </button>
          <button className="px-4 py-2 rounded-md text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            Override ETA
          </button>
          <button className="px-4 py-2 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Hold
          </button>
        </div>
      </div>

      {/* Post-OTM: Notify Receiver card — appears after OTM approval */}
      {actions.otmSynced && !actions.notified && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Send size={11} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">Notify Receiver</p>
              <p className="text-[11px] text-blue-500">OTM updated — send delay alert to destination</p>
            </div>
          </div>

          {/* Recipient preview */}
          <div className="rounded-md bg-white border border-blue-200 px-3 py-2.5 space-y-1.5 text-xs">
            <div className="flex gap-2">
              <span className="text-gray-400 w-14 shrink-0">To:</span>
              <span className="text-gray-700">{getNotificationRecipients(shipment.severity)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-14 shrink-0">Subject:</span>
              <span className="text-gray-700 font-medium">ETA Update — {shipment.id} — Revised ETA +{shipment.delayHours}h</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-14 shrink-0">Plant:</span>
              <span className="text-gray-700">{shipment.plant}</span>
            </div>
          </div>

          {/* Channel selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-blue-700 font-medium">Send via:</span>
            {(["email", "message", "both"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setSendChannel(ch)}
                className={cn(
                  "text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors capitalize",
                  sendChannel === ch
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-700 border-blue-300 hover:border-blue-500"
                )}
              >
                {ch === "both" ? "Email + Message" : ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>

          {/* Send button */}
          <button
            onClick={handleSendNotification}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
          >
            <Send size={12} />
            Send {sendChannel === "both" ? "Email + Message" : sendChannel === "message" ? "Message" : "Email"} to Receiver
          </button>
        </div>
      )}

      {/* Notification sent confirmation */}
      {actions.otmSynced && actions.notified && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2">
          <CheckCircle size={14} className="text-green-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-800">Receiver notified successfully</p>
            <p className="text-[10px] text-green-600">Email synced to Sent folder</p>
          </div>
        </div>
      )}

      {/* Notification Preview */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Notification Preview</h4>
        <div className="rounded-md bg-gray-50 border border-gray-200 p-3 space-y-1.5 text-xs">
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 shrink-0">To:</span>
            <span className="text-gray-700">{getNotificationRecipients(shipment.severity)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 shrink-0">Subject:</span>
            <span className="text-gray-700 font-medium">Delay Alert — {shipment.id} — Revised ETA +{shipment.delayHours}h</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="text-gray-600 leading-relaxed line-clamp-3">
              This is an automated notification from the Shipment Tracking Agent. Shipment {shipment.id} ({shipment.carrier}) 
              en route from {shipment.origin} to {shipment.destination} is experiencing a delay of {shipment.delayHours} hours. 
              Revised ETA: {shipment.revisedETA}. Reason: {shipment.reasonChips.map(c => c.label).join(", ")}...
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onShowEmail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Preview Full Email
            <ChevronRight size={11} />
          </button>
          <button
            onClick={() => onAction("emailSent")}
            disabled={actions.emailSent}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
              actions.emailSent
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            <Send size={11} />
            {actions.emailSent ? "Alert Sent" : "Send Alert"}
          </button>
          <button
            onClick={() => onAction("escalated")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <AlertOctagon size={11} />
            Escalate
          </button>
        </div>
      </div>

      {/* Notification Routing Matrix */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Notification Routing Matrix</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2.5 py-2 border-b border-gray-200">Severity</th>
                <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2.5 py-2 border-b border-gray-200">Normal Priority</th>
                <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2.5 py-2 border-b border-gray-200">Critical Material</th>
              </tr>
            </thead>
            <tbody>
              {([
                { severity: "Medium" as const, normal: "Router", critical: "Router + Plant Team" },
                { severity: "High" as const, normal: "Router + Coordinator", critical: "Router + Coordinator + Plant Team" },
                { severity: "Critical" as const, normal: "Router + Coordinator + Plant Team + Escalation", critical: "Router + Coordinator + Plant Team + Escalation" },
              ]).map((row) => {
                const isActiveRow = shipment.severity === row.severity
                const isCriticalMat = !!shipment.criticalMaterial
                return (
                  <tr key={row.severity} className={cn(isActiveRow ? "bg-blue-50/60" : "")}>
                    <td className={cn("px-2.5 py-2 border-b border-gray-100 font-semibold", isActiveRow ? "text-blue-700" : "text-gray-600")}>
                      {row.severity}
                      {isActiveRow && <span className="ml-1.5 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold align-middle">Active</span>}
                    </td>
                    <td className={cn(
                      "px-2.5 py-2 border-b border-gray-100",
                      isActiveRow && !isCriticalMat ? "text-blue-700 font-semibold bg-blue-100/50" : "text-gray-500"
                    )}>
                      {row.normal}
                    </td>
                    <td className={cn(
                      "px-2.5 py-2 border-b border-gray-100",
                      isActiveRow && isCriticalMat ? "text-blue-700 font-semibold bg-blue-100/50" : "text-gray-500"
                    )}>
                      {row.critical}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {shipment.criticalMaterial && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-red-700 font-semibold">
            <AlertOctagon size={11} />
            Critical Material Override: Plant Team notified regardless of severity
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-24 shrink-0">{label}:</span>
      <span className={cn("text-gray-700", highlight ? "font-medium text-amber-800" : "")}>{value}</span>
    </div>
  )
}

function ActionButton({ label, variant, done, icon, onClick }: {
  label: string
  variant: "primary" | "secondary" | "tertiary"
  done?: boolean
  icon?: React.ReactNode
  onClick: () => void
}) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
  const styles = {
    primary: done
      ? `${base} bg-green-50 text-green-700 border border-green-200`
      : `${base} bg-blue-600 text-white hover:bg-blue-700`,
    secondary: done
      ? `${base} bg-green-50 text-green-700 border border-green-200`
      : `${base} border border-gray-300 text-gray-600 hover:bg-gray-50`,
    tertiary: `${base} text-gray-500 hover:text-gray-700`,
  }
  return (
    <button onClick={onClick} disabled={done} className={styles[variant]}>
      {done ? <CheckCircle size={12} /> : icon}
      {label}
    </button>
  )
}

function getNotificationRecipients(severity: string) {
  if (severity === "Critical") return "router@company.com, coordinator@company.com, plant-team@company.com"
  if (severity === "High") return "router@company.com, coordinator@company.com"
  return "router@company.com"
}
