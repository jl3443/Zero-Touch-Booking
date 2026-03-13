"use client"

import { EXCEPTION_DISTRIBUTION, DD_RISKS, type DDRisk } from "@/lib/mock-data"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { cn } from "@/lib/utils"
import { ShieldAlert, AlertTriangle } from "lucide-react"

// ─── Booking Exception Distribution Chart ────────────────────────────────────
export function ExceptionDistributionPanel({ onExceptionClick }: { onExceptionClick?: () => void }) {
  const data = EXCEPTION_DISTRIBUTION.filter((d) => d.count > 0)

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col h-full cursor-pointer hover:border-blue-300 transition-colors"
      onClick={onExceptionClick}
      title="Click to open Exception Workbench"
    >
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Booking Exception Distribution</h3>
      <div className="flex-1 min-h-0" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="type"
              width={130}
              tick={{ fontSize: 11, fill: "#4B5563" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: "4px 8px" }}
              formatter={(val: number) => [`${val} booking${val !== 1 ? "s" : ""}`, ""]}
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
        {EXCEPTION_DISTRIBUTION.map((d) => (
          <div key={d.type} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] text-gray-500">{d.type} ({d.count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Pending Approvals Panel ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<DDRisk["status"], { label: string; color: string; dot: string }> = {
  pending:  { label: "Pending",  color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500 animate-pulse" },
  approved: { label: "Approved", color: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500" },
  resolved: { label: "Resolved", color: "text-gray-700 bg-gray-50 border-gray-200",    dot: "bg-gray-400" },
}

export function DDRiskPanel({ onShipmentClick }: { onShipmentClick?: (id: string) => void }) {
  const pending = DD_RISKS.filter((r) => r.status === "pending").length

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <ShieldAlert size={10} className="text-amber-500" />
          <span>{pending} pending</span>
        </div>
      </div>

      {/* Summary banner */}
      <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
        <span className="text-[11px] text-amber-700 font-medium">Human Decisions Needed</span>
        <div className="flex items-center gap-1">
          <AlertTriangle size={12} className="text-amber-600" />
          <span className="text-sm font-bold text-amber-700">{pending}</span>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {DD_RISKS.map((r) => {
          const cfg = STATUS_CONFIG[r.status]
          return (
            <button
              key={r.shipmentId}
              onClick={() => onShipmentClick?.(r.shipmentId)}
              className="w-full text-left rounded-md border border-gray-100 px-3 py-2 bg-gray-50/40 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                    <span className="text-xs font-mono font-bold text-blue-700">{r.shipmentId}</span>
                    <span className={cn("text-[9px] font-semibold border rounded-full px-1.5 py-0.5", cfg.color)}>{cfg.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{r.detail}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-semibold text-amber-600">{r.type}</div>
                  <div className="text-[9px] text-gray-400">{r.urgency} Priority</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
