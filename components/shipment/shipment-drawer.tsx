"use client"

import { useState } from "react"
import { type Shipment } from "@/lib/mock-data"
import {
  SeverityBadge, ModeBadge, ExceptionBadge, ReasonChips,
  ConfidenceBar, SourceBadge, OTMStatusBadge,
} from "./shared"
import { cn } from "@/lib/utils"
import {
  X, Brain, CheckCircle, Send, AlertOctagon, RotateCcw, PauseCircle,
  ArrowRight, ChevronRight, Check, Loader2,
} from "lucide-react"
import { ModeIcon } from "./shared"

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
}

export function ShipmentDrawer({ shipment, onClose }: ShipmentDrawerProps) {
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

  if (!shipment) return null

  const handleAction = (key: keyof ActionState) => {
    setActions((prev) => ({ ...prev, [key]: true }))
  }

  const handleOTMSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setActions((prev) => ({ ...prev, otmSynced: true, etaApproved: true }))
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

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "overview" && (
            <OverviewTab shipment={shipment} actions={actions} onAction={handleAction} />
          )}
          {activeTab === "signals" && (
            <SignalsTab shipment={shipment} />
          )}
          {activeTab === "otm" && (
            <OTMTab
              shipment={shipment}
              actions={actions}
              syncing={syncing}
              onOTMSync={handleOTMSync}
              onAction={handleAction}
              onShowEmail={() => setShowEmailModal(true)}
            />
          )}
        </div>
      </aside>

      {/* Email Modal */}
      {showEmailModal && (
        <EmailModal
          shipment={shipment}
          onClose={() => setShowEmailModal(false)}
          onSend={() => {
            handleAction("emailSent")
            setShowEmailModal(false)
          }}
        />
      )}
    </>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ shipment, actions, onAction }: { shipment: Shipment; actions: ActionState; onAction: (k: keyof ActionState) => void }) {
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

      {/* Timeline */}
      <div>
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Tracking Timeline</h4>
        <div className="space-y-0">
          {shipment.timeline.map((event, i) => {
            const isLast = i === shipment.timeline.length - 1
            const iconMap = {
              ok: <div className="w-5 h-5 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /></div>,
              warning: <div className="w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /></div>,
              critical: <div className="w-5 h-5 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-red-600" /></div>,
              info: <div className="w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /></div>,
              agent: <div className="w-5 h-5 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center"><Brain size={9} className="text-white" /></div>,
            }
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {iconMap[event.status]}
                  {!isLast && <div className="w-px flex-1 bg-gray-200 my-0.5" />}
                </div>
                <div className={cn("pb-3 flex-1 min-w-0", isLast ? "" : "")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-xs font-medium", event.status === "agent" ? "text-slate-700" : "text-gray-800")}>
                        {event.event}
                      </span>
                      {event.anomaly && (
                        <p className={cn("text-[10px] mt-0.5", event.status === "critical" ? "text-red-600" : "text-amber-700")}>
                          {event.anomaly}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-400">{event.location}</span>
                      </div>
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
          <Brain size={14} className="text-blue-600" />
          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Agent Assessment</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">{shipment.agentSummary}</p>
      </div>

      {/* Action Buttons */}
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
            onClick={() => onAction("notified")}
          />
          <ActionButton
            label={actions.escalated ? "Escalated" : "Escalate"}
            variant="secondary"
            done={actions.escalated}
            icon={<AlertOctagon size={12} />}
            onClick={() => onAction("escalated")}
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
      </div>
    </div>
  )
}

// ─── Signals Tab ───────────────────────────────────────────────────────────────
function SignalsTab({ shipment }: { shipment: Shipment }) {
  const hasConflict = shipment.sources.some(s => s.aligned === false)
  const staleSources = shipment.sources.filter(s => !s.fresh)

  return (
    <div className="p-5 space-y-4">
      {/* Key insight */}
      <div className={cn(
        "rounded-lg border p-3",
        hasConflict ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
      )}>
        <p className="text-xs font-medium text-gray-700">
          {hasConflict
            ? `Sources are partially misaligned. ${staleSources.length > 0 ? `${staleSources.length} source(s) stale.` : ""} Manual review may be needed.`
            : "All sources are aligned and fresh. High confidence in current status."}
        </p>
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
              {shipment.sources.map((src, i) => (
                <tr key={src.source} className={cn("border-b border-gray-100", i % 2 === 0 ? "bg-white" : "bg-gray-50/40")}>
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
                    {src.aligned === null && <span className="text-gray-400">N/A</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflict callout */}
      {hasConflict && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">Source Conflict Detected</div>
          <p className="text-xs text-red-800">
            One or more sources are reporting conflicting status for this shipment.
            Review the discrepancies above and verify directly with the carrier before updating OTM.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── OTM Tab ───────────────────────────────────────────────────────────────────
function OTMTab({ shipment, actions, syncing, onOTMSync, onAction, onShowEmail }: {
  shipment: Shipment
  actions: ActionState
  syncing: boolean
  onOTMSync: () => void
  onAction: (k: keyof ActionState) => void
  onShowEmail: () => void
}) {
  const otmStatus = actions.otmSynced ? "Synced" : shipment.otmStatus

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

      {/* Notification Routing Logic */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Notification Routing Logic</h4>
        <div className="space-y-1.5">
          {[
            { label: "Medium", desc: "Notify Router only", active: shipment.severity === "Medium" },
            { label: "High", desc: "Notify Router + Coordinator", active: shipment.severity === "High" },
            { label: "Critical", desc: "Notify Router + Coordinator + Plant Team + Escalation", active: shipment.severity === "Critical" },
            { label: "Critical Material Override", desc: "Always notify Plant Team regardless of severity", active: !!shipment.criticalMaterial },
          ].map((row) => (
            <div key={row.label} className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs",
              row.active ? "bg-blue-50 border border-blue-200" : "text-gray-500"
            )}>
              <span className={cn("font-semibold w-36 shrink-0", row.active ? "text-blue-700" : "text-gray-600")}>{row.label}</span>
              <span className={row.active ? "text-blue-700" : "text-gray-400"}>{row.desc}</span>
              {row.active && <span className="ml-auto text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">Active</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Email Modal ───────────────────────────────────────────────────────────────
function EmailModal({ shipment, onClose, onSend }: { shipment: Shipment; onClose: () => void; onSend: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Email Preview</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-3 text-xs">
          <EmailField label="To" value={getNotificationRecipients(shipment.severity)} />
          <EmailField label="CC" value="logistics-ops@company.com" />
          <EmailField label="Subject" value={`Delay Alert — Shipment ${shipment.id} — Revised ETA +${shipment.delayHours}h`} />
          <div className="rounded-md border border-gray-200 p-3 bg-gray-50 space-y-2 text-gray-700 leading-relaxed">
            <p className="font-semibold text-gray-800">Automated Shipment Delay Notification</p>
            <p>Dear Team,</p>
            <p>
              This is an automated alert from the Shipment Tracking Agent. Shipment <strong>{shipment.id}</strong> is experiencing 
              a delay and the ETA has been revised.
            </p>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-gray-200"><td className="py-1 text-gray-500 w-32">Shipment ID</td><td className="py-1 font-mono font-semibold">{shipment.id}</td></tr>
                <tr className="border-b border-gray-200"><td className="py-1 text-gray-500">Carrier</td><td className="py-1">{shipment.carrier} · {shipment.trackingRef}</td></tr>
                <tr className="border-b border-gray-200"><td className="py-1 text-gray-500">Route</td><td className="py-1">{shipment.origin} → {shipment.destination}</td></tr>
                <tr className="border-b border-gray-200"><td className="py-1 text-gray-500">Planned ETA</td><td className="py-1 font-mono">{shipment.plannedETA}</td></tr>
                <tr className="border-b border-gray-200"><td className="py-1 text-gray-500">Revised ETA</td><td className="py-1 font-mono text-red-600 font-semibold">{shipment.revisedETA}</td></tr>
                <tr><td className="py-1 text-gray-500">Reason</td><td className="py-1">{shipment.reasonChips.map(c => c.label).join(", ")}</td></tr>
              </tbody>
            </table>
            <p className="text-gray-600">
              <strong>Business Impact:</strong> {shipment.businessImpact}
            </p>
            <p className="text-gray-400 text-[10px]">This notification was generated automatically by the Shipment Tracking Agent. Please do not reply to this email.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-1.5 rounded text-xs border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={onSend}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            <Send size={11} /> Confirm & Send
          </button>
        </div>
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

function EmailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-gray-400 w-12 shrink-0 font-medium">{label}:</span>
      <span className="text-gray-700">{value}</span>
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
