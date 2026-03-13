"use client"

import { useState, useRef, useEffect } from "react"
import { Brain, X, Send, ChevronRight, AlertTriangle, Clock } from "lucide-react"
import { SHIPMENTS, CARRIER_SCORECARDS, DD_RISKS, LANE_PERFORMANCE, type Shipment } from "@/lib/mock-data"
import { ShipmentDrawer } from "./shipment-drawer"
import { type SentEmailItem } from "./email-sent-page"
import { cn } from "@/lib/utils"

// ── AI Response types + generator ─────────────────────────────────────────────

interface AIResponseLine {
  id: string
  delay: number
  severity: string
  exception: string
  note: string
}

interface AIResponseData {
  heading: string
  summary: string
  lines: AIResponseLine[]
  footer?: string
}

function generateAIResponse(query: string): AIResponseData {
  const q = query.toLowerCase()

  const withExceptions = SHIPMENTS.filter((s) => s.exceptionType !== "None")
  const confirmed = SHIPMENTS.filter((s) => s.bookingStatus === "Confirmed" || s.bookingStatus === "Notified")
  const pending = SHIPMENTS.filter((s) => s.bookingStatus === "Pending" || s.bookingStatus === "In Progress")
  const awaitingApproval = SHIPMENTS.filter((s) => s.bookingStatus === "Awaiting Approval")

  // Exception queries
  if (q.includes("exception") || q.includes("error") || q.includes("issue") || q.includes("problem") || q.includes("attention")) {
    return {
      heading: "Bookings with Exceptions",
      summary: `${withExceptions.length} booking${withExceptions.length !== 1 ? "s" : ""} have active exceptions requiring attention. Review recommended actions below.`,
      lines: withExceptions.map((s) => ({
        id: s.id,
        delay: s.delayHours,
        severity: s.severity,
        exception: s.exceptionType,
        note: s.recommendedAction,
      })),
      footer: "Action: Open each booking to review exception details and take recommended action",
    }
  }

  // Carrier / rate queries
  if (q.includes("carrier") || q.includes("rate") || q.includes("comparison") || q.includes("compare")) {
    const topCarriers = CARRIER_SCORECARDS.slice(0, 5)
    return {
      heading: "Carrier Comparison",
      summary: `${CARRIER_SCORECARDS.length} carriers in the network. Top performers by SLA: ${topCarriers.sort((a, b) => b.slaScore - a.slaScore).slice(0, 3).map((c) => `${c.carrier} (${c.slaScore}%)`).join(", ")}.`,
      lines: topCarriers.map((c) => ({
        id: c.carrier,
        delay: 0,
        severity: c.rating === "Preferred" ? "Low" : "Medium",
        exception: c.rating,
        note: `Contract: ${c.contractRate} \u00b7 SLA: ${c.slaScore}% \u00b7 Success: ${c.bookingSuccessRate}%`,
      })),
      footer: "Tip: Ask about a specific carrier or lane for detailed performance data",
    }
  }

  // Approval / pending queries
  if (q.includes("approval") || q.includes("pending") || q.includes("awaiting")) {
    return {
      heading: "Pending Approvals",
      summary: `${DD_RISKS.length} booking${DD_RISKS.length !== 1 ? "s" : ""} awaiting planner or manager approval. ${DD_RISKS.filter((r) => r.urgency === "High").length} flagged as high urgency.`,
      lines: DD_RISKS.map((r) => ({
        id: r.shipmentId,
        delay: 0,
        severity: r.urgency === "High" ? "High" : "Medium",
        exception: r.type,
        note: r.detail,
      })),
      footer: "Action: Review and approve or reject each item in the Exceptions workbench",
    }
  }

  // Booking / status overview queries
  if (q.includes("booking") || q.includes("status") || q.includes("overview") || q.includes("all")) {
    return {
      heading: "Booking Portfolio Overview",
      summary: `${SHIPMENTS.length} active bookings: ${confirmed.length} confirmed, ${pending.length} in progress, ${awaitingApproval.length} awaiting approval, ${withExceptions.length} with exceptions.`,
      lines: SHIPMENTS.slice(0, 5).map((s) => ({
        id: s.id,
        delay: s.delayHours,
        severity: s.severity,
        exception: s.bookingStatus,
        note: s.currentStatus,
      })),
      footer: `Tip: Ask about "exceptions", "carriers", "approvals", or "lane performance" for targeted insights`,
    }
  }

  // Lane performance queries
  if (q.includes("lane") || q.includes("performance") || q.includes("zero-touch") || q.includes("zero touch") || q.includes("turnaround")) {
    const topLanes = LANE_PERFORMANCE.sort((a, b) => b.zeroTouchRate - a.zeroTouchRate).slice(0, 5)
    return {
      heading: "Lane Performance Summary",
      summary: `${LANE_PERFORMANCE.length} active lanes monitored. Average zero-touch rate: ${Math.round(LANE_PERFORMANCE.reduce((sum, l) => sum + l.zeroTouchRate, 0) / LANE_PERFORMANCE.length)}%. Best performer: ${topLanes[0].lane} at ${topLanes[0].zeroTouchRate}%.`,
      lines: topLanes.map((l) => ({
        id: l.lane,
        delay: 0,
        severity: l.zeroTouchRate >= 85 ? "Low" : l.zeroTouchRate >= 70 ? "Medium" : "High",
        exception: `${l.zeroTouchRate}% ZT`,
        note: `${l.preferredCarrier} \u00b7 ${l.bookingsPerMonth}/mo \u00b7 ${l.avgTurnaroundHrs}h turnaround`,
      })),
      footer: "Lanes below 70% zero-touch rate are candidates for workflow optimization",
    }
  }

  // Default: general overview
  return {
    heading: "Booking System Overview",
    summary: `Monitoring ${SHIPMENTS.length} active bookings across ${LANE_PERFORMANCE.length} lanes with ${CARRIER_SCORECARDS.length} carriers. ${withExceptions.length} exceptions active, ${DD_RISKS.length} pending approvals.`,
    lines: SHIPMENTS.slice(0, 5).map((s) => ({
      id: s.id,
      delay: s.delayHours,
      severity: s.severity,
      exception: s.bookingStatus,
      note: s.currentStatus,
    })),
    footer: `Tip: Ask about "exceptions", "carrier comparison", "pending approvals", "bookings", or "lane performance"`,
  }
}

