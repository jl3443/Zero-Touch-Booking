"use client"

import { useState, useEffect } from "react"
import { SHIPMENTS, type Shipment } from "@/lib/mock-data"
import { SeverityBadge, ModeBadge, ExceptionBadge } from "./shared"
import { ShipmentDrawer } from "./shipment-drawer"
import { cn } from "@/lib/utils"
import { ScanSearch, ArrowRight, Clock, AlertTriangle, CheckCircle2 } from "lucide-react"

interface TrackingSearchPageProps {
  preselectedId?: string
}

export function TrackingSearchPage({ preselectedId }: TrackingSearchPageProps) {
  const [query, setQuery] = useState("")
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)

  // Auto-open drawer when navigated from email flow
  useEffect(() => {
    if (preselectedId) {
      const s = SHIPMENTS.find((sh) => sh.id === preselectedId)
      if (s) setSelectedShipment(s)
    }
  }, [preselectedId])

  const filtered = SHIPMENTS.filter((s) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      s.id.toLowerCase().includes(q) ||
      s.carrier.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.exceptionType.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1100px] mx-auto space-y-6">

        {/* Header + Search */}
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
              <ScanSearch size={20} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Track Shipment</h2>
              <p className="text-xs text-gray-400">Search by ID, carrier, origin, or destination</p>
            </div>
          </div>

          <div className="relative">
            <ScanSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Shipment ID (e.g. SHP-10421), carrier, or destination..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
            <span>Quick select:</span>
            {SHIPMENTS.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => setQuery(s.id)}
                className="font-mono text-blue-600 hover:underline"
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {query ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"` : `All Active Shipments — ${SHIPMENTS.length} total`}
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <ScanSearch size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No shipments match "<span className="font-mono">{query}</span>"</p>
              <p className="text-xs text-gray-400 mt-1">Try SHP-10421, SHP-20334, SHP-40672...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filtered.map((s) => (
                <ShipmentCard
                  key={s.id}
                  shipment={s}
                  onClick={() => setSelectedShipment(s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedShipment && (
        <ShipmentDrawer
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
        />
      )}
    </div>
  )
}

function ShipmentCard({ shipment: s, onClick }: { shipment: Shipment; onClick: () => void }) {
  const isCritical = s.severity === "Critical"
  const hasDelay = s.delayHours > 0

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border text-left p-4 hover:shadow-md hover:border-blue-300 transition-all group",
        isCritical ? "border-red-200 border-l-4 border-l-red-500" :
        s.severity === "High" ? "border-amber-200 border-l-4 border-l-amber-400" :
        "border-gray-200"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-blue-700 text-sm">{s.id}</span>
          <ModeBadge mode={s.mode} />
          <SeverityBadge severity={s.severity} />
        </div>
        <ArrowRight size={15} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium mb-1">
        <span className="truncate">{s.origin.split(",")[0]}</span>
        <ArrowRight size={12} className="text-gray-400 shrink-0" />
        <span className="truncate">{s.destination.split(",")[0]}</span>
      </div>
      <div className="text-[11px] text-gray-400 mb-3">{s.carrier} · {s.mode}</div>

      {/* Status */}
      <div className="text-xs text-gray-600 mb-3 line-clamp-1">{s.currentStatus}</div>

      {/* Footer row */}
      <div className="flex items-center gap-2 flex-wrap">
        <ExceptionBadge type={s.exceptionType} />
        {hasDelay ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
            <Clock size={11} /> +{s.delayHours}h delay
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
            <CheckCircle2 size={11} /> On schedule
          </span>
        )}
        {s.severity === "Critical" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5 ml-auto">
            <AlertTriangle size={10} /> Action required
          </span>
        )}
      </div>

      {/* ETA row */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-[11px] text-gray-400">
        <span>Planned: <span className="font-mono text-gray-500">{s.plannedETA.replace("2025 ", "")}</span></span>
        {hasDelay && (
          <>
            <span>→</span>
            <span>Revised: <span className="font-mono text-red-600 font-semibold">{s.revisedETA.replace("2025 ", "")}</span></span>
          </>
        )}
        <span className="ml-auto">ETA confidence: <span className="font-semibold text-gray-600">{s.etaConfidence}%</span></span>
      </div>
    </button>
  )
}
