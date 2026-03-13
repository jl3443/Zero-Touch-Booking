"use client"

import { useState } from "react"
import { SHIPMENTS, type Shipment } from "@/lib/mock-data"
import { BookingStatusBadge, CarrierBadge, SeverityBadge, ModeBadge, ExceptionBadge } from "./shared"
import { ShipmentDrawer } from "./shipment-drawer"
import { type SentEmailItem } from "./email-sent-page"
import { Package, AlertTriangle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchResultsPageProps {
  query: string
  onOpenWeather?: (id: string) => void
  onSendNotification?: (email: SentEmailItem) => void
}

export function SearchResultsPage({ query, onOpenWeather, onSendNotification }: SearchResultsPageProps) {
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)

  const q = query.toLowerCase()
  const results = SHIPMENTS.filter(
    (s) =>
      s.id.toLowerCase().includes(q) ||
      s.carrier.toLowerCase().includes(q) ||
      s.lane.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q) ||
      s.bookingStatus.toLowerCase().includes(q) ||
      s.exceptionType.toLowerCase().includes(q) ||
      s.sapOrderRef.toLowerCase().includes(q) ||
      s.plant.toLowerCase().includes(q) ||
      s.severity.toLowerCase().includes(q)
  )

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-5 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            {results.length === 0
              ? `No bookings matching "${query}"`
              : `${results.length} booking${results.length !== 1 ? "s" : ""} matching `}
            {results.length > 0 && <span className="font-semibold text-gray-700">&quot;{query}&quot;</span>}
          </p>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedShipment(s)}
                className={cn(
                  "text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all",
                  selectedShipment?.id === s.id && "border-blue-400 ring-1 ring-blue-200"
                )}
              >
                {/* Top row: ID + severity */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-sm">{s.id}</span>
                    <ModeBadge mode={s.mode} />
                  </div>
                  <SeverityBadge severity={s.severity} />
                </div>

                {/* Carrier */}
                <div className="flex items-center gap-2 mb-1">
                  <CarrierBadge carrier={s.carrier} />
                </div>

                {/* Lane / Route */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
                  <span>{s.origin}</span>
                  <ArrowRight size={10} className="text-gray-400 shrink-0" />
                  <span>{s.destination}</span>
                </div>

                {/* Lane code */}
                <p className="text-[11px] text-gray-400 mb-2 font-mono">{s.lane} \u00b7 {s.containerType}</p>

                {/* Booking status */}
                <div className="flex items-center gap-2 mb-2">
                  <BookingStatusBadge status={s.bookingStatus} />
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {s.exceptionType !== "None" && (
                    <ExceptionBadge type={s.exceptionType} />
                  )}
                  {s.severity === "Critical" && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600">
                      <AlertTriangle size={9} /> Action needed
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package size={36} className="text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No bookings found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try searching by booking ID, carrier, lane, SAP ref, or status
            </p>
          </div>
        )}
      </div>

      {selectedShipment && (
        <ShipmentDrawer
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onOpenWeather={onOpenWeather}
          onSendNotification={onSendNotification}
        />
      )}
    </div>
  )
}
