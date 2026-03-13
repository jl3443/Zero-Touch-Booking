"use client"

import { useState } from "react"
import { STATIC_SENT_EMAILS, type SentEmailItem } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Send, Clock, ChevronLeft, MailOpen } from "lucide-react"

export type { SentEmailItem }

const TYPE_CONFIG: Record<SentEmailItem["type"], { label: string; color: string }> = {
  plant:      { label: "Plant Notification", color: "bg-green-50 border-green-200 text-green-700" },
  carrier:    { label: "Carrier Inquiry",    color: "bg-blue-50 border-blue-200 text-blue-700" },
  escalation: { label: "Escalation",         color: "bg-red-50 border-red-200 text-red-700" },
  sap:        { label: "SAP Update",         color: "bg-violet-50 border-violet-200 text-violet-700" },
}

// Extract booking ID from subject or body
function extractBookingId(text: string): string | null {
  const match = text.match(/BKG-\d+/)
  return match ? match[0] : null
}

interface EmailSentPageProps {
  dynamicEmails?: SentEmailItem[]
}

export function EmailSentPage({ dynamicEmails = [] }: EmailSentPageProps) {
  const allEmails = [...dynamicEmails, ...STATIC_SENT_EMAILS]
  const [selected, setSelected] = useState<SentEmailItem | null>(null)

  return (
    <div className="flex-1 overflow-hidden bg-[#F8F9FA] flex flex-col">
      <div className="p-6 pb-3 max-w-[1100px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
              <Send size={16} className="text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Sent</h2>
              <p className="text-xs text-gray-400">Booking confirmations, carrier inquiries, escalations, and SAP updates</p>
            </div>
          </div>
          <span className="text-xs text-gray-400">{allEmails.length} messages</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden max-w-[1100px] mx-auto w-full px-6 pb-6 gap-4">
        {/* Email list */}
        <div className={cn(
          "flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shrink-0",
          selected ? "w-72" : "flex-1"
        )}>
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {allEmails.length} sent messages
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {allEmails.map((email) => {
              const typeCfg = TYPE_CONFIG[email.type]
              const isSelected = selected?.id === email.id
              const bookingId = extractBookingId(email.subject) || extractBookingId(email.body)
              return (
                <button
                  key={email.id}
                  onClick={() => setSelected(isSelected ? null : email)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                    isSelected && "bg-blue-50/60 border-l-2 border-l-blue-500"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 shrink-0">
                      <MailOpen size={13} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs text-gray-500 font-normal truncate">To: {email.to}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{email.timestamp}</span>
                      </div>
                      <div className="text-[11px] mb-1 truncate text-gray-700 font-medium">
                        {email.subject}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[9px] font-semibold border rounded-full px-1.5 py-0.5", typeCfg.color)}>
                          {typeCfg.label}
                        </span>
                        {bookingId && (
                          <span className="text-[9px] font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                            {bookingId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Email detail */}
        {selected ? (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mb-3 transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 leading-snug">{selected.subject}</h3>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>To: <span className="text-gray-600 font-medium">{selected.to}</span></span>
                <span className="flex items-center gap-1"><Clock size={10} /> {selected.timestamp}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", TYPE_CONFIG[selected.type].color)}>
                  {TYPE_CONFIG[selected.type].label}
                </span>
                {(() => {
                  const bid = extractBookingId(selected.subject) || extractBookingId(selected.body)
                  return bid ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                      {bid}
                    </span>
                  ) : null
                })()}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                {selected.body}
              </pre>
            </div>
          </div>
        ) : (
          <div className="hidden" />
        )}
      </div>
    </div>
  )
}