const SEV_COLOR: Record<string, string> = {
  Critical: "text-red-700 bg-red-50 border-red-200",
  High: "text-amber-700 bg-amber-50 border-amber-200",
  Medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  Low: "text-green-700 bg-green-50 border-green-200",
}

const SUGGESTION_CHIPS = [
  "Which bookings need attention?",
  "Show carrier comparison",
  "Any booking exceptions?",
  "Pending approvals status",
]

// ── Chat types ─────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  response?: AIResponseData
}

// ── Component ──────────────────────────────────────────────────────────────────

interface AIChatPanelProps {
  open: boolean
  onClose: () => void
  onOpenWeather?: (id: string) => void
  onSendNotification?: (email: SentEmailItem) => void
}

export function AIChatPanel({ open, onClose, onOpenWeather, onSendNotification }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  const handleQuery = (q: string) => {
    if (!q.trim() || isThinking) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: q }
    setMessages((prev) => [...prev, userMsg])
    setInputValue("")
    setIsThinking(true)
    setTimeout(() => {
      const response = generateAIResponse(q)
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: response.summary,
        response,
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsThinking(false)
    }, 1400)
  }

  if (!open) return null

  return (
    <>
      {/* Dim backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[380px] z-50 bg-white border-l border-gray-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
              <Brain size={14} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-none">AI Assistant</p>
              <p className="text-[10px] text-indigo-500 mt-0.5">Booking intelligence agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-[11px] text-gray-400 text-center">
                Ask about your bookings, carriers, exceptions, or approvals
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleQuery(chip)}
                    className="text-left text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 leading-tight transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "user" ? (
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] text-xs leading-relaxed">
                  {msg.text}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[98%] space-y-2">
                  {msg.response && (
                    <>
                      <p className="text-[11px] font-semibold text-gray-800">{msg.response.heading}</p>
                      <p className="text-[11px] text-gray-600 leading-relaxed">{msg.response.summary}</p>
                      <div className="space-y-1">
                        {msg.response.lines.slice(0, 4).map((line) => {
                          const shipment = SHIPMENTS.find((s) => s.id === line.id)
                          return (
                            <button
                              key={line.id}
                              onClick={() => {
                                if (shipment) setSelectedShipment(shipment)
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-gray-100 transition-colors text-left",
                                !shipment && "cursor-default"
                              )}
                            >
                              <span className="font-mono font-bold text-blue-700 text-[10px] w-20 shrink-0">
                                {line.id}
                              </span>
                              <span
                                className={cn(
                                  "text-[9px] font-semibold border rounded-full px-1 py-0.5 shrink-0",
                                  SEV_COLOR[line.severity] ?? "text-gray-600 bg-gray-50 border-gray-200"
                                )}
                              >
                                {line.severity}
                              </span>
                              {line.delay > 0 && (
                                <span className="flex items-center gap-0.5 text-[9px] font-semibold text-red-600 shrink-0">
                                  <Clock size={8} /> +{line.delay}h
                                </span>
                              )}
                              <span className="text-[9px] text-gray-400 flex-1 truncate">{line.note}</span>
                              {shipment && <ChevronRight size={9} className="text-gray-300 shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                      {msg.response.footer && (
                        <p className="text-[9px] text-indigo-500 border-t border-indigo-100 pt-1.5 flex items-center gap-1">
                          <AlertTriangle size={8} /> {msg.response.footer}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
                <Brain size={11} className="text-indigo-500 animate-pulse" />
                <span className="text-[11px] text-gray-500">Thinking</span>
                <span className="inline-flex items-end gap-[3px]">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuery(inputValue)
              }}
              placeholder="Ask about your bookings..."
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-gray-400"
            />
            <button
              onClick={() => handleQuery(inputValue)}
              disabled={!inputValue.trim() || isThinking}
              className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
            >
              <Send size={12} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {selectedShipment && (
        <ShipmentDrawer
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onOpenWeather={onOpenWeather}
          onSendNotification={onSendNotification}
        />
      )}
    </>
  )
}
