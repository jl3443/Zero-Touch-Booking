"use client"

import { useState, useEffect } from "react"
import { type BookingRequest } from "@/lib/mock-data"
import {
  SeverityBadge, ModeBadge, ExceptionBadge, ReasonChips,
  BookingStatusBadge, CarrierBadge, SourceBadge, OTMStatusBadge,
} from "./shared"
import { cn } from "@/lib/utils"
import {
  X, Brain, CheckCircle, Send, AlertOctagon, ArrowRight,
  Check, Loader2, FileText, Anchor, Truck, Upload, Bell,
  Monitor, Search, ShieldCheck,
  MapPin, RefreshCw, ChevronRight, Zap, Clock, Calendar,
  Mail, TrendingUp, ArrowUp, ArrowDown,
} from "lucide-react"
import { ModeIcon } from "./shared"
import { EmailComposer } from "./email-composer"
import { type SentEmailItem } from "./email-sent-page"

// Keep Shipment alias
type Shipment = BookingRequest

interface ActionState {
  bookingApproved: boolean
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
  onResumeWorkflow?: (shipmentId: string) => void
}

const LOADING_STEPS = [
  {
    title: "Connecting to SAP/OTM",
    subtitle: "Pulling shipment requirement, commodity details & routing rules",
    items: ["SAP TM Gateway", "OTM Integration", "Routing Rules Engine"],
  },
  {
    title: "Evaluating carriers",
    subtitle: "Comparing rates, SLA scores & capacity across 4 carrier portals",
    items: ["Maersk Portal", "MSC Portal", "Hapag-Lloyd / CMA-CGM"],
  },
  {
    title: "Preparing booking submission",
    subtitle: "Generating optimal booking parameters & document checklist",
    items: ["Vessel Schedule Match", "Container Allocation", "Document Validation"],
  },
]

// Connection exception types get modified loading with portal failure
const CONNECTION_EXCEPTIONS = ["Portal Unavailable", "Credentials Expired"] as const
function getLoadingSteps(carrier: string) {
  return [
    {
      title: "Connecting to SAP/OTM",
      subtitle: "Pulling shipment requirement, commodity details & routing rules",
      items: ["SAP TM Gateway", "OTM Integration", "Routing Rules Engine"],
    },
    {
      title: "Connecting to carrier portals",
      subtitle: "Testing API connections to carrier booking systems",
      items: ["Maersk Portal", "MSC Portal", `${carrier} Portal`],
    },
    {
      title: "Preparing booking submission",
      subtitle: "Generating optimal booking parameters & document checklist",
      items: ["Vessel Schedule Match", "Container Allocation", "Document Validation"],
    },
  ]
}

// ─── Workflow Step Icons ──────────────────────────────────────────────────
const STEP_ICONS = [
  FileText,   // 1. Read requirement
  Search,     // 2. Identify carrier
  Monitor,    // 3. Portal login
  Anchor,     // 4. Complete booking
  Upload,     // 5. Upload docs
  ShieldCheck,// 6. Get confirmation
  Bell,       // 7. Notify + update SAP
  Truck,      // 8. Track status
]

