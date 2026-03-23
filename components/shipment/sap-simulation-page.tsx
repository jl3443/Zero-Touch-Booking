"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { BOOKING_REQUESTS, DEMO_SHIPMENT, type BookingRequest } from "@/lib/mock-data"
import { Database, Search, RefreshCw, ChevronRight, X, Anchor, MapPin, Clock, FileText, CheckCircle, AlertTriangle, Ship, Truck as TruckIcon } from "lucide-react"

interface SapSimulationPageProps {
  highlightOrderId?: string
  autoOpenOrderId?: string
  onOrderClick?: (shipment: BookingRequest) => void
  /** When true, show the demo order (BKG-NEW-001) with "Just Updated" status */
  demoUpdated?: boolean
}

// Combine existing bookings with demo shipment for the SAP view
const SAP_ORDERS = [DEMO_SHIPMENT, ...BOOKING_REQUESTS.slice(0, 7)]

export function SapSimulationPage({ highlightOrderId, autoOpenOrderId, onOrderClick, demoUpdated }: SapSimulationPageProps) {
  const [selectedOrder, setSelectedOrder] = useState<BookingRequest | null>(null)

  useEffect(() => {
    if (autoOpenOrderId) {
      const order = SAP_ORDERS.find((o) => o.id === autoOpenOrderId || o.sapOrderRef === autoOpenOrderId)
      if (order) setSelectedOrder(order)
    }
  }, [autoOpenOrderId])

  const handleRowClick = (order: BookingRequest) => {
    setSelectedOrder(order)
    onOrderClick?.(order)
  }

  return (
    <div className="flex-1 overflow-hidden bg-[#F5F6FA] flex">
    {/* Main table area */}
    <div className={cn("overflow-y-auto", selectedOrder ? "w-[55%]" : "flex-1")}>
      {/* SAP-style header */}
      <div className="bg-[#354A5F] text-white px-5 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
          <Database size={16} className="text-white" />
        </div>
        <div>
          <div className="text-[14px] font-semibold">SAP Transportation Management</div>
          <div className="text-[10px] text-white/60">Shipment Requirements · Live Connection</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-white/50 font-mono">SYS: PRD-TM-01</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-white/70">Connected</span>
        </div>
      </div>

      {/* SAP toolbar */}
      <div className="bg-white border-b border-gray-200 px-5 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1 text-[11px] text-gray-500">
          <span>Transportation Management</span>
          <ChevronRight size={10} />
          <span>Freight Orders</span>
          <ChevronRight size={10} />
          <span className="text-gray-800 font-medium">Shipment Requirements</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-7 pr-3 py-1 text-[11px] border border-gray-300 rounded bg-gray-50 w-48 focus:outline-none focus:border-blue-400"
              readOnly
            />
          </div>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Status summary */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Open Requirements", value: "8", color: "bg-blue-500" },
            { label: "In Execution", value: "4", color: "bg-indigo-500" },
            { label: "Completed", value: "12", color: "bg-emerald-500" },
            { label: "Exceptions", value: "3", color: "bg-amber-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", s.color)} />
                <span className="text-[18px] font-bold text-gray-800">{s.value}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* SAP-style data table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-700">Freight Orders — Shipment Requirements</span>
            <span className="text-[10px] text-gray-400">{SAP_ORDERS.length} entries</span>
          </div>

          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#F0F2F5] text-gray-500 uppercase text-[10px] tracking-wider">
                <th className="text-left px-3 py-2 font-semibold">Order Ref</th>
                <th className="text-left px-3 py-2 font-semibold">Plant</th>
                <th className="text-left px-3 py-2 font-semibold">Origin</th>
                <th className="text-left px-3 py-2 font-semibold">Destination</th>
                <th className="text-left px-3 py-2 font-semibold">Mode</th>
                <th className="text-left px-3 py-2 font-semibold">Container</th>
                <th className="text-left px-3 py-2 font-semibold">Target Date</th>
                <th className="text-center px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {SAP_ORDERS.map((order) => {
                const isHighlighted = order.sapOrderRef === highlightOrderId || order.id === highlightOrderId
                const isSelected = selectedOrder?.id === order.id
                const isDemoOrder = order.id === "BKG-NEW-001"
                const displayStatus = isDemoOrder && demoUpdated ? "Confirmed" : order.bookingStatus
                return (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order)}
                    className={cn(
                      "border-t border-gray-100 cursor-pointer transition-colors",
                      isSelected
                        ? "bg-blue-50 border-l-2 border-l-blue-500"
                        : isHighlighted
                        ? "bg-blue-50/50 hover:bg-blue-100"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <td className="px-3 py-2.5 font-mono font-semibold text-blue-700">{order.sapOrderRef}</td>
                    <td className="px-3 py-2.5 text-gray-600">{order.plant}</td>
                    <td className="px-3 py-2.5 text-gray-800">{order.origin.split(" ")[0]}</td>
                    <td className="px-3 py-2.5 text-gray-800">{order.destination.split(" ")[0]}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                        order.mode === "Ocean" ? "bg-blue-100 text-blue-700" :
                        order.mode === "Air" ? "bg-sky-100 text-sky-700" :
                        "bg-amber-100 text-amber-700"
                      )}>{order.mode}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{order.containerType}</td>
                    <td className="px-3 py-2.5 text-gray-600">{order.targetShipDate}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                          displayStatus === "Pending" ? "bg-blue-100 text-blue-700" :
                          displayStatus === "Confirmed" || displayStatus === "Notified" ? "bg-emerald-100 text-emerald-700" :
                          displayStatus === "Exception" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-600"
                        )}>{displayStatus}</span>
                        {isDemoOrder && demoUpdated && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold animate-pulse">Just Updated</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Order detail panel */}
    {selectedOrder && (
      <SapOrderDetail
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        demoUpdated={demoUpdated && selectedOrder.id === "BKG-NEW-001"}
      />
    )}
    </div>
  )
}

