"use client"

import { useState } from "react"
import { SHIPMENTS, REROUTE_OPTIONS, type Severity, type ExceptionType, type TransportMode, type Shipment, type RerouteOption } from "@/lib/mock-data"
import { SeverityBadge, ModeBadge, ExceptionBadge, ReasonChips, DelayDisplay } from "./shared"
import { cn } from "@/lib/utils"
import {
  CheckCircle, Send, GitBranch, RefreshCw, AlertOctagon, ArrowUpDown, Filter, X,
  Radio, PhoneCall, MapPin, TrendingUp, ChevronRight, Zap,
} from "lucide-react"
import type { SentEmailItem } from "./email-sent-page"
import { ShipmentDrawer } from "./shipment-drawer"

type SortBy = "severity" | "delay" | "cutoff"

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

interface WorkbenchCardActions {
  acknowledged: boolean
  notified: boolean
  otmUpdated: boolean
  escalated: boolean
  carrierQueried: boolean
  etaConfirmed: boolean
  rerouteApproved: string | null
}

type AllActions = Record<string, WorkbenchCardActions>

const DEFAULT_ACTIONS: WorkbenchCardActions = {
  acknowledged: false,
  notified: false,
  otmUpdated: false,
  escalated: false,
  carrierQueried: false,
  etaConfirmed: false,
  rerouteApproved: null,
}

// Destination recipient lookup
const NOTIFY_RECIPIENTS: Record<string, { name: string; email: string }> = {
  "SHP-40672": { name: "Detroit Plant Operations", email: "detroit-ops@globalparts.com" },
  "SHP-70991": { name: "LAX Receiving Dock B", email: "lax-receiving@pharmalogistics.com" },
  "SHP-10421": { name: "LAX Distribution Center", email: "lax-dist@autoparts-west.com" },
  "SHP-20334": { name: "Chicago Warehouse", email: "chicago-ops@techimports.com" },
  "SHP-30188": { name: "Rotterdam DC", email: "rtm-dc@nordicsupply.eu" },
  "SHP-50219": { name: "Houston Plant", email: "houston-plant@chemcorp.com" },
  "SHP-60441": { name: "Chicago Assembly", email: "chicago-assembly@midwest-auto.com" },
}

// Carrier ops contact lookup
const CARRIER_OPS: Record<string, { name: string; email: string }> = {
  "SHP-40672": { name: "FedEx International Operations", email: "cargo-ops@fedex.com" },
  "SHP-70991": { name: "Emirates SkyCargo Operations", email: "cargo@emirates.com" },
  "SHP-10421": { name: "COSCO Shipping Operations", email: "ops@cosco.com" },
  "SHP-20334": { name: "Kuehne+Nagel Customs Team", email: "customs@kn.com" },
  "SHP-30188": { name: "Maersk Vessel Operations", email: "vessel-ops@maersk.com" },
  "SHP-50219": { name: "DHL Express Operations", email: "ops@dhl.com" },
  "SHP-60441": { name: "Midwest Express Freight", email: "dispatch@midwest-express.com" },
}

// Escalation contacts
const ESCALATION_RECIPIENTS: Record<string, { name: string; email: string }> = {
  "SHP-40672": { name: "VP Operations", email: "vp-ops@company.com" },
  "SHP-70991": { name: "VP Operations", email: "vp-ops@company.com" },
  "SHP-10421": { name: "VP Operations", email: "vp-ops@company.com" },
  "SHP-20334": { name: "VP Operations", email: "vp-ops@company.com" },
  "SHP-30188": { name: "VP Operations", email: "vp-ops@company.com" },
  "SHP-50219": { name: "VP Operations", email: "vp-ops@company.com" },
  "SHP-60441": { name: "VP Operations", email: "vp-ops@company.com" },
}

