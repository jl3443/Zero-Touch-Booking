"use client"

import { useState } from "react"
import { BOOKING_DOCUMENTS, type DocumentStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import {
  FileText, CheckCircle2, AlertCircle, Clock, Minus, ChevronDown, ChevronRight, Download,
} from "lucide-react"

const STATUS_CONFIG: Record<DocumentStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  verified: {
    label: "Verified",
    icon: <CheckCircle2 size={12} />,
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  received: {
    label: "Received",
    icon: <CheckCircle2 size={12} />,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  pending: {
    label: "Pending",
    icon: <Clock size={12} />,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  missing: {
    label: "Missing",
    icon: <AlertCircle size={12} />,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  na: {
    label: "N/A",
    icon: <Minus size={12} />,
    color: "text-gray-400",
    bg: "bg-gray-50 border-gray-200",
  },
}

export function DocumentsPage() {
  const [openBookings, setOpenBookings] = useState<Set<string>>(new Set(["BKG-10421", "BKG-20334"]))

  const toggle = (id: string) => {
    setOpenBookings((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Summary counts
  const allDocs = BOOKING_DOCUMENTS.flatMap((d) => d.documents)
  const missingCount = allDocs.filter((d) => d.status === "missing").length
  const pendingCount = allDocs.filter((d) => d.status === "pending").length
  const verifiedCount = allDocs.filter((d) => d.status === "verified").length

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1100px] mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Booking Documents</h2>
              <p className="text-xs text-gray-400">Supporting documents across all active bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-red-700 font-semibold bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
              <AlertCircle size={11} /> {missingCount} Missing
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <Clock size={11} /> {pendingCount} Pending
            </span>
            <span className="flex items-center gap-1.5 text-green-700 font-semibold bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <CheckCircle2 size={11} /> {verifiedCount} Verified
            </span>
          </div>
        </div>

        {/* Booking document accordions */}
        <div className="space-y-2">
          {BOOKING_DOCUMENTS.map((docSet) => {
            const isOpen = openBookings.has(docSet.bookingId)
            const missing = docSet.documents.filter((d) => d.status === "missing").length
            const pending = docSet.documents.filter((d) => d.status === "pending").length
            const verified = docSet.documents.filter((d) => d.status === "verified").length
            const total = docSet.documents.filter((d) => d.status !== "na").length
            const pct = total > 0 ? Math.round((verified / total) * 100) : 100

            return (
              <div key={docSet.bookingId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Accordion header */}
                <button
                  onClick={() => toggle(docSet.bookingId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {isOpen ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                  <span className="font-mono font-bold text-blue-700 text-sm w-24 shrink-0">{docSet.bookingId}</span>
                  <span className="text-xs text-gray-500 font-medium truncate flex-1">
                    {docSet.carrier} &middot; {docSet.lane}
                  </span>

                  {/* Mini progress */}
                  <div className="flex items-center gap-2 shrink-0">
                    {missing > 0 && (
                      <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 font-semibold">
                        {missing} missing
                      </span>
                    )}
                    {pending > 0 && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
                        {pending} pending
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">{pct}%</span>
                    </div>
                  </div>
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Document</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Upload Date</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docSet.documents.map((doc, i) => {
                          const cfg = STATUS_CONFIG[doc.status]
                          return (
                            <tr key={i} className={cn(
                              "border-b border-gray-50",
                              doc.status === "missing" ? "bg-red-50/40" : doc.status === "pending" ? "bg-amber-50/30" : ""
                            )}>
                              <td className="px-4 py-2.5 font-medium text-gray-700">{doc.name}</td>
                              <td className="px-4 py-2.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                  cfg.bg, cfg.color
                                )}>
                                  {cfg.icon}
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-gray-500">{doc.uploadDate || "\u2014"}</td>
                              <td className="px-4 py-2.5 text-gray-400 italic">{doc.ref || "\u2014"}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
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
