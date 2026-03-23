"use client"

import { useState } from "react"
import { INBOX_EMAILS, type InboxEmail, type EmailTag } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Mail, MailOpen, Tag, Clock, Package, ChevronLeft, Brain, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react"

const TAG_CONFIG: Record<EmailTag, { label: string; color: string }> = {
  sap:       { label: "SAP",       color: "bg-blue-50 border-blue-200 text-blue-700" },
  carrier:   { label: "Carrier",   color: "bg-teal-50 border-teal-200 text-teal-700" },
  booking:   { label: "Booking",   color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  rejection: { label: "Rejection", color: "bg-red-50 border-red-200 text-red-700" },
  rate:      { label: "Rate",      color: "bg-amber-50 border-amber-200 text-amber-700" },
  agent:     { label: "Agent",     color: "bg-purple-50 border-purple-200 text-purple-700" },
}

// Extracts the first BKG-XXXXX from an email body
function extractBookingId(body: string): string | null {
  const match = body.match(/BKG-\d+/)
  return match ? match[0] : null
}

interface EmailInboxPageProps {
  onOpenTracking?: (shipmentId: string) => void
  onMarkRead?: (emailId: string) => void
  dynamicEmails?: Array<{ id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }>
  onReturnToFlow?: () => void
}

export function EmailInboxPage({ onOpenTracking, onMarkRead, dynamicEmails = [], onReturnToFlow }: EmailInboxPageProps) {
  const dynamicAsInbox: InboxEmail[] = dynamicEmails.map((e) => ({
    id: e.id, from: e.from, fromName: e.fromName, subject: e.subject, body: e.body,
    timestamp: e.timestamp, read: e.read, tag: e.tag as EmailTag, tags: e.tags as EmailTag[],
    shipmentId: e.shipmentId, shipmentRef: e.shipmentRef,
  }))
  const [emails, setEmails] = useState<InboxEmail[]>(INBOX_EMAILS)
  const allEmails = [...dynamicAsInbox, ...emails]
  const [selected, setSelected] = useState<InboxEmail | null>(null)
  const [activeTagFilter, setActiveTagFilter] = useState<EmailTag | null>(null)
  const [analyzingEmail, setAnalyzingEmail] = useState<string | null>(null)
  const [analyzedEmails, setAnalyzedEmails] = useState<Record<string, string>>({})

  const filteredEmails = activeTagFilter
    ? allEmails.filter((e) => e.tag === activeTagFilter || e.tags.includes(activeTagFilter))
    : allEmails

  const unreadCount = allEmails.filter((e) => !e.read).length

  // Check if selected email is a demo reply that should show AI analysis + return button
  const isDemoReply = selected?.id.startsWith("DEMO-INBOX-")

  const handleSelect = (email: InboxEmail) => {
    setSelected(email)
    if (!email.read) onMarkRead?.(email.id)
    setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, read: true } : e))
  }

  const handleAnalyze = (email: InboxEmail) => {
    setAnalyzingEmail(email.id)
    setTimeout(() => {
      const extracted = extractBookingId(email.body)
      if (extracted) {
        setAnalyzedEmails((prev) => ({ ...prev, [email.id]: extracted }))
      }
      setAnalyzingEmail(null)
    }, 2000)
  }

  // Determine if the selected email should show the AI analysis banner
  const showAnalysisBanner = selected && !selected.shipmentId && extractBookingId(selected.body) !== null
  const isAnalyzing = selected ? analyzingEmail === selected.id : false
  const analysisResult = selected ? analyzedEmails[selected.id] : null

  // All unique tags for filter bar
  const allTags = Object.keys(TAG_CONFIG) as EmailTag[]

  return (
    <div className="flex-1 overflow-hidden bg-[#F8F9FA] flex flex-col">
      <div className="p-6 pb-3 max-w-[1100px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Mail size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Inbox</h2>
              <p className="text-xs text-gray-400">SAP requirements, carrier confirmations, and agent alerts</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold bg-blue-600 text-white rounded-full px-2.5 py-1">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Tag filter bar */}
        <div className="flex items-center gap-1.5 mb-3">
          <button
            onClick={() => setActiveTagFilter(null)}
            className={cn(
              "text-[10px] font-semibold border rounded-full px-2.5 py-1 transition-colors",
              activeTagFilter === null
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            )}
          >
            All ({emails.length})
          </button>
          {allTags.map((tag) => {
            const count = emails.filter((e) => e.tag === tag || e.tags.includes(tag)).length
            if (count === 0) return null
            const cfg = TAG_CONFIG[tag]
            return (
              <button
                key={tag}
                onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                className={cn(
                  "text-[10px] font-semibold border rounded-full px-2.5 py-1 transition-colors",
                  activeTagFilter === tag
                    ? cfg.color
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                )}
              >
                {cfg.label} ({count})
              </button>
            )
          })}
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
              {filteredEmails.length} messages
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredEmails.map((email) => {
              const tagCfg = TAG_CONFIG[email.tag]
              const isSelected = selected?.id === email.id
              return (
                <button
                  key={email.id}
                  onClick={() => handleSelect(email)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                    isSelected && "bg-blue-50/60 border-l-2 border-l-blue-500",
                    !email.read && "bg-white"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 shrink-0">
                      {email.read
                        ? <MailOpen size={13} className="text-gray-300" />
                        : <Mail size={13} className="text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={cn("text-xs truncate", email.read ? "text-gray-500 font-normal" : "text-gray-800 font-semibold")}>
                          {email.fromName}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">{email.timestamp}</span>
                      </div>
                      <div className={cn("text-[11px] mb-1 truncate", email.read ? "text-gray-500" : "text-gray-700 font-medium")}>
                        {email.subject}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[9px] font-semibold border rounded-full px-1.5 py-0.5", tagCfg.color)}>
                          {tagCfg.label}
                        </span>
                        {email.shipmentId && (
                          <span className="text-[9px] font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                            {email.shipmentId}
                          </span>
                        )}
                        {/* AI Ready badge for emails without registered booking */}
                        {!email.shipmentId && extractBookingId(email.body) && (
                          <span className="text-[9px] text-white bg-indigo-600 flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5">
                            <Brain size={8} /> AI Analyze
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
            {/* Detail header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mb-3 transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 leading-snug">{selected.subject}</h3>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>From: <span className="text-gray-600 font-medium">{selected.fromName}</span> &lt;{selected.from}&gt;</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {selected.timestamp}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", TAG_CONFIG[selected.tag].color)}>
                  <Tag size={9} className="inline mr-1" />{TAG_CONFIG[selected.tag].label}
                </span>
                {/* Show all secondary tags */}
                {selected.tags
                  .filter((t) => t !== selected.tag)
                  .map((t) => (
                    <span key={t} className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", TAG_CONFIG[t].color)}>
                      {TAG_CONFIG[t].label}
                    </span>
                  ))}
                {selected.shipmentId && (
                  <button
                    onClick={() => onOpenTracking?.(selected.shipmentId!)}
                    className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Package size={9} /> {selected.shipmentId}
                  </button>
                )}
              </div>
            </div>

            {/* AI Analysis Banner */}
            {showAnalysisBanner && !analysisResult && (
              <div className={cn(
                "mx-5 mt-4 rounded-xl border px-4 py-3 flex items-center justify-between gap-3",
                isAnalyzing
                  ? "border-indigo-200 bg-indigo-50"
                  : "border-amber-200 bg-amber-50"
              )}>
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <Brain size={15} className="text-indigo-500 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-700">Analyzing booking reference...</p>
                      <div className="flex items-end gap-[3px] mt-0.5">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                            style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Booking reference detected. AI analysis ready.</p>
                        <p className="text-[11px] text-amber-600">Booking ID found in body -- not yet linked in system</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAnalyze(selected)}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <Brain size={12} /> Analyze with AI
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Analysis Result Card */}
            {analysisResult && (
              <div className="mx-5 mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs font-semibold text-green-800">AI Analysis Complete</p>
                </div>
                <div className="space-y-1 text-[11px] text-green-700 pl-5">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span>Booking ID identified: <span className="font-mono font-bold text-green-800">{analysisResult}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span>Booking linked to monitoring</span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenTracking?.(analysisResult)}
                  className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Open Booking Detail <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                {selected.body}
              </pre>

              {/* AI Analysis + Return to Flow for demo reply emails */}
              {isDemoReply && (
                <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="bg-indigo-50 rounded-lg px-4 py-3 border border-indigo-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Brain size={14} className="text-indigo-600" />
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">AI Analysis</span>
                    </div>
                    <div className="text-[12px] text-indigo-800 leading-relaxed">
                      {selected.id.includes("-MD-") && "Shipper contact information confirmed by Suzhou Plant team. Data cross-validated with Plant Directory — Li Wei is the designated logistics coordinator. Confidence: 95%. Ready to proceed with booking."}
                      {selected.id.includes("-RM-") && "Maersk has accepted the counter-offer at $3,024/container. This represents a $316 savings per container vs the original quote ($3,340). Rate is within 8% of contract ($2,800), aligned with current market conditions. Booking can proceed."}
                      {selected.id.includes("DEMO-INBOX") && !selected.id.includes("-MD-") && !selected.id.includes("-RM-") && "Carrier response received and validated. Booking reference confirmed. All data consistent with SAP TM order."}
                    </div>
                  </div>
                  <button
                    onClick={onReturnToFlow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ArrowRight size={14} /> Return to Booking Flow
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden" />
        )}

        {/* Empty state when nothing selected and list is shown full-width */}
        {!selected && (
          <div className="hidden" />
        )}
      </div>
    </div>
  )
}
