"use client"

import { useState } from "react"
import { SHIPMENTS, type ExceptionType, type Severity, type TransportMode, type Shipment } from "@/lib/mock-data"
import { SeverityBadge, ModeBadge, ExceptionBadge, DelayDisplay, ReasonChips, SourceBadge } from "./shared"
import { ChevronDown, ChevronUp, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

type SortField = "id" | "delay" | "severity" | "lastSignal"

interface ShipmentTableProps {
  searchQuery: string
  activeFilter: string | null
  onSelectShipment: (shipment: Shipment) => void
  selectedId: string | null
}

const MODE_OPTIONS: TransportMode[] = ["Ocean", "Road", "Air"]
const SEVERITY_OPTIONS: Severity[] = ["Critical", "High", "Medium", "Low"]
const EXCEPTION_OPTIONS: ExceptionType[] = [
  "Delay", "Missing Signal", "Long Dwell", "Route Deviation",
  "Weather Disruption", "Traffic Disruption", "Customs Hold", "Conflicting Sources",
]

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

export function ShipmentTable({ searchQuery, activeFilter, onSelectShipment, selectedId }: ShipmentTableProps) {
  const [modeFilter, setModeFilter] = useState<TransportMode | "All">("All")
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All")
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionType | "All">("All")
  const [sortField, setSortField] = useState<SortField>("severity")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const filtered = SHIPMENTS.filter((s) => {
    if (modeFilter !== "All" && s.mode !== modeFilter) return false
    if (severityFilter !== "All" && s.severity !== severityFilter) return false
    if (exceptionFilter !== "All" && s.exceptionType !== exceptionFilter) return false
    if (activeFilter === "critical" && s.severity !== "Critical") return false
    if (activeFilter === "missing-signal" && s.exceptionType !== "Missing Signal") return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !s.id.toLowerCase().includes(q) &&
        !s.carrier.toLowerCase().includes(q) &&
        !s.destination.toLowerCase().includes(q) &&
        !s.trackingRef.toLowerCase().includes(q)
      ) return false
    }
    return true
  }).sort((a, b) => {
    let cmp = 0
    if (sortField === "severity") cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    else if (sortField === "delay") cmp = a.delayHours - b.delayHours
    else if (sortField === "id") cmp = a.id.localeCompare(b.id)
    return sortDir === "asc" ? cmp : -cmp
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={11} className="text-gray-300" />
    return sortDir === "asc" ? <ChevronUp size={11} className="text-blue-600" /> : <ChevronDown size={11} className="text-blue-600" />
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex-wrap">
        <Filter size={13} className="text-gray-400 shrink-0" />

        <FilterGroup label="Mode" options={["All", ...MODE_OPTIONS]} value={modeFilter} onChange={setModeFilter} />
        <div className="w-px h-4 bg-gray-300" />
        <FilterGroup label="Severity" options={["All", ...SEVERITY_OPTIONS]} value={severityFilter} onChange={setSeverityFilter} />
        <div className="w-px h-4 bg-gray-300" />
        <FilterGroup label="Exception" options={["All", ...EXCEPTION_OPTIONS]} value={exceptionFilter} onChange={setExceptionFilter} />

        <span className="ml-auto text-xs text-gray-400">{filtered.length} shipment{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <Th onClick={() => handleSort("id")} sortIcon={<SortIcon field="id" />}>Shipment ID</Th>
              <Th>Mode</Th>
              <Th>Carrier</Th>
              <Th>Origin → Destination</Th>
              <Th>Current Status</Th>
              <Th>Planned ETA</Th>
              <Th>Revised ETA</Th>
              <Th onClick={() => handleSort("delay")} sortIcon={<SortIcon field="delay" />}>Delay</Th>
              <Th>Exception Type</Th>
              <Th onClick={() => handleSort("severity")} sortIcon={<SortIcon field="severity" />}>Severity</Th>
              <Th>Last Signal</Th>
              <Th>Recommended Action</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-10 text-gray-400">No shipments match the current filters.</td>
              </tr>
            )}
            {filtered.map((s, i) => (
              <tr
                key={s.id}
                onClick={() => onSelectShipment(s)}
                className={cn(
                  "border-b border-gray-100 cursor-pointer transition-colors",
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                  selectedId === s.id ? "bg-blue-50 border-blue-200" : "hover:bg-blue-50/40",
                  s.severity === "Critical" && selectedId !== s.id ? "border-l-2 border-l-red-500" : ""
                )}
              >
                <td className="px-3 py-2.5">
                  <span className="font-mono font-semibold text-blue-700">{s.id}</span>
                </td>
                <td className="px-3 py-2.5"><ModeBadge mode={s.mode} /></td>
                <td className="px-3 py-2.5 text-gray-700 font-medium">{s.carrier}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 text-gray-600 whitespace-nowrap">
                    <span className="truncate max-w-[110px]" title={s.origin}>{s.origin.split(",")[0]}</span>
                    <span className="text-gray-400">→</span>
                    <span className="truncate max-w-[110px]" title={s.destination}>{s.destination.split(",")[0]}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 max-w-[160px]">
                  <span className="text-gray-600 truncate block" title={s.currentStatus}>{s.currentStatus}</span>
                </td>
                <td className="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap">{s.plannedETA.replace("2025 ", "")}</td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                  <span className={cn(s.delayHours > 0 ? "text-red-600 font-semibold" : "text-gray-600")}>
                    {s.revisedETA.replace("2025 ", "")}
                  </span>
                </td>
                <td className="px-3 py-2.5"><DelayDisplay hours={s.delayHours} /></td>
                <td className="px-3 py-2.5"><ExceptionBadge type={s.exceptionType} /></td>
                <td className="px-3 py-2.5"><SeverityBadge severity={s.severity} /></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <SourceBadge source={s.lastSignalSource} />
                    <span className="text-gray-500">{s.lastSignal}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-blue-700 font-medium hover:underline">{s.recommendedAction}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, onClick, sortIcon }: { children: React.ReactNode; onClick?: () => void; sortIcon?: React.ReactNode }) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap",
        onClick ? "cursor-pointer hover:text-gray-700 select-none" : ""
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortIcon}
      </span>
    </th>
  )
}

function FilterGroup<T extends string>({
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
            value === o ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-200"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
