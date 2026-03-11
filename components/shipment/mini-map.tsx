"use client"

import { useState } from "react"
import { SHIPMENTS } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"

// Simple Mercator projection for SVG dot placement
function project(lat: number, lng: number): { x: number; y: number } {
  const mapW = 800
  const mapH = 400
  const x = ((lng + 180) / 360) * mapW
  const latRad = (lat * Math.PI) / 180
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
  const y = mapH / 2 - (mapW * mercN) / (2 * Math.PI)
  return { x, y }
}

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "#DC2626",
  High: "#F59E0B",
  Medium: "#FBBF24",
  Low: "#22C55E",
}

export function MiniMap({ onShipmentClick }: { onShipmentClick?: (s: import("@/lib/mock-data").Shipment) => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Geographic Overview</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> High</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> In Transit</span>
          </div>
          {collapsed ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronUp size={13} className="text-gray-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="relative p-2 bg-slate-50" style={{ height: 200 }}>
          <svg
            viewBox="0 0 800 400"
            className="w-full h-full"
            style={{ opacity: 0.9 }}
          >
            {/* Simple world map paths - very simplified outlines */}
            {/* Ocean background */}
            <rect width="800" height="400" fill="#EFF6FF" />

            {/* North America rough */}
            <path d="M 80 60 L 200 55 L 230 90 L 210 130 L 240 160 L 230 190 L 200 210 L 180 240 L 160 250 L 145 220 L 130 200 L 110 180 L 90 150 L 75 120 L 70 90 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
            {/* Central America */}
            <path d="M 180 240 L 200 250 L 195 270 L 180 265 L 170 255 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
            {/* South America rough */}
            <path d="M 185 270 L 220 270 L 250 300 L 255 340 L 240 370 L 220 380 L 200 370 L 185 340 L 175 310 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
            {/* Europe rough */}
            <path d="M 370 50 L 430 50 L 445 80 L 440 100 L 420 110 L 400 105 L 380 115 L 360 100 L 355 80 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
            {/* Africa rough */}
            <path d="M 380 120 L 420 115 L 450 130 L 455 180 L 450 230 L 430 270 L 410 280 L 395 270 L 375 230 L 368 180 L 370 140 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
            {/* Asia rough */}
            <path d="M 440 50 L 600 40 L 650 70 L 660 100 L 640 120 L 600 125 L 560 130 L 520 120 L 500 110 L 470 105 L 450 90 L 440 70 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
            {/* Southeast Asia / China */}
            <path d="M 620 85 L 660 90 L 680 110 L 670 130 L 645 130 L 625 115 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
            {/* Australia rough */}
            <path d="M 610 230 L 680 220 L 720 240 L 730 280 L 700 310 L 660 320 L 620 300 L 600 270 L 600 245 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />

            {/* Shipment dots */}
            {SHIPMENTS.map((s) => {
              const { x, y } = project(s.lat, s.lng)
              const color = SEVERITY_COLOR[s.severity] ?? "#3B82F6"
              return (
                <g key={s.id}>
                  {/* Pulse ring for critical */}
                  {s.severity === "Critical" && (
                    <circle cx={x} cy={y} r="10" fill={color} opacity="0.2">
                      <animate attributeName="r" from="8" to="14" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill={color}
                    stroke="white"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onMouseEnter={() => setTooltip(s.id)}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => onShipmentClick?.(s)}
                  />
                  {/* Tooltip label */}
                  {tooltip === s.id && (
                    <g>
                      <rect x={x + 8} y={y - 14} width={80} height={22} rx="3" fill="white" stroke="#E5E7EB" strokeWidth="1" />
                      <text x={x + 12} y={y} fontSize="9" fill="#1E293B" fontWeight="600">{s.id}</text>
                      <text x={x + 12} y={y + 9} fontSize="8" fill="#6B7280">{s.carrier}</text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}
