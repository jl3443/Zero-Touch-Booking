"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import type { Shipment } from "@/lib/mock-data"
import { ChevronDown, ChevronUp } from "lucide-react"

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] flex items-center justify-center bg-gray-50 text-xs text-gray-400">
      Loading map...
    </div>
  ),
})

interface MiniMapProps {
  onShipmentClick?: (s: Shipment) => void
}

export function MiniMap({ onShipmentClick }: MiniMapProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col" style={{ isolation: "isolate" }}>
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider shrink-0 whitespace-nowrap">
          Origin Map
        </h3>
        <div className="flex items-center gap-3 ml-3">
          <div className="flex items-center gap-2.5 text-[9px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 inline-block" />
              <span>Exc</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 inline-block" />
              <span>Appr</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 inline-block" />
              <span>Active</span>
            </span>
          </div>
          {collapsed ? (
            <ChevronDown size={12} className="text-gray-400 shrink-0" />
          ) : (
            <ChevronUp size={12} className="text-gray-400 shrink-0" />
          )}
        </div>
      </div>

      {!collapsed && (
        <div style={{ height: 242 }}>
          <LeafletMap onShipmentClick={onShipmentClick} />
        </div>
      )}
    </div>
  )
}