// ─── SAP Order Detail Panel ──────────────────────────────────────────────────
function SapOrderDetail({ order, onClose, demoUpdated }: { order: BookingRequest; onClose: () => void; demoUpdated?: boolean }) {
  const displayStatus = demoUpdated ? "Confirmed" : order.bookingStatus
  const ModeIconComp = order.mode === "Ocean" ? Ship : order.mode === "Air" ? FileText : TruckIcon

  return (
    <div className="w-[45%] border-l border-gray-200 bg-white overflow-y-auto">
      {/* Detail header */}
      <div className="bg-[#354A5F] text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
            <FileText size={14} className="text-white" />
          </div>
          <div>
            <div className="text-[13px] font-semibold">{order.sapOrderRef}</div>
            <div className="text-[10px] text-white/60">Freight Order Detail</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
          <X size={14} className="text-white/70" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Status bar */}
        <div className={cn(
          "rounded-lg px-4 py-2.5 flex items-center justify-between",
          displayStatus === "Confirmed" ? "bg-emerald-50 border border-emerald-200" :
          displayStatus === "Exception" ? "bg-red-50 border border-red-200" :
          "bg-blue-50 border border-blue-200"
        )}>
          <div className="flex items-center gap-2">
            {displayStatus === "Confirmed" ? <CheckCircle size={14} className="text-emerald-600" /> :
             displayStatus === "Exception" ? <AlertTriangle size={14} className="text-red-600" /> :
             <Clock size={14} className="text-blue-600" />}
            <span className={cn("text-[12px] font-bold",
              displayStatus === "Confirmed" ? "text-emerald-700" :
              displayStatus === "Exception" ? "text-red-700" :
              "text-blue-700"
            )}>{displayStatus}</span>
          </div>
          {demoUpdated && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold animate-pulse">Just Updated</span>
          )}
        </div>

        {/* Order details grid */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Order Information</div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6">
            {[
              ["Booking ID", order.id],
              ["SAP Order", order.sapOrderRef],
              ["Carrier", order.carrier],
              ["Booking Ref", order.bookingRef || "—"],
              ["Mode", order.mode],
              ["Container", order.containerType],
              ["Target Date", order.targetShipDate],
              ["Confirmed Date", order.confirmedShipDate || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[10px] text-gray-400">{label}</div>
                <div className="text-[12px] font-medium text-gray-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Route */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Route</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <div className="text-[10px] text-gray-400 mb-0.5">Origin</div>
              <div className="text-[12px] font-semibold text-gray-800">{order.origin}</div>
              <div className="text-[10px] text-gray-400">{order.plant}</div>
            </div>
            <div className="flex items-center gap-1 text-gray-300">
              <div className="w-8 h-[1px] bg-gray-300" />
              <ModeIconComp size={14} className="text-gray-400" />
              <div className="w-8 h-[1px] bg-gray-300" />
            </div>
            <div className="flex-1 text-center">
              <div className="text-[10px] text-gray-400 mb-0.5">Destination</div>
              <div className="text-[12px] font-semibold text-gray-800">{order.destination}</div>
            </div>
          </div>
        </div>

        {/* Vessel / Tracking */}
        {order.bookingRef && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Booking & Tracking</div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
              {[
                ["Booking Ref", order.bookingRef],
                ["Tracking Ref", order.trackingRef],
                ["Vessel", order.vesselSchedule || "—"],
                ["ETA Confidence", `${order.etaConfidence}%`],
                ["Planned ETA", order.plannedETA],
                ["Revised ETA", order.revisedETA],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] text-gray-400">{label}</div>
                  <div className="text-[12px] font-medium text-gray-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo-specific: show booking confirmation details */}
        {demoUpdated && (
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-emerald-600" />
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Booking Confirmed</div>
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6">
              {[
                ["Booking Ref", "MAEU-2024-SHA-78432"],
                ["Carrier", "Maersk Line"],
                ["Vessel", "AE-1234 (Ever Given)"],
                ["Sailing", "Mar 22, 2024"],
                ["Port of Loading", "Shanghai (CNSHA)"],
                ["Port of Discharge", "Los Angeles (USLAX)"],
                ["ETA", "Apr 05, 2024"],
                ["CRO Number", "CRO-MAEU-78432"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] text-gray-400">{label}</div>
                  <div className="text-[12px] font-medium text-gray-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Activity Log</div>
          <div className="space-y-2">
            {order.timeline.slice(0, 6).map((evt, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-gray-700">{evt.event}</div>
                  <div className="text-[10px] text-gray-400">{evt.timestamp} · {evt.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