// AIS recovery data
const AIS_RECOVERY: Record<string, { lat: string; lng: string; speed: string; heading: string; recoveredAt: string; etaDeltaHours: number }> = {
  "SHP-30188": {
    lat: "14.2°N",
    lng: "62.8°E",
    speed: "11.4 kn",
    heading: "322°",
    recoveredAt: "Mar 11, 23:15",
    etaDeltaHours: 12,
  },
}

function getRecipient(shipmentId: string) {
  return NOTIFY_RECIPIENTS[shipmentId] ?? { name: "Operations Team", email: "ops@company.com" }
}

function buildNotifyBody(s: Shipment, recipientName: string): string {
  return `Dear ${recipientName} Team,

We are writing to inform you of a delay affecting your incoming shipment.

Shipment ID:    ${s.id}
Carrier:        ${s.carrier}
Route:          ${s.origin.split(",")[0]} → ${s.destination.split(",")[0]}
Tracking:       ${s.trackingRef}
Original ETA:   ${s.plannedETA}
Revised ETA:    ${s.revisedETA} (+${s.delayHours}h)
Exception:      ${s.exceptionType}

Reason: ${s.exceptionTrigger}

Recommended Action: ${s.recommendedAction}

We are actively monitoring this shipment and will provide further updates as they become available. Please plan accordingly and reach out if you have questions.

Best regards,
Export Coordination Team`
}

function buildCarrierInquiryBody(s: Shipment): string {
  return `Dear ${CARRIER_OPS[s.id]?.name ?? s.carrier} Team,

We are following up on shipment ${s.trackingRef} which has exceeded our dwell threshold at your facility.

Shipment:     ${s.id}
Tracking:     ${s.trackingRef}
Route:        ${s.origin.split(",")[0]} → ${s.destination.split(",")[0]}
Exception:    ${s.exceptionType} — ${s.delayHours}h delay
Dwell Since:  ${s.plannedETA}

Could you please provide:
1. Current cargo status and location
2. Estimated outbound booking or departure window
3. Any holds, documentation issues, or capacity constraints

Our consignee has a time-sensitive delivery requirement. Please respond within 4 hours.

Best regards,
Export Coordination Team`
}

function buildEscalationBody(s: Shipment): string {
  return `Dear VP Operations,

We are escalating shipment ${s.id} due to ${s.severity.toLowerCase()} severity impact on operations.

Shipment:       ${s.id}
Carrier:        ${s.carrier}
Route:          ${s.origin.split(",")[0]} → ${s.destination.split(",")[0]}
Exception:      ${s.exceptionType}
Delay:          +${s.delayHours}h
Revised ETA:    ${s.revisedETA}
${s.criticalMaterial ? "\n⚠️  CRITICAL MATERIAL — Production line dependency confirmed\n" : ""}
Trigger: ${s.exceptionTrigger}

Recommended Next Steps: ${s.recommendedAction}

Immediate escalation is required to${s.criticalMaterial ? " prevent production stoppage and" : ""} minimize further exposure. Please advise on carrier escalation authority and any contingency approvals needed.

Export Coordination Team`
}

function buildRerouteApprovalBody(s: Shipment, option: RerouteOption): string {
  return `Dear ${CARRIER_OPS[s.id]?.name ?? s.carrier} Team,

Following our review of reroute options for shipment ${s.trackingRef}, we are approving the following revised routing:

Shipment:         ${s.id}
Tracking:         ${s.trackingRef}
Approved Route:   ${option.label} — ${option.via}
ETA Delta:        +${option.etaDeltaHours}h vs. original
Additional Cost:  $${option.additionalCostUSD.toLocaleString()}
Confidence:       ${option.confidence}%

Please proceed with rebooking and issue revised documentation. Confirm acceptance of this routing change and provide updated AWB/tracking reference.

Our operations team has been notified of the revised ETA. Please revert with confirmation at your earliest convenience.

Best regards,
Export Coordination Team`
}

