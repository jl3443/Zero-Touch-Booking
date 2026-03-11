"use client"

import { useState } from "react"
import { SHIPMENTS, type Severity, type ExceptionType, type TransportMode, type Shipment } from "@/lib/mock-data"
import { SeverityBadge, ModeBadge, ExceptionBadge, ReasonChips, DelayDisplay } from "./shared"
import { cn } from "@/lib/utils"
import { CheckCircle, Send, GitBranch, RefreshCw, AlertOctagon, ArrowUpDown, Filter } from "lucide-react"

type SortBy = "severity" | "delay" | "cutoff"

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

interface WorkbenchCardActions {
  acknowledged: boolean
  notified: boolean
  otmUpdated: boolean
  escalated: boolean
}

type AllActions = Record<string, WorkbenchCardActions>

export function ExceptionWorkbench() {
  const [modeFilter, setModeFilter] = useState<TransportMode | "All">("All")
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All")
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionType | "All">("All")
  const [sortBy, setSortBy] = useState<SortBy>("severity")
  const [actions, setActions] = useState<AllActions>({})

  const getActions = (id: string): WorkbenchCardActions =>
    actions[id] ?? { acknowledged: false, notified: false, otmUpdated: false, escalated: false }

  const updateAction = (id: string, key: keyof WorkbenchCardActions) => {
    setActions((prev) => ({
      ...prev,
      [id]: { ...getActions(id), [key]: true },
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
          options={["All", "Delay", "Missing Signal", "Weather Disruption", "Traffic Disruption", "Customs Hold", "Conflicting Sources"]}
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
              {s === "cutoff" ? "Cutoff Risk" : s.charAt(0).toUpperCase() + s.slice(1)}
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
                  onAcknowledge={() => updateAction(s.id, "acknowledged")}
                  onNotify={() => updateAction(s.id, "notified")}
                  onOTMUpdate={() => updateAction(s.id, "otmUpdated")}
                  onEscalate={() => updateAction(s.id, "escalated")}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface ExceptionCardProps {
  shipment: Shipment
  actions: WorkbenchCardActions
  onAcknowledge: () => void
  onNotify: () => void
  onOTMUpdate: () => void
  onEscalate: () => void
}

function ExceptionCard({ shipment: s, actions, onAcknowledge, onNotify, onOTMUpdate, onEscalate }: ExceptionCardProps) {
  const allDone = actions.acknowledged && actions.notified && actions.otmUpdated

  return (
    <div className={cn(
      "bg-white rounded-lg border p-4 transition-all",
      s.severity === "Critical" ? "border-l-4 border-l-red-500 border-r border-t border-b border-gray-200" :
        s.severity === "High" ? "border-l-4 border-l-amber-400 border-r border-t border-b border-gray-200" :
          "border border-gray-200",
      allDone ? "opacity-60" : ""
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <SeverityBadge severity={s.severity} />
            <ModeBadge mode={s.mode} />
            <span className="font-mono font-bold text-blue-700 text-sm">{s.id}</span>
            <ExceptionBadge type={s.exceptionType} />
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

          <div className="flex items-center gap-2 flex-wrap">
            <ReasonChips chips={s.reasonChips} />
            {s.cutoffTime && (
              <span className="text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                Cutoff: {s.cutoffTime.replace("2025 ", "")}
              </span>
            )}
            {s.criticalMaterial && (
              <span className="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5 uppercase tracking-wide">
                Critical Material
              </span>
            )}
          </div>
        </div>

        {/* Right: impact + impacted team */}
        <div className="shrink-0 text-right space-y-1 min-w-[140px]">
          <div className="text-[10px] text-gray-400">Impacted</div>
          <div className="text-xs font-medium text-gray-700 max-w-[150px] text-right">{s.plant}</div>
          {s.cutoffTime && (
            <div className="text-[10px] text-red-600 font-semibold">Cutoff Risk</div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mt-3 pt-3 flex items-center gap-2 flex-wrap">
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
          onClick={onNotify}
          variant="primary"
        />
        <WorkbenchAction
          label="Review Route"
          icon={<GitBranch size={11} />}
          onClick={() => {}}
          variant="secondary"
        />
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
  variant: "primary" | "secondary" | "danger"
}) {
  const styles = {
    primary: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-blue-600 text-white hover:bg-blue-700 border-transparent",
    secondary: done
      ? "bg-green-50 text-green-700 border-green-200"
      : "border-gray-300 text-gray-600 hover:bg-gray-50",
    danger: done
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "border-red-200 text-red-600 hover:bg-red-50",
  }
  return (
    <button
      onClick={onClick}
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
