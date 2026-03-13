"use client"

import { useState } from "react"
import { BOOKING_REQUESTS } from "@/lib/mock-data"
import { ModeBadge, BookingStatusBadge, SourceBadge } from "./shared"
import { cn } from "@/lib/utils"
import {
  GitBranch, ChevronDown, ChevronRight, AlertTriangle, Check,
  Brain, CheckCircle2, Activity,
} from "lucide-react"

type TimelineFilter = "All" | "Exceptions" | "Agent Actions" | "Completed"

// Status color system: green (ok/info), red (warning/critical), purple (agent)
const STATUS_CONFIG = {
  ok:       { dot: "bg-green-500",  ring: "ring-green-100",  cardBg: "",                 cardBorder: "border-gray-100",  textColor: "text-gray-800" },
  info:     { dot: "bg-blue-500",   ring: "ring-blue-100",   cardBg: "",                 cardBorder: "border-gray-100",  textColor: "text-gray-700" },
  warning:  { dot: "bg-amber-500",  ring: "ring-amber-200",  cardBg: "bg-amber-50/40",   cardBorder: "border-amber-200", textColor: "text-amber-700" },
  critical: { dot: "bg-red-500",    ring: "ring-red-200",    cardBg: "bg-red-50/40",     cardBorder: "border-red-200",   textColor: "text-red-700"  },
  agent:    { dot: "bg-purple-500", ring: "ring-purple-200", cardBg: "bg-purple-50/40",  cardBorder: "border-purple-200", textColor: "text-purple-800" },
}

export function TimelinePage() {
  const [openBookings, setOpenBookings] = useState<Set<string>>(new Set(["BKG-10421", "BKG-20334"]))
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("All")

  const toggle = (id: string) => {
    setOpenBookings((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Summary stats
  const totalEvents = BOOKING_REQUESTS.reduce((acc, b) => acc + b.timeline.length, 0)
  const agentActions = BOOKING_REQUESTS.reduce((acc, b) => acc + b.timeline.filter(e => e.status === "agent").length, 0)
  const exceptionsDetected = BOOKING_REQUESTS.reduce((acc, b) => acc + b.timeline.filter(e => e.status === "warning" || e.status === "critical").length, 0)
  const completedBookings = BOOKING_REQUESTS.filter(b => b.bookingStatus === "Confirmed").length

  // Filtered bookings
  const filteredBookings = BOOKING_REQUESTS.filter((b) => {
    if (timelineFilter === "Exceptions") return b.timeline.some(e => e.status === "warning" || e.status === "critical")
    if (timelineFilter === "Agent Actions") return b.timeline.some(e => e.status === "agent")
    if (timelineFilter === "Completed") return b.bookingStatus === "Confirmed"
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1100px] mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
            <GitBranch size={16} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Booking Timeline</h2>
            <p className="text-xs text-gray-400">Chronological event log for all active bookings</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <Activity size={15} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-800">{totalEvents}</div>
              <div className="text-[10px] text-gray-400 font-medium">Total Events</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
              <Brain size={15} className="text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-purple-700">{agentActions}</div>
              <div className="text-[10px] text-gray-400 font-medium">Agent Actions</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} className="text-red-500" />
            </div>
            <div>
              <div className="text-xl font-bold text-red-600">{exceptionsDetected}</div>
              <div className="text-[10px] text-gray-400 font-medium">Exceptions Logged</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} className="text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-green-700">{completedBookings}</div>
              <div className="text-[10px] text-gray-400 font-medium">Completed</div>
            </div>
          </div>
        </div>

        {/* Filter tabs + legend row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1 self-start">
            {(["All", "Exceptions", "Agent Actions", "Completed"] as TimelineFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setTimelineFilter(tab)}
                className={cn(
                  "px-3 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap",
                  timelineFilter === tab ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Ok</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />Info</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Warning</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" />Agent Action</span>
          </div>
        </div>

        {/* Booking timelines */}
        <div className="space-y-3">
          {filteredBookings.length === 0 && (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
              No bookings match this filter.
            </div>
          )}
          {filteredBookings.map((booking) => {
            const isOpen = openBookings.has(booking.id)
            const hasWarning = booking.timeline.some((e) => e.status === "warning" || e.status === "critical")

            return (
              <div key={booking.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggle(booking.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {isOpen
                    ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={14} className="text-gray-400 shrink-0" />
                  }
                  <span className="font-mono font-bold text-blue-700 text-sm w-24 shrink-0">{booking.id}</span>
                  <ModeBadge mode={booking.mode} />
                  <BookingStatusBadge status={booking.bookingStatus} />
                  <span className="text-xs text-gray-500 truncate flex-1">
                    {booking.carrier} &middot; {booking.origin.split(",")[0]} &rarr; {booking.destination.split(",")[0]}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 shrink-0">
                    <span>{booking.timeline.length} events</span>
                    {hasWarning && (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} /> Exception
                      </span>
                    )}
                  </div>
                </button>

                {/* Timeline events */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />

                      <div className="space-y-0">
                        {[...booking.timeline].reverse().map((event, i, arr) => {
                          const cfg = STATUS_CONFIG[event.status]
                          const isAgent = event.status === "agent"
                          return (
                            <div key={i} className="relative flex gap-4 pb-4 last:pb-0">
                              {/* Dot */}
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 mt-1 z-10 ring-2",
                                cfg.dot, cfg.ring
                              )}>
                                {isAgent && <Check size={7} className="text-white absolute inset-0 m-auto" />}
                              </div>

                              {/* Content */}
                              <div className={cn(
                                "flex-1 rounded-lg border p-3 -mt-0.5",
                                cfg.cardBg, cfg.cardBorder
                              )}>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className={cn("text-xs font-semibold flex items-center gap-1 mb-0.5", cfg.textColor)}>
                                      {event.event}
                                    </span>
                                    <div className="text-[11px] text-gray-400">{event.location}</div>
                                    {event.anomaly && (
                                      <div className="mt-1 text-[11px] text-red-700 font-medium">{event.anomaly}</div>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0 space-y-1">
                                    <div className="font-mono text-[10px] text-gray-400">{event.timestamp}</div>
                                    <SourceBadge source={event.source} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Booking summary footer */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-[11px] flex-wrap">
                      <span className="text-gray-400">Requested: <span className="font-mono text-gray-600">{booking.requestedDate}</span></span>
                      <span className="text-gray-400">Target Ship: <span className="font-mono text-gray-600">{booking.targetShipDate}</span></span>
                      {booking.confirmedShipDate && (
                        <span className="text-gray-400">Confirmed: <span className="font-mono text-green-600 font-semibold">{booking.confirmedShipDate}</span></span>
                      )}
                      <span className="text-gray-400">Lane: <span className="font-mono text-blue-700 font-semibold">{booking.lane}</span></span>
                      {booking.bookingRef && (
                        <span className="ml-auto text-gray-400">Ref: <span className="font-semibold text-gray-600">{booking.bookingRef}</span></span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
