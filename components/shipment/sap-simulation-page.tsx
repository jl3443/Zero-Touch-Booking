"use client"

import { cn } from "@/lib/utils"
import { BOOKING_REQUESTS, DEMO_SHIPMENT, type BookingRequest } from "@/lib/mock-data"
import { Database, Search, RefreshCw, ChevronRight } from "lucide-react"

interface SapSimulationPageProps {
  highlightOrderId?: string
  onOrderClick?: (shipment: BookingRequest) => void
}

// Combine existing bookings with demo shipment for the SAP view
const SAP_ORDERS = [DEMO_SHIPMENT, ...BOOKING_REQUESTS.slice(0, 7)]

export function SapSimulationPage({ highlightOrderId, onOrderClick }: SapSimulationPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F6FA]">
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
                return (
                  <tr
                    key={order.id}
                    onClick={() => onOrderClick?.(order)}
                    className={cn(
                      "border-t border-gray-100 cursor-pointer transition-colors",
                      isHighlighted
                        ? "bg-blue-50 border-l-2 border-l-blue-500 hover:bg-blue-100"
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
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                        order.bookingStatus === "Pending" ? "bg-blue-100 text-blue-700" :
                        order.bookingStatus === "Confirmed" || order.bookingStatus === "Notified" ? "bg-emerald-100 text-emerald-700" :
                        order.bookingStatus === "Exception" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      )}>{order.bookingStatus}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
