"use client"

import { EXCEPTION_DISTRIBUTION, SHIPMENTS } from "@/lib/mock-data"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { SeverityBadge, ModeBadge } from "./shared"
import { Clock } from "lucide-react"

// ─── Exception Distribution Chart ────────────────────────────────────────────
export function ExceptionDistributionPanel({ onExceptionClick }: { onExceptionClick?: () => void }) {
  const data = EXCEPTION_DISTRIBUTION.filter((d) => d.count > 0)

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col h-full cursor-pointer hover:border-blue-300 transition-colors"
      onClick={onExceptionClick}
      title="Click to open Exception Workbench"
    >
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Exception Distribution</h3>
      <div className="flex-1 min-h-0" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="type"
              width={120}
              tick={{ fontSize: 11, fill: "#4B5563" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: "4px 8px" }}
              formatter={(val: number) => [`${val} shipment${val !== 1 ? "s" : ""}`, ""]}
              labelStyle={{ display: "none" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {data.map((entry) => (
                <Cell key={entry.type} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {EXCEPTION_DISTRIBUTION.filter((d) => d.count > 0).map((d) => (
          <div key={d.type} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] text-gray-500">{d.type} ({d.count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Critical Cutoff Risk List ────────────────────────────────────────────────
export function CriticalCutoffPanel({ onShipmentClick }: { onShipmentClick?: (s: import("@/lib/mock-data").Shipment) => void }) {
  const atRisk = SHIPMENTS
    .filter((s) => s.cutoffTime && (s.severity === "Critical" || s.severity === "High"))
    .slice(0, 5)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col h-full">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Critical Cutoff Risk</h3>
      <div className="space-y-2">
        {atRisk.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No cutoff risks at this time.</p>
        )}
        {atRisk.map((s) => {
          const gapHours = s.delayHours
          return (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 bg-gray-50/50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
              onClick={() => onShipmentClick?.(s)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ModeBadge mode={s.mode} />
                <div className="min-w-0">
                  <div className="text-xs font-mono font-semibold text-blue-700">{s.id}</div>
                  <div className="text-[10px] text-gray-500 truncate" title={s.plant}>{s.plant}</div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="flex items-center gap-1 justify-end">
                  <Clock size={10} className="text-gray-400" />
                  <span className="text-[10px] font-mono text-gray-500">{s.cutoffTime?.replace("2025 ", "")}</span>
                </div>
                <div className="text-[10px] text-red-600 font-semibold mt-0.5">+{gapHours}h late</div>
                <SeverityBadge severity={s.severity} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