function ThinkingDots() {
  return (
    <span className="inline-flex items-end gap-[3px] ml-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  )
}

// ─── Reusable AI Thinking Skeleton ──────────────────────────────────────────
function AIThinkingSkeleton({ label = "AI analyzing" }: { label?: string }) {
  return (
    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 animate-pulse">
      <div className="flex items-center gap-1.5">
        <Brain size={13} className="text-blue-400 animate-pulse" />
        <span className="text-[11px] font-semibold text-blue-400">{label}<ThinkingDots /></span>
      </div>
    </div>
  )
}

export function ShipmentDrawer({ shipment, onClose, onOpenWeather, onSendNotification, onEtaApproved, onResumeWorkflow }: ShipmentDrawerProps) {
  const [actions, setActions] = useState<ActionState>({
    bookingApproved: false,
    notified: false,
    escalated: false,
    otmSynced: false,
    emailSent: false,
  })
  const [resuming, setResuming] = useState(false)
  const [resumed, setResumed] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingTick, setLoadingTick] = useState(0)
  // Req 5: Track reroute approval for timeline color change
  const [approvedReroute, setApprovedReroute] = useState(false)
  // Req 4: Notification confirmation card
  const [showNotifyConfirmation, setShowNotifyConfirmation] = useState(false)
  // Req 7: Auto-prompt notify after SAP/OTM push
  const [showNotifyPrompt, setShowNotifyPrompt] = useState(false)
  // Track what type of notification was sent
  const [notifyType, setNotifyType] = useState<"email" | "message" | "both" | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setLoadingTick(0)
    setActions({ bookingApproved: false, notified: false, escalated: false, otmSynced: false, emailSent: false })
    setApprovedReroute(false)
    setShowNotifyConfirmation(false)
    setShowNotifyPrompt(false)
    setNotifyType(null)
    setResuming(false)
    setResumed(false)
    const tick = setInterval(() => setLoadingTick((prev) => prev + 1), 340)
    const done = setTimeout(() => { clearInterval(tick); setIsLoading(false) }, 3200)
    return () => { clearInterval(tick); clearTimeout(done) }
  }, [shipment?.id])

  const loadingStep = Math.min(Math.floor(loadingTick / 3), 2)
  const loadingSubItem = loadingTick % 3

  if (!shipment) return null

  const handleAction = (key: keyof ActionState) => {
    setActions((prev) => ({ ...prev, [key]: true }))
  }

  // Req 7: After SAP/OTM sync, auto-show notify prompt
  const handleSyncOTM = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      handleAction("otmSynced")
      setShowNotifyPrompt(true)
    }, 1200)
  }

  // Req 5: Also set approvedReroute for timeline color change
  const handleApproveBooking = () => {
    handleAction("bookingApproved")
    setApprovedReroute(true)
    onEtaApproved?.()
  }

  // Send in-app message only
  const handleSendMessage = () => {
    handleAction("notified")
    setShowNotifyConfirmation(true)
    setShowNotifyPrompt(false)
    setNotifyType("message")
  }

  // Req 4: Show confirmation card after sending email notification
  const handleSendNotification = (email: SentEmailItem) => {
    handleAction("notified")
    handleAction("emailSent")
    setShowEmailModal(false)
    setShowNotifyConfirmation(true)
    setShowNotifyPrompt(false)
    // If notifyType was set to 'both', keep it; otherwise it's email-only
    if (notifyType !== "both") setNotifyType("email")
    onSendNotification?.(email)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-screen w-[520px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ModeIcon mode={shipment.mode} size={18} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-800 text-sm">{shipment.id}</span>
                <BookingStatusBadge status={shipment.bookingStatus} />
                <SeverityBadge severity={shipment.severity} />
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {shipment.origin} → {shipment.destination} · {shipment.containerType}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* ── Loading state ──────────────────────────────────────────── */}
        {isLoading && (() => {
          const isConnException = CONNECTION_EXCEPTIONS.includes(shipment.exceptionType as typeof CONNECTION_EXCEPTIONS[number])
          const steps = isConnException ? getLoadingSteps(shipment.carrier) : LOADING_STEPS
          // For connection exceptions: step 2 fails on last sub-item
          const failStep = isConnException ? 1 : -1  // step index that fails (0-based)
          const failItem = isConnException ? 2 : -1  // sub-item index that fails

          return (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
            <Brain size={28} className="text-indigo-500 animate-pulse mb-4" />
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Agent analyzing booking<ThinkingDots />
            </p>
            <p className="text-xs text-gray-400 mb-6">Processing booking workflow data</p>

            <div className="w-full max-w-sm space-y-4">
              {steps.map((step, si) => {
                const isActive = si === loadingStep
                const isDone = si < loadingStep
                // For connection exceptions: step 2 (si=1) shows as failed after all its items are shown
                const isFailed = isConnException && si === failStep && isDone
                const isStepFailing = isConnException && si === failStep && isActive && loadingSubItem >= failItem

                return (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                        isFailed ? "bg-red-500 border-red-500 text-white" :
                        isDone ? "bg-green-500 border-green-500 text-white" :
                        isStepFailing ? "bg-red-500 border-red-500 text-white" :
                        isActive ? "bg-indigo-500 border-indigo-500 text-white" :
                        "bg-white border-gray-300 text-gray-400"
                      )}>
                        {isFailed ? <X size={12} /> :
                         isDone ? <Check size={12} /> :
                         isStepFailing ? <X size={12} /> :
                         isActive ? <Loader2 size={12} className="animate-spin" /> : si + 1}
                      </div>
                      {si < steps.length - 1 && <div className={cn("w-0.5 flex-1 mt-1",
                        isFailed || isStepFailing ? "bg-red-300" :
                        isDone ? "bg-green-400" : "bg-gray-200"
                      )} />}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className={cn("text-xs font-semibold",
                        isFailed || isStepFailing ? "text-red-700" :
                        isDone || isActive ? "text-gray-800" : "text-gray-400"
                      )}>{step.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{step.subtitle}</p>
                      {(isActive || isDone || isFailed) && (
                        <div className="mt-1.5 space-y-1">
                          {step.items.map((item, ii) => {
                            const show = isDone || isFailed || (isActive && ii <= loadingSubItem)
                            const isFailedItem = isConnException && si === failStep && ii === failItem
                            const itemDone = isDone || isFailed || (isActive && ii < loadingSubItem)
                            return show ? (
                              <div key={item} className="flex items-center gap-1.5 text-[10px]">
                                {isFailedItem && (itemDone || isStepFailing) ? (
                                  <X size={10} className="text-red-500 shrink-0" />
                                ) : itemDone ? (
                                  <Check size={10} className="text-green-500 shrink-0" />
                                ) : (
                                  <Loader2 size={10} className="text-indigo-400 shrink-0 animate-spin" />
                                )}
                                <span className={cn(isFailedItem && (itemDone || isStepFailing) ? "text-red-600 font-medium" : "text-gray-500")}>
                                  {item}{isFailedItem && (itemDone || isStepFailing) ? (shipment.exceptionType === "Credentials Expired" ? " — Credentials expired" : " — API timeout") : ""}
                                </span>
                              </div>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )
        })()}

        {/* ── Content (Req 6: Single scrollable view, no tabs) ──────── */}
        {!isLoading && (
          <div className="flex-1 overflow-y-auto">
            <OverviewTab
              shipment={shipment}
              actions={actions}
              onApprove={handleApproveBooking}
              resuming={resuming}
              resumed={resumed}
              onResumeWorkflow={() => {
                setResuming(true)
                setTimeout(() => {
                  setResuming(false)
                  setResumed(true)
                  onResumeWorkflow?.(shipment.id)
                }, 2000)
              }}
              approvedReroute={approvedReroute}
              syncing={syncing}
              onSyncOTM={handleSyncOTM}
              onSendEmail={() => { setNotifyType("email"); setShowEmailModal(true) }}
              onSendMessage={handleSendMessage}
              onSendBoth={() => { setNotifyType("both"); setShowEmailModal(true) }}
              showNotifyConfirmation={showNotifyConfirmation}
              notifyType={notifyType}
              showNotifyPrompt={showNotifyPrompt}
              onDismissNotifyPrompt={() => setShowNotifyPrompt(false)}
            />
          </div>
        )}
      </aside>

      {/* Email composer modal */}
      {showEmailModal && shipment && (
        <EmailComposer
          shipment={shipment}
          onClose={() => setShowEmailModal(false)}
          onSend={handleSendNotification}
        />
      )}
    </>
  )
}

// ─── Unified Overview (Req 6: All content in single scrollable view) ──────

function OverviewTab({ shipment, actions, onApprove, resuming, resumed, onResumeWorkflow,
  approvedReroute, syncing, onSyncOTM, onSendEmail, onSendMessage, onSendBoth,
  showNotifyConfirmation, notifyType, showNotifyPrompt, onDismissNotifyPrompt,
}: {
  shipment: BookingRequest; actions: ActionState; onApprove: () => void
  resuming: boolean; resumed: boolean; onResumeWorkflow: () => void
  approvedReroute: boolean
  syncing: boolean; onSyncOTM: () => void
  onSendEmail: () => void; onSendMessage: () => void; onSendBoth: () => void
  showNotifyConfirmation: boolean; notifyType: "email" | "message" | "both" | null
  showNotifyPrompt: boolean; onDismissNotifyPrompt: () => void
}) {
  const hasFailed = shipment.workflowSteps.some((s) => s.status === "failed")

  // Req 1: AI thinking animation for Agent Summary
  const [agentThinking, setAgentThinking] = useState(true)
  // Req 1: AI thinking animation for Carrier Recommendation section
  const [carrierThinking, setCarrierThinking] = useState(true)

  useEffect(() => {
    setAgentThinking(true)
    setCarrierThinking(true)
    const t1 = setTimeout(() => setAgentThinking(false), 1400)
    const t2 = setTimeout(() => setCarrierThinking(false), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [shipment.id])

  const recommended = shipment.carrierOptions.find((c) => c.recommended)

  return (
    <div className="p-5 space-y-5">
      {/* Summary header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ModeBadge mode={shipment.mode} />
          {shipment.carrier !== "—" && <CarrierBadge carrier={shipment.carrier} />}
          {shipment.exceptionType !== "None" && <ExceptionBadge type={shipment.exceptionType} />}
        </div>
        <div className="text-xs text-gray-500 space-y-0.5">
          <p><span className="font-medium text-gray-700">SAP Ref:</span> {shipment.sapOrderRef}</p>
          <p><span className="font-medium text-gray-700">Container:</span> {shipment.containerType}</p>
          <p><span className="font-medium text-gray-700">Target Ship:</span> {shipment.targetShipDate}</p>
          {shipment.bookingRef && <p><span className="font-medium text-gray-700">Booking Ref:</span> {shipment.bookingRef}</p>}
          {shipment.vesselSchedule && <p><span className="font-medium text-gray-700">Vessel:</span> {shipment.vesselSchedule}</p>}
        </div>
        <ReasonChips chips={shipment.reasonChips} />
      </div>

      {/* Req 1: Agent Summary with thinking animation */}
      {agentThinking ? (
        <AIThinkingSkeleton label="Agent analyzing booking context" />
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Brain size={13} className="text-indigo-500" />
            <span className="text-[11px] font-semibold text-indigo-700">Agent Summary</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{shipment.agentSummary}</p>
        </div>
      )}

      {/* Notification confirmation card — dynamic based on notifyType */}
      {actions.notified && showNotifyConfirmation && notifyType && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-xs font-bold text-green-700">
              {notifyType === "both" ? "Notifications Sent Successfully" :
               notifyType === "email" ? "Email Sent Successfully" :
               "Message Sent Successfully"}
            </span>
          </div>
          <div className={cn("grid gap-2", notifyType === "both" ? "grid-cols-2" : "grid-cols-1")}>
            {(notifyType === "message" || notifyType === "both") && (
              <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-green-100">
                <Bell size={12} className="text-blue-500" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">In-App Message</p>
                  <p className="text-[9px] text-gray-400">Sent to plant team</p>
                </div>
              </div>
            )}
            {(notifyType === "email" || notifyType === "both") && (
              <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-green-100">
                <Mail size={12} className="text-indigo-500" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">Email Notification</p>
                  <p className="text-[9px] text-gray-400">Sent to stakeholders</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval banner removed — approval handled via exception panels */}

      {/* ── 8-Step Workflow Stepper (Req 2: newest on top) ──────────── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Booking Workflow</h4>
        <div className="space-y-0">
          {[...shipment.workflowSteps].reverse().map((step, ri) => {
            const i = shipment.workflowSteps.length - 1 - ri  // original index for icons
            const Icon = STEP_ICONS[i] ?? FileText
            // Override status when resuming/resumed
            let effectiveStatus = step.status
            if (step.status === "failed" && (resuming || resumed)) {
              effectiveStatus = resuming ? "active" : "completed"
            }
            // Req 5: Approve reroute changes failed → completed (green)
            if (step.status === "failed" && approvedReroute) {
              effectiveStatus = "completed"
            }
            // If this is the step right after the failed one and we've resumed, make it active
            const failedIdx = shipment.workflowSteps.findIndex((s) => s.status === "failed")
            if (resumed && failedIdx >= 0 && i === failedIdx + 1 && step.status === "pending") {
              effectiveStatus = "active"
            }

            const isCompleted = effectiveStatus === "completed"
            const isActive = effectiveStatus === "active"
            const isFailed = effectiveStatus === "failed"
            const isPending = effectiveStatus === "pending"

            return (
              <div key={step.step} className="flex gap-3">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                    isCompleted ? "bg-green-500 border-green-500 text-white" :
                    isActive ? "bg-blue-500 border-blue-500 text-white" :
                    isFailed ? "bg-red-500 border-red-500 text-white" :
                    "bg-white border-gray-300 text-gray-400"
                  )}>
                    {isCompleted ? <Check size={12} /> :
                     isActive ? <Loader2 size={12} className="animate-spin" /> :
                     isFailed ? <X size={12} /> :
                     <Icon size={12} />}
                  </div>
                  {ri < shipment.workflowSteps.length - 1 && (
                    <div className={cn(
                      "w-0.5 flex-1 min-h-[12px]",
                      isCompleted ? "bg-green-400" : isFailed ? "bg-red-300" : "bg-gray-200"
                    )} />
                  )}
                </div>

                {/* Step content */}
                <div className={cn("flex-1 pb-3", isPending && "opacity-50")}>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-xs font-semibold",
                      isCompleted ? "text-green-700" :
                      isActive ? "text-blue-700" :
                      isFailed ? "text-red-700" :
                      "text-gray-400"
                    )}>
                      {step.title}
                    </p>
                    {step.system && (
                      <span className={cn(
                        "text-[9px] font-medium px-1.5 py-0.5 rounded border",
                        isCompleted ? "bg-green-50 text-green-600 border-green-200" :
                        isActive ? "bg-blue-50 text-blue-600 border-blue-200" :
                        isFailed ? "bg-red-50 text-red-600 border-red-200" :
                        "bg-gray-50 text-gray-400 border-gray-200"
                      )}>
                        {step.system}
                      </span>
                    )}
                    {/* Resumed label */}
                    {step.status === "failed" && resumed && !approvedReroute && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                        Resumed
                      </span>
                    )}
                    {/* Req 5: Resolved label after approve */}
                    {step.status === "failed" && approvedReroute && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                        Resolved
                      </span>
                    )}
                  </div>
                  {step.timestamp && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{step.timestamp}</p>
                  )}
                  {step.detail && !resumed && !approvedReroute && (
                    <p className={cn(
                      "text-[10px] mt-0.5",
                      isFailed ? "text-red-600 font-medium" : "text-gray-500"
                    )}>
                      {step.detail}
                    </p>
                  )}
                  {step.status === "failed" && resumed && !approvedReroute && (
                    <p className="text-[10px] mt-0.5 text-green-600 font-medium">
                      Step recovered — agent continuing workflow
                    </p>
                  )}
                  {step.status === "failed" && approvedReroute && (
                    <p className="text-[10px] mt-0.5 text-green-600 font-medium">
                      Exception resolved — agent rerouting to alternate carrier
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Connection Exception Panel (Portal Unavailable / Credentials Expired) */}
        {(shipment.exceptionType === "Portal Unavailable" || shipment.exceptionType === "Credentials Expired") && (
          <div className="mt-3">
            <ConnectionExceptionPanel shipment={shipment} onApprove={onApprove} />
          </div>
        )}
        {/* Unified Exception Panel (all other non-happy-path exceptions) */}
        {shipment.exceptionType !== "None" &&
          shipment.exceptionType !== "Portal Unavailable" &&
          shipment.exceptionType !== "Credentials Expired" && (
          <div className="mt-3">
            <UnifiedExceptionPanel shipment={shipment} onApprove={onApprove} />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
           SAP/OTM & Notifications (merged from NotificationsTab)
         ══════════════════════════════════════════════════════════════ */}
      <div className="border-t border-gray-200 pt-5 mt-2 space-y-5">
        {/* SAP/OTM Sync Status */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">SAP TM / OTM Status</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Sync Status</span>
              <OTMStatusBadge status={actions.otmSynced ? "Synced" : shipment.otmStatus} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">SAP Order</span>
              <span className="text-xs font-mono text-gray-800">{shipment.sapOrderRef}</span>
            </div>
            {shipment.bookingRef && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Booking Ref</span>
                <span className="text-xs font-mono font-bold text-green-700">{shipment.bookingRef}</span>
              </div>
            )}
            {shipment.vesselSchedule && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Vessel</span>
                <span className="text-xs text-gray-700">{shipment.vesselSchedule}</span>
              </div>
            )}

            {!actions.otmSynced && shipment.otmStatus !== "Synced" && (
              <button
                onClick={onSyncOTM}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                {syncing ? "Syncing to SAP/OTM..." : "Push to SAP/OTM"}
              </button>
            )}
            {(actions.otmSynced || shipment.otmStatus === "Synced") && (
              <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                <CheckCircle size={13} /> SAP TM & OTM synchronized
              </div>
            )}
          </div>
        </div>

        {/* Auto-prompt to send notification after SAP/OTM push — 3 options */}
        {showNotifyPrompt && !actions.notified && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-blue-600" />
              <span className="text-[11px] font-semibold text-blue-800">SAP/OTM synced — Send notification?</span>
            </div>
            <p className="text-[10px] text-blue-600">
              Notify plant and destination team about the booking update.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={onSendEmail}
                className="flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Mail size={10} /> Email
              </button>
              <button
                onClick={onSendMessage}
                className="flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-700 transition-colors"
              >
                <Bell size={10} /> Message
              </button>
              <button
                onClick={onSendBoth}
                className="flex items-center justify-center gap-1 py-2 rounded-lg bg-green-600 text-white text-[10px] font-semibold hover:bg-green-700 transition-colors"
              >
                <Send size={10} /> Both
              </button>
            </div>
            <button
              onClick={onDismissNotifyPrompt}
              className="w-full py-1 rounded-lg text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip
            </button>
          </div>
        )}

        {/* Notification Status */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notifications</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-gray-700">Plant / Destination Team</p>
                <p className="text-[10px] text-gray-400">{shipment.plant}</p>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                actions.notified || shipment.notificationStatus === "Sent"
                  ? "bg-green-100 text-green-700"
                  : shipment.notificationStatus === "Escalated"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-500"
              )}>
                {actions.notified ? "Sent" : shipment.notificationStatus}
              </span>
            </div>

            {!actions.notified && shipment.notificationStatus !== "Sent" && !showNotifyPrompt && (
              <button
                onClick={onSendEmail}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <Send size={12} /> Send Booking Notification
              </button>
            )}
          </div>
        </div>

        {/* Source Signals */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Data Sources</h4>
          <div className="space-y-1.5">
            {shipment.sources.map((src) => (
              <div key={src.source} className="flex items-center justify-between bg-gray-50 rounded px-2.5 py-2 border border-gray-100">
                <div className="flex items-center gap-2">
                  <SourceBadge source={src.source} />
                  <span className="text-[11px] text-gray-600">{src.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    src.fresh ? "bg-green-500" : "bg-amber-500"
                  )} />
                  <span className="text-[10px] text-gray-400">{src.freshness}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Unified Exception Panel (Missing Allocation, Rate Mismatch, Missing Fields, Carrier Rejection) ──

function UnifiedExceptionPanel({ shipment, onApprove }: { shipment: BookingRequest; onApprove: () => void }) {
  const [approvedReroute, setApprovedReroute] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retried, setRetried] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const [notified, setNotified] = useState(false)
  const [aiThinking, setAiThinking] = useState(true)

  useEffect(() => {
    setAiThinking(true)
    const t = setTimeout(() => setAiThinking(false), 1500)
    return () => clearTimeout(t)
  }, [shipment.id])

  const recommended = shipment.carrierOptions.find((c) => c.recommended)
  const exType = shipment.exceptionType
  const isRejection = exType === "Carrier Rejection"
  const disabledCarrier = isRejection ? shipment.carrier : null

  // Exception-specific config
  const config = (() => {
    const requiredFields = (shipment.missingFields ?? []).filter((f) => f.required)
    switch (exType) {
      case "Missing Allocation":
        return {
          bannerTitle: "Missing Carrier Allocation",
          severity: "HIGH", severityClass: "bg-red-600",
          bannerDesc: <>No carrier capacity available on <span className="font-semibold">{shipment.lane}</span> for target sailing window. All contracted carriers at full allocation.</>,
          policyItems: [
            "All contracted carriers at full allocation for target window",
            "Next available sailing: +4 days from target date",
            "Alternate routing via transshipment ports available",
            "Recommendation: Approve AI-selected alternate carrier",
          ],
          retryLabel: "Check Capacity",
          retryFailMsg: "All carriers confirmed: no capacity available. Please approve reroute or escalate.",
        }
      case "Rate Mismatch":
        return {
          bannerTitle: "Rate Mismatch — Approval Required",
          severity: "HIGH", severityClass: "bg-red-600",
          bannerDesc: <><span className="font-semibold">{shipment.carrier}</span> spot rate exceeds contract threshold. Agent flagged for planner approval before proceeding.</>,
          policyItems: [
            `Spot rate vs contract rate: ${recommended ? `$${recommended.rate.toLocaleString()} vs $${recommended.contractRate.toLocaleString()} (${((recommended.rate - recommended.contractRate) / recommended.contractRate * 100).toFixed(0)}% premium)` : "N/A"}`,
            "Company policy: >10% variance requires planner approval",
            "Reefer container type limits available carrier options",
            "Recommendation: Approve spot rate or switch to alternate carrier",
          ],
          retryLabel: "Refresh Rates",
          retryFailMsg: "Rates unchanged. Please approve current rate or select alternate carrier.",
        }
      case "Missing Booking Fields":
        return {
          bannerTitle: "Missing Mandatory Booking Fields",
          severity: "MEDIUM", severityClass: "bg-amber-500",
          bannerDesc: <>SAP TM record incomplete — <span className="font-semibold">{requiredFields.length} required fields</span> missing. Booking agent blocked at validation.</>,
          policyItems: [
            "SAP TM validation requires all mandatory fields before booking",
            `Missing: ${requiredFields.map(f => f.label).join(", ")}`,
            "Agent blocked at Step 1 — cannot proceed to carrier selection",
            "Recommendation: Complete fields in SAP TM or approve with defaults",
          ],
          retryLabel: "Re-validate",
          retryFailMsg: "Fields still incomplete in SAP TM. Please complete fields or escalate.",
        }
      default: // Carrier Rejection
        return {
          bannerTitle: "Carrier Rejection — Booking Declined",
          severity: "CRITICAL", severityClass: "bg-red-700",
          bannerDesc: <><span className="font-semibold">{shipment.carrier}</span> rejected the booking at <span className="font-semibold">Step 6 (Confirmation)</span>. Steps 1–5 completed successfully.</>,
          policyItems: [
            "Booking submitted 3h 15m after vessel acceptance cut-off",
            "Vessel utilization: 98.2% at time of rejection",
            "Policy: Late bookings (>72h from acceptance) auto-declined",
            "Recommendation: Target T-5 days for future bookings on this lane",
          ],
          retryLabel: "Retry Booking",
          retryFailMsg: `${shipment.carrier} confirmed: vessel remains fully booked. Please approve reroute or escalate.`,
        }
    }
  })()

  const handleApproveWithCarrier = (carrierName?: string) => {
    const selected = carrierName ?? selectedCarrier ?? recommended?.carrier
    setSelectedCarrier(selected ?? null)
    setApprovedReroute(true)
    onApprove()
  }

  if (approvedReroute) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
        <CheckCircle size={14} className="text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-green-700">Reroute Approved — AI Rebooking</p>
          <p className="text-[11px] text-green-600 mt-0.5">
            Agent initiating booking with <span className="font-semibold">{selectedCarrier ?? recommended?.carrier ?? "alternate carrier"}</span>.
            Confirmation expected within 2h.
          </p>
        </div>
      </div>
    )
  }

  if (escalated) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <TrendingUp size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">Case Escalated</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Escalation case opened and assigned to supply chain manager. SLA clock paused pending resolution.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Exception Banner */}
      <div className="bg-red-50 border border-red-300 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertOctagon size={14} className="text-red-600 shrink-0" />
          <span className="text-xs font-bold text-red-800">{config.bannerTitle}</span>
          <span className={cn("text-[9px] font-bold text-white px-1.5 py-0.5 rounded ml-auto", config.severityClass)}>
            {config.severity}
          </span>
        </div>
        <p className="text-[11px] text-red-700">{config.bannerDesc}</p>
      </div>

      {/* Rejection Details Card (Carrier Rejection only) */}
      {isRejection && (
        <div className="bg-white border-2 border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <X size={13} className="text-red-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-800">Rejection Details</p>
            <span className={cn(
              "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded capitalize",
              shipment.rejectionCategory === "capacity" ? "bg-red-100 text-red-700" :
              shipment.rejectionCategory === "policy" ? "bg-purple-100 text-purple-700" :
              shipment.rejectionCategory === "equipment" ? "bg-amber-100 text-amber-700" :
              "bg-orange-100 text-orange-700"
            )}>
              {shipment.rejectionCategory ?? "capacity"}
            </span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Carrier:</span><span className="font-semibold text-gray-800">{shipment.carrier}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Reason:</span><span className="text-gray-700">{shipment.rejectionReason ?? "Vessel fully allocated"}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Impact:</span><span className="text-red-700 font-medium">+4 day delay · production risk</span></div>
          </div>
        </div>
      )}

      {/* Missing Fields Details (Missing Booking Fields only) */}
      {exType === "Missing Booking Fields" && (shipment.missingFields ?? []).length > 0 && (
        <div className="bg-white border-2 border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <FileText size={13} className="text-amber-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-800">Missing Fields</p>
          </div>
          <div className="space-y-1">
            {(shipment.missingFields ?? []).map((f) => (
              <div key={f.field} className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", f.required ? "bg-red-500" : "bg-amber-400")} />
                <span className="text-[11px] text-gray-700 flex-1">{f.label}</span>
                <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", f.required ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200")}>{f.required ? "Required" : "Optional"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate Details (Rate Mismatch only) */}
      {exType === "Rate Mismatch" && recommended && (
        <div className="bg-white border-2 border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <TrendingUp size={13} className="text-amber-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-800">Rate Variance</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-gray-400">Spot Rate</p>
              <p className="text-sm font-bold text-red-600">${recommended.rate.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Contract Rate</p>
              <p className="text-sm font-bold text-gray-800">${recommended.contractRate.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Premium</p>
              <p className="text-sm font-bold text-red-600">+{((recommended.rate - recommended.contractRate) / recommended.contractRate * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Carrier Table (with thinking) */}
      {aiThinking ? (
        <AIThinkingSkeleton label="AI evaluating carriers" />
      ) : (
        <div className="space-y-3">
          {/* AI Recommendation header */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Brain size={13} className="text-blue-600" />
              <span className="text-[11px] font-semibold text-blue-800">AI Carrier Recommendation</span>
            </div>
            {recommended && (
              <p className="text-[10px] text-blue-700">
                <span className="font-bold">{recommended.carrier}</span> — {recommended.reason}
              </p>
            )}
          </div>

          {/* Carrier Comparison Table — selectable */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500">Carrier</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">Rate</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">Transit</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500">Capacity</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">SLA</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">OTP%</th>
                </tr>
              </thead>
              <tbody>
                {shipment.carrierOptions.map((c) => {
                  const isDisabled = disabledCarrier !== null && c.carrier === disabledCarrier
                  const isSelected = selectedCarrier === c.carrier
                  return (
                    <tr
                      key={c.carrier}
                      onClick={() => { if (!isDisabled) setSelectedCarrier(c.carrier) }}
                      className={cn(
                        "border-b border-gray-100 transition-colors",
                        isDisabled ? "opacity-40 cursor-not-allowed bg-red-50/30 line-through" : "cursor-pointer hover:bg-blue-50",
                        isSelected && "bg-blue-50 border-l-2 border-l-blue-500 ring-1 ring-blue-200",
                        c.recommended && !isSelected && !isDisabled && "bg-green-50/30 border-l-2 border-l-green-400"
                      )}
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-medium", isDisabled ? "text-gray-400" : "text-gray-800")}>{c.carrier}</span>
                          {c.recommended && <span className="text-[8px] font-bold bg-green-600 text-white px-1 py-0.5 rounded">AI Pick</span>}
                          {isDisabled && <span className="text-[8px] font-bold bg-red-500 text-white px-1 py-0.5 rounded">Rejected</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDisabled ? "text-gray-400" : "text-gray-700"}>${c.rate.toLocaleString()}</span>
                        {!isDisabled && recommended && c.carrier !== recommended.carrier && (
                          c.rate < recommended.rate ? <ArrowDown size={10} className="inline ml-0.5 text-green-500" /> :
                          c.rate > recommended.rate ? <ArrowUp size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className={isDisabled ? "text-gray-400" : "text-gray-700"}>{c.transitDays}d</span>
                        {!isDisabled && recommended && c.carrier !== recommended.carrier && (
                          c.transitDays < recommended.transitDays ? <ArrowDown size={10} className="inline ml-0.5 text-green-500" /> :
                          c.transitDays > recommended.transitDays ? <ArrowUp size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                          isDisabled ? "bg-gray-100 text-gray-400" :
                          c.capacity === "Available" ? "bg-green-100 text-green-700" :
                          c.capacity === "Limited" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>{c.capacity}</span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDisabled ? "text-gray-400" : "text-gray-700"}>{c.sla}%</span>
                        {!isDisabled && recommended && c.carrier !== recommended.carrier && (
                          c.sla > recommended.sla ? <ArrowUp size={10} className="inline ml-0.5 text-green-500" /> :
                          c.sla < recommended.sla ? <ArrowDown size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDisabled ? "text-gray-400" : "text-gray-700"}>{c.lanePerformance}%</span>
                        {!isDisabled && recommended && c.carrier !== recommended.carrier && (
                          c.lanePerformance > recommended.lanePerformance ? <ArrowUp size={10} className="inline ml-0.5 text-green-500" /> :
                          c.lanePerformance < recommended.lanePerformance ? <ArrowDown size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-gray-400 text-center">{selectedCarrier ? `${selectedCarrier} selected — click Approve Reroute to confirm` : "Click a carrier row to select"}</p>

          {/* AI Policy Analysis */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck size={13} className="text-gray-600" />
              <span className="text-[11px] font-semibold text-gray-700">AI Policy Analysis</span>
            </div>
            <div className="space-y-1 text-[10px] text-gray-600">
              {config.policyItems.map((item, i) => <p key={i}>• {item}</p>)}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleApproveWithCarrier(selectedCarrier ?? undefined)}
            disabled={!selectedCarrier && !recommended}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-[11px] font-semibold transition-colors",
              selectedCarrier || recommended ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <CheckCircle size={12} /> {selectedCarrier ? `Approve ${selectedCarrier}` : "Approve Reroute"}
          </button>
          <button
            onClick={() => { if (!retrying && !retried) { setRetrying(true); setTimeout(() => { setRetrying(false); setRetried(true) }, 2200) } }}
            disabled={retrying}
            className={cn("flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors",
              retried ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            {retrying ? <><Loader2 size={11} className="animate-spin" /> Retrying...</> :
             retried ? <><X size={11} /> Retry Failed</> :
             <><RefreshCw size={11} /> {config.retryLabel}</>}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={() => setNotified(true)} className={cn("py-2.5 rounded-lg border text-[10px] font-semibold transition-colors flex flex-col items-center gap-1", notified ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50")}>
            {notified ? <CheckCircle size={12} className="text-blue-600" /> : <Bell size={12} className="text-blue-500" />}
            {notified ? "Notified" : "Notify SCM"}
          </button>
          <button onClick={() => setEscalated(true)} className="py-2.5 rounded-lg bg-white border border-gray-300 text-[10px] font-semibold text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors flex flex-col items-center gap-1">
            <TrendingUp size={12} className="text-red-500" /> Escalate
          </button>
          <button className="py-2.5 rounded-lg bg-white border border-gray-300 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex flex-col items-center gap-1">
            <FileText size={12} className="text-purple-500" /> Policy
          </button>
        </div>
        {retried && <p className="text-[10px] text-center text-red-700 font-medium">{config.retryFailMsg}</p>}
      </div>
    </div>
  )
}

// ─── Connection Exception Panel (Portal Unavailable / Credentials Expired) ───

function ConnectionExceptionPanel({ shipment, onApprove }: { shipment: BookingRequest; onApprove: () => void }) {
  const [aiThinking, setAiThinking] = useState(true)
  const [selectedAction, setSelectedAction] = useState<"retry" | "switch" | "manual" | "notifyIT" | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)
  const [autoRetrySet, setAutoRetrySet] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const [itNotified, setItNotified] = useState(false)
  const [emailDrafted, setEmailDrafted] = useState(false)
  // Portal login animation states
  const [loginPhase, setLoginPhase] = useState<"typing-user" | "typing-pass" | "logging-in" | "success" | null>(null)
  const [typedUser, setTypedUser] = useState("")
  const [typedPass, setTypedPass] = useState("")
  // Stable ticket number (avoids hydration mismatch from Math.random in render)
  const [itTicket] = useState(() => Math.floor(Math.random() * 9000 + 1000))

  useEffect(() => {
    setAiThinking(true)
    const t = setTimeout(() => setAiThinking(false), 1500)
    return () => clearTimeout(t)
  }, [shipment.id])

  const isCreds = shipment.exceptionType === "Credentials Expired"
  const recommended = shipment.carrierOptions.find((c) => c.recommended)

  // Portal login typing animation
  const loginEmail = "a.chen@logistics.co"
  const loginPassword = "••••••••••••"

  useEffect(() => {
    if (loginPhase === "typing-user") {
      let i = 0
      const t = setInterval(() => {
        i++
        setTypedUser(loginEmail.slice(0, i))
        if (i >= loginEmail.length) { clearInterval(t); setTimeout(() => setLoginPhase("typing-pass"), 400) }
      }, 60)
      return () => clearInterval(t)
    }
    if (loginPhase === "typing-pass") {
      let i = 0
      const t = setInterval(() => {
        i++
        setTypedPass(loginPassword.slice(0, i))
        if (i >= loginPassword.length) { clearInterval(t); setTimeout(() => setLoginPhase("logging-in"), 600) }
      }, 80)
      return () => clearInterval(t)
    }
    if (loginPhase === "logging-in") {
      const t = setTimeout(() => setLoginPhase("success"), 2000)
      return () => clearTimeout(t)
    }
    if (loginPhase === "success") {
      const t = setTimeout(() => { setApproved(true); onApprove() }, 1200)
      return () => clearTimeout(t)
    }
  }, [loginPhase, onApprove])

  const handleApproveSwitch = (carrierName?: string) => {
    const selected = carrierName ?? selectedCarrier ?? recommended?.carrier
    if (!selected) return
    setSelectedCarrier(selected)
    // Start portal login animation instead of immediate approval
    setLoginPhase("typing-user")
    setTypedUser("")
    setTypedPass("")
  }

  if (approved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
        <CheckCircle size={14} className="text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-green-700">Carrier Switch Approved — AI Rebooking</p>
          <p className="text-[11px] text-green-600 mt-0.5">
            Agent initiating booking with <span className="font-semibold">{selectedCarrier ?? recommended?.carrier ?? "alternate carrier"}</span>.
            Bypassing {shipment.carrier} portal. Confirmation expected within 2h.
          </p>
        </div>
      </div>
    )
  }

  if (escalated) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <TrendingUp size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">Case Escalated</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Escalation case opened — IT team and supply chain manager notified. SLA clock paused pending portal resolution.
          </p>
        </div>
      </div>
    )
  }

  // ─── Portal Login Animation ─────────────────────────────────────
  if (loginPhase) {
    const carrierName = selectedCarrier ?? recommended?.carrier ?? "Carrier"
    const isLoggingIn = loginPhase === "logging-in"
    const isSuccess = loginPhase === "success"
    return (
      <div className="space-y-3">
        <div className={cn(
          "rounded-lg border-2 overflow-hidden transition-all",
          isSuccess ? "border-green-300 bg-green-50" : "border-blue-200 bg-gradient-to-b from-slate-800 to-slate-900"
        )}>
          {/* Portal header bar */}
          {!isSuccess && (
            <div className="bg-slate-700 px-4 py-2 flex items-center gap-2 border-b border-slate-600">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-slate-600 rounded px-2 py-0.5 text-[9px] text-slate-300 font-mono truncate">
                https://{carrierName.toLowerCase().replace(/[\s-]/g, "")}.com/portal/login
              </div>
            </div>
          )}

          {isSuccess ? (
            <div className="p-5 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Check size={20} className="text-white" />
              </div>
              <p className="text-sm font-bold text-green-700">Login Successful</p>
              <p className="text-[10px] text-green-600">Connected to {carrierName} eBusiness Portal</p>
              <div className="flex items-center gap-1.5 text-[10px] text-green-600 mt-1">
                <Loader2 size={10} className="animate-spin" /> Preparing booking submission...
              </div>
            </div>
          ) : (
            <div className="p-5 flex flex-col items-center">
              {/* Carrier logo area */}
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center mb-3">
                <Anchor size={24} className="text-white" />
              </div>
              <p className="text-sm font-bold text-white mb-0.5">{carrierName}</p>
              <p className="text-[10px] text-slate-400 mb-5">eBusiness Portal — Carrier Booking System</p>

              {/* Login form */}
              <div className="w-full max-w-[260px] space-y-3">
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Email</label>
                  <div className="bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white font-mono min-h-[28px] flex items-center">
                    {typedUser}<span className={cn("w-0.5 h-3.5 bg-blue-400 inline-block ml-0.5", loginPhase === "typing-user" ? "animate-pulse" : "hidden")} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Password</label>
                  <div className="bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white font-mono min-h-[28px] flex items-center">
                    {typedPass}<span className={cn("w-0.5 h-3.5 bg-blue-400 inline-block ml-0.5", loginPhase === "typing-pass" ? "animate-pulse" : "hidden")} />
                  </div>
                </div>

                {/* Login button */}
                <button className={cn(
                  "w-full py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  isLoggingIn ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                )}>
                  {isLoggingIn ? (
                    <><Loader2 size={12} className="animate-spin" /> Authenticating...</>
                  ) : (
                    <><ShieldCheck size={12} /> Sign In</>
                  )}
                </button>
              </div>

              {/* RPA agent label */}
              <div className="mt-4 flex items-center gap-1.5 bg-slate-700/50 rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] text-slate-400">RPA Agent auto-filling credentials</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Diagnostics data
  const diagItems = isCreds
    ? [
        { label: "API Login", status: "401 Unauthorized", time: "04:06" },
        { label: "Token Refresh", status: "Refresh token expired", time: "04:06" },
        { label: "RPA Login", status: "Session cookie expired", time: "04:07" },
      ]
    : [
        { label: "API Attempt 1", status: "Timeout (30s)", time: "08:05" },
        { label: "API Attempt 2", status: "Timeout (30s)", time: "08:06" },
        { label: "API Attempt 3", status: "Timeout (30s)", time: "08:06" },
        { label: "RPA Fallback", status: "Login page unresponsive", time: "08:07" },
      ]

  const aiAnalysis = isCreds
    ? [
        "API credentials expired — last renewed 90 days ago",
        "Automatic token refresh failed — manual renewal required",
        `Booking deadline: ${shipment.targetShipDate} — delay risk if not resolved`,
        `Recommendation: Switch to ${recommended?.carrier ?? "alternate carrier"} or renew credentials immediately`,
      ]
    : [
        `${shipment.carrier} portal shows pattern consistent with maintenance`,
        "Similar outage observed previously — typically resolved within 4 hours",
        `Booking deadline: ${shipment.targetShipDate} — delay risk if portal remains down`,
        `Recommendation: Switch to ${recommended?.carrier ?? "alternate carrier"} (${recommended ? `$${recommended.rate.toLocaleString()}, ${recommended.sla}% SLA` : "available"})`,
      ]

  return (
    <div className="space-y-3">
      {/* Exception Banner */}
      <div className="bg-red-50 border border-red-300 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertOctagon size={14} className="text-red-600 shrink-0" />
          <span className="text-xs font-bold text-red-800">
            {isCreds ? "Credentials Expired — API Access Blocked" : "Portal Unavailable — Connection Failed"}
          </span>
          <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded ml-auto">HIGH</span>
        </div>
        <p className="text-[11px] text-red-700">
          {isCreds
            ? <><span className="font-semibold">{shipment.carrier}</span> API credentials expired. Agent login failed, RPA fallback session also expired.</>
            : <><span className="font-semibold">{shipment.carrier}</span> portal unreachable — API timeout after 3 retries. RPA fallback also failed.</>
          }
        </p>
      </div>

      {/* Connection Diagnostics Card */}
      <div className="bg-white border-2 border-red-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            {isCreds ? <ShieldCheck size={13} className="text-red-600" /> : <Monitor size={13} className="text-red-600" />}
          </div>
          <p className="text-[11px] font-bold text-gray-800">{isCreds ? "Authentication Diagnostics" : "Connection Diagnostics"}</p>
        </div>
        <div className="space-y-2">
          {diagItems.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <X size={11} className="text-red-500 shrink-0" />
              <span className="text-gray-500 w-24 shrink-0">{d.label}</span>
              <span className="text-red-700 font-medium flex-1">{d.status}</span>
              <span className="text-[10px] text-gray-400">{d.time}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1 text-[10px]">
          {isCreds ? (
            <>
              <div className="flex items-center gap-2"><ShieldCheck size={10} className="text-amber-500 shrink-0" /><span className="text-gray-600">Last credential renewal: <span className="font-semibold text-amber-700">90 days ago</span></span></div>
              <div className="flex items-center gap-2"><Monitor size={10} className="text-green-500 shrink-0" /><span className="text-gray-600">Portal status: <span className="font-semibold text-green-700">Accessible</span> (auth blocked)</span></div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2"><Clock size={10} className="text-gray-400 shrink-0" /><span className="text-gray-600">Total elapsed: <span className="font-semibold">2m 15s</span></span></div>
              <div className="flex items-center gap-2"><Monitor size={10} className="text-red-500 shrink-0" /><span className="text-gray-600">Portal status: <span className="font-semibold text-red-700">Unreachable</span></span></div>
            </>
          )}
        </div>
      </div>

      {/* AI Diagnosis (with thinking) */}
      {aiThinking ? (
        <AIThinkingSkeleton label={isCreds ? "AI diagnosing auth failure" : "AI diagnosing connection"} />
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain size={13} className="text-blue-600" />
            <span className="text-[11px] font-semibold text-blue-800">AI Diagnosis</span>
          </div>
          <div className="space-y-1 text-[10px] text-blue-700">
            {aiAnalysis.map((item, i) => <p key={i}>• {item}</p>)}
          </div>
        </div>
      )}

      {/* Recovery Options — 4 interactive cards */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Recovery Options</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Card 1: Retry / Renew */}
          <div
            onClick={() => setSelectedAction(selectedAction === "retry" ? null : "retry")}
            className={cn("border rounded-lg p-2.5 cursor-pointer transition-all",
              selectedAction === "retry" ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200" : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                {isCreds ? <ShieldCheck size={10} className="text-blue-600" /> : <RefreshCw size={10} className="text-blue-600" />}
              </div>
              <span className="text-[10px] font-semibold text-gray-800">{isCreds ? "Renew Credentials" : "Retry Connection"}</span>
            </div>
            <p className="text-[9px] text-gray-500">{isCreds ? "Trigger API key refresh via IT portal" : "Auto-retry portal every 15 min"}</p>
          </div>

          {/* Card 2: Switch Carrier */}
          <div
            onClick={() => setSelectedAction(selectedAction === "switch" ? null : "switch")}
            className={cn("border rounded-lg p-2.5 cursor-pointer transition-all",
              selectedAction === "switch" ? "border-green-300 bg-green-50/50 ring-1 ring-green-200" : "border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <ArrowRight size={10} className="text-green-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-800">Switch Carrier</span>
            </div>
            <p className="text-[9px] text-gray-500">AI recommends {recommended?.carrier ?? "alternate"}</p>
          </div>

          {/* Card 3: Manual Booking */}
          <div
            onClick={() => setSelectedAction(selectedAction === "manual" ? null : "manual")}
            className={cn("border rounded-lg p-2.5 cursor-pointer transition-all",
              selectedAction === "manual" ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200" : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Mail size={10} className="text-indigo-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-800">Manual Booking</span>
            </div>
            <p className="text-[9px] text-gray-500">Email booking request to {shipment.carrier}</p>
          </div>

          {/* Card 4: Notify IT */}
          <div
            onClick={() => setSelectedAction(selectedAction === "notifyIT" ? null : "notifyIT")}
            className={cn("border rounded-lg p-2.5 cursor-pointer transition-all",
              selectedAction === "notifyIT" ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : "border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Bell size={10} className="text-amber-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-800">Notify IT</span>
            </div>
            <p className="text-[9px] text-gray-500">Alert IT about {isCreds ? "expired creds" : "portal outage"}</p>
          </div>
        </div>
      </div>

      {/* Expanded Action Panels */}
      {selectedAction === "retry" && (
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/20 space-y-2">
          <p className="text-[11px] font-semibold text-blue-800">{isCreds ? "Credential Renewal" : "Retry Connection"}</p>
          {retryFailed ? (
            autoRetrySet ? (
              <div className="flex items-center gap-2 text-[10px] text-green-700 font-medium">
                <CheckCircle size={11} /> {isCreds ? "Renewal request sent to IT — estimated 30 min" : "Auto-retry scheduled — next attempt in 15m"}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-red-700">
                  <X size={11} /> {isCreds ? "Credentials still expired — manual renewal needed" : "Connection still failed — portal remains unreachable"}
                </div>
                <button onClick={() => setAutoRetrySet(true)} className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                  {isCreds ? "Request Credential Renewal from IT" : "Set Auto-Retry (every 15min)"}
                </button>
              </div>
            )
          ) : retrying ? (
            <div className="flex items-center gap-2 text-[10px] text-blue-600">
              <Loader2 size={11} className="animate-spin" /> {isCreds ? "Attempting credential refresh..." : "Attempting connection..."}
            </div>
          ) : (
            <button
              onClick={() => { setRetrying(true); setTimeout(() => { setRetrying(false); setRetryFailed(true) }, 2000) }}
              className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              {isCreds ? "Attempt Credential Refresh" : "Retry Connection Now"}
            </button>
          )}
        </div>
      )}

      {selectedAction === "switch" && (
        <div className="border border-green-200 rounded-lg p-3 bg-green-50/10 space-y-3">
          <p className="text-[11px] font-semibold text-green-800">Alternate Carrier Selection</p>
          {/* Carrier Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500">Carrier</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">Rate</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">Transit</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500">Capacity</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">SLA</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">OTP%</th>
                </tr>
              </thead>
              <tbody>
                {shipment.carrierOptions.map((c) => {
                  const isDown = c.carrier === shipment.carrier
                  const isSelected = selectedCarrier === c.carrier
                  return (
                    <tr
                      key={c.carrier}
                      onClick={(e) => { e.stopPropagation(); if (!isDown) { setSelectedCarrier(c.carrier) } }}
                      className={cn(
                        "border-b border-gray-100 transition-colors",
                        isDown ? "opacity-40 cursor-not-allowed bg-red-50/30 line-through" : "cursor-pointer hover:bg-green-50",
                        isSelected && "bg-green-50 border-l-2 border-l-green-500",
                        c.recommended && !isSelected && !isDown && "bg-green-50/30 border-l-2 border-l-green-400"
                      )}
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-medium", isDown ? "text-gray-400" : "text-gray-800")}>{c.carrier}</span>
                          {c.recommended && <span className="text-[8px] font-bold bg-green-600 text-white px-1 py-0.5 rounded">AI Pick</span>}
                          {isDown && <span className="text-[8px] font-bold bg-red-500 text-white px-1 py-0.5 rounded">{isCreds ? "Creds Expired" : "Portal Down"}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDown ? "text-gray-400" : "text-gray-700"}>${c.rate.toLocaleString()}</span>
                        {!isDown && recommended && c.carrier !== recommended.carrier && (
                          c.rate < recommended.rate ? <ArrowDown size={10} className="inline ml-0.5 text-green-500" /> :
                          c.rate > recommended.rate ? <ArrowUp size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className={isDown ? "text-gray-400" : "text-gray-700"}>{c.transitDays}d</span>
                        {!isDown && recommended && c.carrier !== recommended.carrier && (
                          c.transitDays < recommended.transitDays ? <ArrowDown size={10} className="inline ml-0.5 text-green-500" /> :
                          c.transitDays > recommended.transitDays ? <ArrowUp size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                          isDown ? "bg-gray-100 text-gray-400" :
                          c.capacity === "Available" ? "bg-green-100 text-green-700" :
                          c.capacity === "Limited" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>{c.capacity}</span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDown ? "text-gray-400" : "text-gray-700"}>{c.sla}%</span>
                        {!isDown && recommended && c.carrier !== recommended.carrier && (
                          c.sla > recommended.sla ? <ArrowUp size={10} className="inline ml-0.5 text-green-500" /> :
                          c.sla < recommended.sla ? <ArrowDown size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDown ? "text-gray-400" : "text-gray-700"}>{c.lanePerformance}%</span>
                        {!isDown && recommended && c.carrier !== recommended.carrier && (
                          c.lanePerformance > recommended.lanePerformance ? <ArrowUp size={10} className="inline ml-0.5 text-green-500" /> :
                          c.lanePerformance < recommended.lanePerformance ? <ArrowDown size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {selectedCarrier && (
            <button onClick={(e) => { e.stopPropagation(); handleApproveSwitch() }} className="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5">
              <CheckCircle size={12} /> Approve Switch to {selectedCarrier}
            </button>
          )}
          {!selectedCarrier && <p className="text-[9px] text-gray-400 text-center">Click a carrier row to select</p>}
        </div>
      )}

      {selectedAction === "manual" && (
        <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/20 space-y-2">
          <p className="text-[11px] font-semibold text-indigo-800">Manual Booking Request</p>
          <div className="text-[10px] space-y-0.5">
            <p><span className="text-gray-400">To:</span> <span className="font-medium text-gray-700">booking@{shipment.carrier.toLowerCase().replace(/[\s-]/g, "")}.com</span></p>
            <p><span className="text-gray-400">Subject:</span> <span className="font-medium text-gray-700">Manual Booking Request — {shipment.id}</span></p>
          </div>
          <div className="bg-white border border-indigo-100 rounded p-2 text-[10px] text-gray-600 leading-relaxed space-y-1">
            <p>Unable to complete booking via portal — {isCreds ? "API credentials expired" : "portal unreachable"}.</p>
            <p>Shipment: <strong>{shipment.id}</strong> · {shipment.lane} · {shipment.containerType} · Target: {shipment.targetShipDate}</p>
            <p>Please process this booking manually and confirm reference number.</p>
          </div>
          {emailDrafted ? (
            <div className="flex items-center gap-1.5 text-[10px] text-green-700 font-medium">
              <CheckCircle size={11} /> Email sent to {shipment.carrier} booking desk
            </div>
          ) : (
            <button onClick={() => setEmailDrafted(true)} className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5">
              <Send size={11} /> Send Email
            </button>
          )}
        </div>
      )}

      {selectedAction === "notifyIT" && (
        <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/20 space-y-2">
          <p className="text-[11px] font-semibold text-amber-800">IT Alert</p>
          <div className="bg-white border border-amber-100 rounded p-2 text-[10px] text-gray-600 leading-relaxed space-y-1">
            <p><strong>Priority:</strong> High — booking blocked</p>
            <p><strong>Issue:</strong> {isCreds ? `${shipment.carrier} API credentials expired (90+ days)` : `${shipment.carrier} portal unreachable — API timeout`}</p>
            <p><strong>Impact:</strong> Shipment {shipment.id} ({shipment.lane}) cannot proceed</p>
            <p><strong>Action:</strong> {isCreds ? "Renew API credentials and confirm" : "Investigate portal availability and ETA for recovery"}</p>
          </div>
          {itNotified ? (
            <div className="flex items-center gap-1.5 text-[10px] text-green-700 font-medium">
              <CheckCircle size={11} /> IT team notified — Ticket #IT-{itTicket}
            </div>
          ) : (
            <button onClick={() => setItNotified(true)} className="w-full py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-1.5">
              <Bell size={11} /> Send IT Alert
            </button>
          )}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => handleApproveSwitch()}
          disabled={!selectedCarrier && !recommended}
          className={cn(
            "py-2.5 rounded-lg text-[10px] font-semibold transition-colors flex flex-col items-center gap-1",
            selectedCarrier || recommended ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <CheckCircle size={12} /> {selectedCarrier ? `Switch to ${selectedCarrier}` : "Approve Switch"}
        </button>
        <button onClick={() => setEscalated(true)} className="py-2.5 rounded-lg bg-white border border-gray-300 text-[10px] font-semibold text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors flex flex-col items-center gap-1">
          <TrendingUp size={12} className="text-red-500" /> Escalate
        </button>
        <button className="py-2.5 rounded-lg bg-white border border-gray-300 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex flex-col items-center gap-1">
          <FileText size={12} className="text-purple-500" /> View Logs
        </button>
      </div>
    </div>
  )
}