function getTimestamp(): string {
  const now = new Date()
  const m = now.toLocaleDateString("en", { month: "short", day: "numeric" })
  const t = now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${m}, ${t}`
}

interface ExceptionWorkbenchProps {
  onSendNotification?: (email: SentEmailItem) => void
  onOpenWeather?: (shipmentId: string) => void
}

export function ExceptionWorkbench({ onSendNotification, onOpenWeather }: ExceptionWorkbenchProps) {
  const [modeFilter, setModeFilter] = useState<TransportMode | "All">("All")
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All")
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionType | "All">("All")
  const [sortBy, setSortBy] = useState<SortBy>("severity")
  const [actions, setActions] = useState<AllActions>({})

  // Modal state
  const [composeShipment, setComposeShipment] = useState<Shipment | null>(null)
  const [composeType, setComposeType] = useState<"destination" | "carrier" | "escalation">("destination")
  const [routeShipment, setRouteShipment] = useState<Shipment | null>(null)
  const [escalateShipment, setEscalateShipment] = useState<Shipment | null>(null)
  const [drawerShipment, setDrawerShipment] = useState<Shipment | null>(null)

  const getActions = (id: string): WorkbenchCardActions =>
    actions[id] ?? { ...DEFAULT_ACTIONS }

  const updateAction = (id: string, patch: Partial<WorkbenchCardActions>) => {
    setActions((prev) => ({
      ...prev,
      [id]: { ...getActions(id), ...patch },
    }))
  }

  const filtered = SHIPMENTS
    .filter((s) => {
      if (modeFilter !== "All" && s.mode !== modeFilter) return false
      if (severityFilter !== "All" && s.severity !== severityFilter) return false
      if (exceptionFilter !== "All" && s.exceptionType !== exceptionFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "severity") return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      if (sortBy === "delay") return b.delayHours - a.delayHours
      if (sortBy === "cutoff") {
        const aHas = a.cutoffTime ? 0 : 1
        const bHas = b.cutoffTime ? 0 : 1
        return aHas - bHas
      }
      return 0
    })

  const openNotify = (s: Shipment) => {
    setComposeType("destination")
    setComposeShipment(s)
  }

  const openCarrierInquiry = (s: Shipment) => {
    setComposeType("carrier")
    setComposeShipment(s)
  }

  const openEscalate = (s: Shipment) => {
    setEscalateShipment(s)
  }

  const handleSendNotify = (body: string) => {
    if (!composeShipment) return
    const isCarrier = composeType === "carrier"
    const recipient = isCarrier
      ? (CARRIER_OPS[composeShipment.id] ?? { name: composeShipment.carrier, email: "ops@carrier.com" })
      : getRecipient(composeShipment.id)
    const email: SentEmailItem = {
      id: `SE-DYN-${composeShipment.id}-${Date.now()}`,
      to: recipient.email,
      toName: recipient.name,
      subject: isCarrier
        ? `Long Dwell Inquiry — ${composeShipment.id} — Status Update Request`
        : `Delay Alert — ${composeShipment.id} — +${composeShipment.delayHours}h ${composeShipment.exceptionType}`,
      body,
      timestamp: getTimestamp(),
      shipmentId: composeShipment.id,
      tag: isCarrier ? "delay" : "delay",
    }
    onSendNotification?.(email)
    updateAction(composeShipment.id, isCarrier ? { carrierQueried: true } : { notified: true })
    setComposeShipment(null)
  }

  const handleSendEscalation = (body: string) => {
    if (!escalateShipment) return
    const recipient = ESCALATION_RECIPIENTS[escalateShipment.id] ?? { name: "VP Operations", email: "vp-ops@company.com" }
    const email: SentEmailItem = {
      id: `SE-ESC-${escalateShipment.id}-${Date.now()}`,
      to: recipient.email,
      toName: recipient.name,
      subject: `Escalation — ${escalateShipment.id} — ${escalateShipment.severity} ${escalateShipment.exceptionType}`,
      body,
      timestamp: getTimestamp(),
      shipmentId: escalateShipment.id,
      tag: "escalation",
    }
    onSendNotification?.(email)
    updateAction(escalateShipment.id, { escalated: true })
    setEscalateShipment(null)
  }

  const handleApproveReroute = (shipment: Shipment, option: RerouteOption) => {
    const carrier = CARRIER_OPS[shipment.id] ?? { name: shipment.carrier, email: "ops@carrier.com" }
    const email: SentEmailItem = {
      id: `SE-REROUTE-${shipment.id}-${Date.now()}`,
      to: carrier.email,
      toName: carrier.name,
      subject: `Reroute Approved — ${shipment.id} — ${option.label}`,
      body: buildRerouteApprovalBody(shipment, option),
      timestamp: getTimestamp(),
      shipmentId: shipment.id,
      tag: "route",
    }
    onSendNotification?.(email)
    updateAction(shipment.id, { rerouteApproved: option.id })
    setRouteShipment(null)
  }

  const handleConfirmETA = (s: Shipment) => {
    const ais = AIS_RECOVERY[s.id]
    if (!ais) return
    const recipient = getRecipient(s.id)
    const email: SentEmailItem = {
      id: `SE-ETA-${s.id}-${Date.now()}`,
      to: recipient.email,
      toName: recipient.name,
      subject: `ETA Update Confirmed — ${s.id} — Signal Recovered`,
      body: `Dear ${recipient.name} Team,

AIS tracking signal has been recovered for shipment ${s.id}.

Vessel Position:   ${ais.lat}, ${ais.lng}
Speed:             ${ais.speed}
Heading:           ${ais.heading}
Signal Recovered:  ${ais.recoveredAt}

Revised ETA:       ${s.revisedETA} (+${ais.etaDeltaHours}h adjustment)
Confidence:        58%

Destination teams have been updated. Please adjust receiving schedules accordingly.

Export Coordination Team`,
      timestamp: getTimestamp(),
      shipmentId: s.id,
      tag: "delay",
    }
    onSendNotification?.(email)
    updateAction(s.id, { etaConfirmed: true })
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Filter + sort bar */}
      <div className="shrink-0 px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-4 flex-wrap">
        <Filter size={13} className="text-gray-400" />
        <FilterPills label="Mode" options={["All", "Ocean", "Road", "Air"]} value={modeFilter} onChange={setModeFilter} />
        <div className="w-px h-4 bg-gray-200" />
        <FilterPills label="Severity" options={["All", "Critical", "High", "Medium", "Low"]} value={severityFilter} onChange={setSeverityFilter} />
        <div className="w-px h-4 bg-gray-200" />
        <FilterPills
          label="Exception"
          options={["All", "Schedule Slippage", "Missing Signal", "Long Dwell", "Weather Disruption", "Traffic Disruption", "Customs Hold", "Conflicting Sources"]}
          value={exceptionFilter}
          onChange={setExceptionFilter}
        />
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown size={12} className="text-gray-400" />
          <span className="text-[11px] text-gray-500 font-medium">Sort by:</span>
          {(["severity", "delay", "cutoff"] as SortBy[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-colors capitalize",
                sortBy === s ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              {s === "cutoff" ? "Likely Delay Order" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{filtered.length} exception{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Exception cards */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            No exceptions match the current filters.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s) => {
              const acts = getActions(s.id)
              return (
                <ExceptionCard
                  key={s.id}
                  shipment={s}
                  actions={acts}
                  onAcknowledge={() => updateAction(s.id, { acknowledged: true })}
                  onNotifyClick={() => openNotify(s)}
                  onCarrierInquiry={() => openCarrierInquiry(s)}
                  onOTMUpdate={() => updateAction(s.id, { otmUpdated: true })}
                  onEscalate={() => openEscalate(s)}
                  onReviewRoute={() => setRouteShipment(s)}
                  onConfirmETA={() => handleConfirmETA(s)}
                  onViewDetail={() => setDrawerShipment(s)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Destination Notify / Carrier Inquiry Compose Modal */}
      {composeShipment && (
        <NotifyComposeModal
          shipment={composeShipment}
          composeType={composeType}
          onClose={() => setComposeShipment(null)}
          onSend={handleSendNotify}
        />
      )}

      {/* Escalation Modal */}
      {escalateShipment && (
        <EscalateModal
          shipment={escalateShipment}
          onClose={() => setEscalateShipment(null)}
          onSend={handleSendEscalation}
        />
      )}

      {/* Route Comparison Modal */}
      {routeShipment && (
        <RouteComparisonModal
          shipment={routeShipment}
          approvedId={getActions(routeShipment.id).rerouteApproved}
          onClose={() => setRouteShipment(null)}
          onApprove={(option) => handleApproveReroute(routeShipment, option)}
        />
      )}

      {/* Shipment Detail Drawer */}
      <ShipmentDrawer
        shipment={drawerShipment}
        onClose={() => setDrawerShipment(null)}
        onOpenWeather={onOpenWeather}
      />
    </div>
  )
}

// ── Notify / Carrier Inquiry Compose Modal ─────────────────────────────────────

function NotifyComposeModal({ shipment: s, composeType, onClose, onSend }: {
  shipment: Shipment
  composeType: "destination" | "carrier" | "escalation"
  onClose: () => void
  onSend: (body: string) => void
}) {
  const isCarrier = composeType === "carrier"
  const recipient = isCarrier
    ? (CARRIER_OPS[s.id] ?? { name: s.carrier, email: "ops@carrier.com" })
    : getRecipient(s.id)
  const subject = isCarrier
    ? `Long Dwell Inquiry — ${s.id} — Status Update Request`
    : `Delay Alert — ${s.id} — +${s.delayHours}h ${s.exceptionType}`
  const defaultBody = isCarrier ? buildCarrierInquiryBody(s) : buildNotifyBody(s, recipient.name)
  const [body, setBody] = useState(defaultBody)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isCarrier ? <PhoneCall size={15} className="text-amber-600" /> : <Send size={15} className="text-blue-600" />}
            <span className="text-sm font-semibold text-gray-800">
              {isCarrier ? "Query Carrier" : "Notify Team"}
            </span>
            <span className="text-[11px] text-gray-400 ml-1">— {s.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">To</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs font-medium text-gray-700">{recipient.name}</span>
              <span className="text-[11px] text-gray-400">&lt;{recipient.email}&gt;</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Subject</label>
            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-700">{subject}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
            <span className="text-[10px] font-mono font-bold text-blue-700">{s.id}</span>
            <span className="text-[10px] text-blue-600">
              {s.carrier} · {s.origin.split(",")[0]} → {s.destination.split(",")[0]}
            </span>
            <span className="ml-auto text-[10px] font-bold text-red-600">+{s.delayHours}h</span>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={13}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 font-sans leading-relaxed resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSend(body)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
              isCarrier ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            <Send size={11} />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Escalate Modal ─────────────────────────────────────────────────────────────

function EscalateModal({ shipment: s, onClose, onSend }: {
  shipment: Shipment
  onClose: () => void
  onSend: (body: string) => void
}) {
  const [body, setBody] = useState(buildEscalationBody(s))
  const recipient = ESCALATION_RECIPIENTS[s.id] ?? { name: "VP Operations", email: "vp-ops@company.com" }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50/40">
          <div className="flex items-center gap-2">
            <AlertOctagon size={15} className="text-red-600" />
            <span className="text-sm font-semibold text-red-800">Escalate Shipment</span>
            <span className="text-[11px] text-red-400 ml-1">— {s.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
            <AlertOctagon size={12} className="text-red-600 shrink-0" />
            <span className="text-[11px] text-red-700 font-medium">
              Escalation will notify VP Operations and be logged in the Sent folder
            </span>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">To</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs font-medium text-gray-700">{recipient.name}</span>
              <span className="text-[11px] text-gray-400">&lt;{recipient.email}&gt;</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Subject</label>
            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-700">Escalation — {s.id} — {s.severity} {s.exceptionType}</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={13}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 font-sans leading-relaxed resize-none focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSend(body)}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 transition-colors"
          >
            <AlertOctagon size={11} />
            Escalate
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Route Comparison Modal ─────────────────────────────────────────────────────

function RouteComparisonModal({ shipment, approvedId, onClose, onApprove }: {
  shipment: Shipment
  approvedId: string | null
  onClose: () => void
  onApprove: (option: RerouteOption) => void
}) {
  const options = REROUTE_OPTIONS[shipment.id]
  const [selected, setSelected] = useState<string | null>(approvedId)

  if (!options) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-800">Route Options</span>
            <button onClick={onClose}><X size={16} className="text-gray-400" /></button>
          </div>
          <p className="text-sm text-gray-500">No reroute options available for this shipment.</p>
        </div>
      </div>
    )
  }

  const selectedOption = options.find((o) => o.id === selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <GitBranch size={15} className="text-blue-600" />
            <span className="text-sm font-semibold text-gray-800">AI Route Comparison</span>
            <span className="text-[11px] text-gray-400 ml-1">— {shipment.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Context bar */}
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-[11px] text-amber-800">
          <Zap size={11} className="text-amber-500 shrink-0" />
          <span>
            <strong>{shipment.exceptionType}</strong> — {shipment.exceptionTrigger}
          </span>
        </div>

        {/* Route options */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {options.map((opt) => {
            const isSelected = selected === opt.id
            const isApproved = approvedId === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => !approvedId && setSelected(isSelected ? null : opt.id)}
                disabled={!!approvedId}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all",
                  isApproved
                    ? "border-green-400 bg-green-50"
                    : isSelected
                    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-200 bg-gray-50/40 hover:border-blue-300 hover:bg-blue-50/20"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-bold",
                        isApproved ? "text-green-700" : isSelected ? "text-blue-700" : "text-gray-700"
                      )}>
                        {opt.label}
                      </span>
                      {opt.recommended && !isApproved && (
                        <span className="text-[9px] font-bold bg-blue-600 text-white rounded-full px-1.5 py-0.5">
                          AI Recommended
                        </span>
                      )}
                      {isApproved && (
                        <span className="text-[9px] font-bold bg-green-600 text-white rounded-full px-1.5 py-0.5 flex items-center gap-1">
                          <CheckCircle size={8} /> Approved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
                      <MapPin size={10} className="shrink-0" />
                      <span className="font-mono">{opt.via}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{opt.note}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className={cn(
                      "text-xs font-bold",
                      opt.etaDeltaHours <= 6 ? "text-green-700" : opt.etaDeltaHours <= 10 ? "text-amber-700" : "text-red-700"
                    )}>
                      +{opt.etaDeltaHours}h delay
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {opt.additionalCostUSD > 0 ? `+$${opt.additionalCostUSD.toLocaleString()}` : "No added cost"}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
                      <TrendingUp size={9} />
                      {opt.confidence}% conf.
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <div className="text-[11px] text-gray-400">
            {approvedId
              ? "Route approved — confirmation email sent to carrier"
              : selected
              ? `Selected: ${options.find((o) => o.id === selected)?.label ?? ""}`
              : "Select a route to approve"}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
              {approvedId ? "Close" : "Cancel"}
            </button>
            {!approvedId && selectedOption && (
              <button
                onClick={() => onApprove(selectedOption)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle size={11} />
                Approve Route
                <ChevronRight size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Exception Card ─────────────────────────────────────────────────────────────

interface ExceptionCardProps {
  shipment: Shipment
  actions: WorkbenchCardActions
  onAcknowledge: () => void
  onNotifyClick: () => void
  onCarrierInquiry: () => void
  onOTMUpdate: () => void
  onEscalate: () => void
  onReviewRoute: () => void
  onConfirmETA: () => void
  onViewDetail: () => void
}

function ExceptionCard({
  shipment: s,
  actions,
  onAcknowledge,
  onNotifyClick,
  onCarrierInquiry,
  onOTMUpdate,
  onEscalate,
  onReviewRoute,
  onConfirmETA,
  onViewDetail,
}: ExceptionCardProps) {
  const allDone = actions.acknowledged && actions.notified && actions.otmUpdated
  const aisData = AIS_RECOVERY[s.id]
  const hasRouteOptions = !!REROUTE_OPTIONS[s.id]
  const isWeatherOrTraffic = s.exceptionType === "Weather Disruption" || s.exceptionType === "Traffic Disruption"
  const isMissingSignal = s.exceptionType === "Missing Signal"
  const isLongDwell = s.exceptionType === "Long Dwell"

  return (
    <div
      onClick={onViewDetail}
      className={cn(
        "bg-white rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md hover:border-blue-300 group",
        s.severity === "Critical" ? "border-l-4 border-l-red-500 border-r border-t border-b border-gray-200" :
          s.severity === "High" ? "border-l-4 border-l-amber-400 border-r border-t border-b border-gray-200" :
            "border border-gray-200",
        allDone ? "opacity-60" : ""
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <SeverityBadge severity={s.severity} />
            <ModeBadge mode={s.mode} />
            <span className="font-mono font-bold text-blue-700 text-sm group-hover:underline">{s.id}</span>
            <ExceptionBadge type={s.exceptionType} />

            {/* AIS Recovery badge */}
            {isMissingSignal && aisData && !actions.etaConfirmed && (
              <span className="flex items-center gap-1 text-[9px] font-semibold bg-green-50 border border-green-300 text-green-700 rounded-full px-2 py-0.5">
                <Radio size={9} className="text-green-600" />
                AIS Recovered — {aisData.lat}, {aisData.lng}
              </span>
            )}
            {isMissingSignal && actions.etaConfirmed && (
              <span className="flex items-center gap-1 text-[9px] font-semibold bg-green-100 border border-green-400 text-green-800 rounded-full px-2 py-0.5">
                <CheckCircle size={9} />
                ETA Confirmed
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2">
            <InfoItem label="Carrier" value={s.carrier} />
            <InfoItem label="Tracking" value={s.trackingRef} mono />
            <InfoItem label="Route" value={`${s.origin.split(",")[0]} → ${s.destination.split(",")[0]}`} />
            <InfoItem label="Plant / Destination" value={s.plant} />
          </div>

          <div className="flex items-center gap-4 mb-2">
            <div className="text-[10px] text-gray-400">
              Old ETA: <span className="font-mono text-gray-600">{s.plannedETA.replace("2025 ", "")}</span>
            </div>
            <div className="text-gray-300">→</div>
            <div className="text-[10px] text-gray-400">
              New ETA: <span className={cn("font-mono font-semibold", s.delayHours > 0 ? "text-red-600" : "text-gray-600")}>
                {s.revisedETA.replace("2025 ", "")}
              </span>
            </div>
            <DelayDisplay hours={s.delayHours} />
          </div>

          <p className="text-xs text-gray-600 mb-2">{s.exceptionTrigger}</p>

          {/* Approved reroute callout */}
          {actions.rerouteApproved && (
            <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[10px] text-green-700">
              <CheckCircle size={10} />
              <span>Reroute approved — {REROUTE_OPTIONS[s.id]?.find((o) => o.id === actions.rerouteApproved)?.label} · Carrier notification sent</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <ReasonChips chips={s.reasonChips} />
            {s.cutoffTime && (
              <span className="text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                Deadline: {s.cutoffTime.replace("2025 ", "")}
              </span>
            )}
            {s.criticalMaterial && (
              <span className="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5 uppercase tracking-wide">
                Critical Material
              </span>
            )}
          </div>
        </div>

        {/* Right: impact */}
        <div className="shrink-0 text-right space-y-1 min-w-[140px]">
          <div className="text-[10px] text-gray-400">Impacted</div>
          <div className="text-xs font-medium text-gray-700 max-w-[150px] text-right">{s.plant}</div>
          {s.cutoffTime && (
            <div className="text-[10px] text-amber-600 font-semibold">Likely Delay</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 mt-3 pt-3 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <WorkbenchAction
          label={actions.acknowledged ? "Acknowledged" : "Acknowledge"}
          done={actions.acknowledged}
          icon={<CheckCircle size={11} />}
          onClick={onAcknowledge}
          variant="secondary"
        />
        <WorkbenchAction
          label={actions.notified ? "Team Notified" : "Notify Team"}
          done={actions.notified}
          icon={<Send size={11} />}
          onClick={onNotifyClick}
          variant="primary"
        />

        {/* Missing Signal: Confirm ETA */}
        {isMissingSignal && aisData && (
          <WorkbenchAction
            label={actions.etaConfirmed ? "ETA Confirmed" : `Confirm ETA (+${aisData.etaDeltaHours}h)`}
            done={actions.etaConfirmed}
            icon={<Radio size={11} />}
            onClick={onConfirmETA}
            variant="success"
          />
        )}

        {/* Long Dwell: Query Carrier */}
        {isLongDwell && (
          <WorkbenchAction
            label={actions.carrierQueried ? "Carrier Queried" : "Query Carrier"}
            done={actions.carrierQueried}
            icon={<PhoneCall size={11} />}
            onClick={onCarrierInquiry}
            variant="warning"
          />
        )}

        {/* Weather / Traffic / Route: Review Route */}
        {(isWeatherOrTraffic || s.exceptionType === "Schedule Slippage") && hasRouteOptions && (
          <WorkbenchAction
            label={actions.rerouteApproved ? "Route Approved" : "Review Route"}
            done={!!actions.rerouteApproved}
            icon={<GitBranch size={11} />}
            onClick={onReviewRoute}
            variant={actions.rerouteApproved ? "secondary" : "route"}
          />
        )}

        <WorkbenchAction
          label={actions.otmUpdated ? "OTM Updated" : "Approve OTM Update"}
          done={actions.otmUpdated}
          icon={<RefreshCw size={11} />}
          onClick={onOTMUpdate}
          variant="secondary"
        />
        <WorkbenchAction
          label={actions.escalated ? "Escalated" : "Escalate"}
          done={actions.escalated}
          icon={<AlertOctagon size={11} />}
          onClick={onEscalate}
          variant="danger"
        />
        {allDone && (
          <span className="ml-auto text-[10px] text-green-600 font-semibold flex items-center gap-1">
            <CheckCircle size={11} /> All actions complete
          </span>
        )}
      </div>
    </div>
  )
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-gray-400">{label}:</span>
      <span className={cn("text-gray-700", mono ? "font-mono" : "font-medium")}>{value}</span>
    </div>
  )
}

function WorkbenchAction({ label, done, icon, onClick, variant }: {
  label: string
  done?: boolean
  icon: React.ReactNode
  onClick: () => void
  variant: "primary" | "secondary" | "danger" | "warning" | "success" | "route"
}) {
  const styles: Record<string, string> = {
    primary: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-blue-600 text-white hover:bg-blue-700 border-transparent",
    secondary: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "border-gray-300 text-gray-600 hover:bg-gray-50",
    danger: done
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "border-red-200 text-red-600 hover:bg-red-50",
    warning: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "border-amber-300 text-amber-700 hover:bg-amber-50",
    success: done
      ? "bg-green-100 text-green-800 border-green-300"
      : "border-green-400 text-green-700 bg-green-50 hover:bg-green-100",
    route: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "border-indigo-300 text-indigo-700 hover:bg-indigo-50",
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={done}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors",
        styles[variant]
      )}
    >
      {done ? <CheckCircle size={11} /> : icon}
      {label}
    </button>
  )
}

function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mr-0.5">{label}:</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
            value === o ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
