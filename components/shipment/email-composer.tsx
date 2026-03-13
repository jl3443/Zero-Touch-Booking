"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { Shipment, SentEmailItem } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import {
  X, Send, Copy, Check, Loader2, AlertCircle,
  ChevronDown, Paperclip, Clock, MailCheck, Pencil,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailTemplate = "confirmation" | "rejection" | "escalation" | "sap-update"

interface EmailComposerProps {
  shipment: Shipment
  onClose: () => void
  onSend?: (email: SentEmailItem) => void
  /** @deprecated — use onSend instead */
  onSent?: () => void
  /** @deprecated — use onSend instead */
  onSendNotification?: (email: SentEmailItem) => void
}

type SendStatus = "idle" | "sending" | "sent" | "error"

// ─── Template definitions ────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: { key: EmailTemplate; label: string; desc: string; type: SentEmailItem["type"] }[] = [
  { key: "confirmation",  label: "Booking Confirmation",     desc: "Notify plant/warehouse of confirmed booking",  type: "plant" },
  { key: "rejection",     label: "Carrier Rejection Alert",  desc: "Alert team about carrier booking rejection",    type: "escalation" },
  { key: "escalation",    label: "Exception Escalation",     desc: "Escalate booking exception to management",      type: "escalation" },
  { key: "sap-update",    label: "SAP Update Notification",  desc: "Notify SAP integration of booking status",      type: "sap" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectTemplate(s: Shipment): EmailTemplate {
  if (s.exceptionType === "Carrier Rejection") return "rejection"
  if (s.severity === "Critical" || s.severity === "High") return "escalation"
  if (s.bookingStatus === "Confirmed" || s.bookingStatus === "Notified") return "confirmation"
  return "sap-update"
}

function getRecipients(template: EmailTemplate, s: Shipment): string {
  switch (template) {
    case "confirmation": return `${s.plant.toLowerCase().replace(/[\s,]+/g, "-")}-ops@company.com`
    case "rejection": return "routing-team@company.com, supply-planning@company.com"
    case "escalation": return "vp-ops@company.com, routing-team@company.com"
    case "sap-update": return "sap-integration@company.com"
  }
}

function getSubject(template: EmailTemplate, s: Shipment): string {
  switch (template) {
    case "confirmation":
      return `Booking Confirmed — ${s.id} (${s.lane}, ${s.carrier})`
    case "rejection":
      return `Carrier Rejection Alert — ${s.id} (${s.lane})`
    case "escalation":
      return `ESCALATION — ${s.id} ${s.exceptionType} (${s.lane})`
    case "sap-update":
      return `SAP TM Update — ${s.id} Booking ${s.bookingStatus}`
  }
}

function getEmailType(template: EmailTemplate): SentEmailItem["type"] {
  return TEMPLATE_OPTIONS.find((t) => t.key === template)?.type ?? "plant"
}

// ─── HTML email generators ───────────────────────────────────────────────────

function generateEmailHTML(template: EmailTemplate, s: Shipment): string {
  const accentColor = template === "rejection" || template === "escalation" ? "#dc2626" : template === "sap-update" ? "#7c3aed" : "#16a34a"

  const headerTitle: Record<EmailTemplate, string> = {
    confirmation: `Booking Confirmed — ${s.id}`,
    rejection: `Carrier Rejection Alert — ${s.id}`,
    escalation: `Exception Escalation — ${s.id}`,
    "sap-update": `SAP TM Update — ${s.id}`,
  }

  const introText: Record<EmailTemplate, string> = {
    confirmation: `Booking <strong>${s.id}</strong> has been confirmed with ${s.carrier}. Please prepare for cargo handling.`,
    rejection: `Carrier ${s.carrier} has rejected the booking request for <strong>${s.id}</strong>. Immediate attention required.`,
    escalation: `Booking <strong>${s.id}</strong> has encountered an exception requiring escalation: <em>${s.exceptionType}</em>.`,
    "sap-update": `SAP TM order ${s.sapOrderRef} has been updated with the latest booking status for <strong>${s.id}</strong>.`,
  }

  const rows: [string, string, boolean?, boolean?][] = [
    ["Booking ID", s.id, true],
    ["SAP Order", s.sapOrderRef],
    ["Carrier", s.carrier],
    ...(s.bookingRef ? [["Booking Ref", s.bookingRef, true] as [string, string, boolean?, boolean?]] : []),
    ["Route", `${s.origin} → ${s.destination}`],
    ["Lane", s.lane],
    ["Container", s.containerType],
    ["Target Ship Date", s.targetShipDate, true],
    ["Status", s.bookingStatus],
    ["Severity", s.severity],
  ]

  if (template === "rejection" || template === "escalation") {
    rows.push(["Exception", s.exceptionType])
    rows.push(["Reason", s.reasonChips.map((c) => c.label).join(", ")])
  }

  const tableRows = rows.map(([label, value, mono, highlight]) =>
    `<tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; color: #6b7280; width: 140px;">${label}</td>
      <td style="padding: 8px 12px;${mono ? " font-family: monospace;" : ""}${highlight ? " color: #dc2626; font-weight: 600;" : ""}">${value}</td>
    </tr>`
  ).join("")

  let extraBlock = ""
  if (template === "rejection") {
    extraBlock = `
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
    <p style="margin: 0; font-size: 13px; color: #991b1b;"><strong>Action Required:</strong> ${s.recommendedAction || "Review alternate carriers or escalate for spot booking approval."}</p>
  </div>`
  } else if (template === "escalation") {
    extraBlock = `
  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
    <p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Agent Summary:</strong> ${s.agentSummary}</p>
  </div>`
  } else if (template === "confirmation") {
    extraBlock = `
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
    <p style="margin: 0; font-size: 13px; color: #166534;"><strong>Next Steps:</strong> Please ensure receiving dock is prepared. Cargo documents will follow separately.</p>
  </div>`
  }

  return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #f8f9fa; border-left: 4px solid ${accentColor}; padding: 16px 20px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
    <h2 style="margin: 0 0 4px 0; font-size: 16px; color: #1a1a1a;">${headerTitle[template]}</h2>
    <p style="margin: 0; font-size: 13px; color: #6b7280;">Automated notification from Zero Touch Booking Agent</p>
  </div>

  <p style="font-size: 14px; line-height: 1.6; color: #374151;">Dear Team,</p>
  <p style="font-size: 14px; line-height: 1.6; color: #374151;">${introText[template]}</p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
    ${tableRows}
  </table>

  ${extraBlock}

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="font-size: 11px; color: #9ca3af; line-height: 1.5;">
    This notification was generated automatically by the Zero Touch Booking Agent.<br/>
    Please do not reply directly to this email. For questions, contact logistics-ops@company.com.
  </p>
</div>`.trim()
}

// ─── HTML to plain text ──────────────────────────────────────────────────────

function htmlToPlainPreview(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<td[^>]*>/gi, "  ")
    .replace(/<hr[^>]*>/gi, "\n---\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&middot;/g, "·")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ─── Preview label config ────────────────────────────────────────────────────

const TEMPLATE_ACCENT: Record<EmailTemplate, { borderColor: string; bgColor: string }> = {
  confirmation: { borderColor: "border-l-green-500", bgColor: "bg-green-50/50" },
  rejection:    { borderColor: "border-l-red-500",   bgColor: "bg-red-50/50" },
  escalation:   { borderColor: "border-l-amber-500", bgColor: "bg-amber-50/50" },
  "sap-update": { borderColor: "border-l-violet-500", bgColor: "bg-violet-50/50" },
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmailComposer({ shipment, onClose, onSend, onSent, onSendNotification }: EmailComposerProps) {
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate>(detectTemplate(shipment))
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)

  const [to, setTo] = useState(getRecipients(activeTemplate, shipment))
  const [cc, setCc] = useState("logistics-ops@company.com")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState(getSubject(activeTemplate, shipment))

  const htmlBody = useRef(generateEmailHTML(activeTemplate, shipment))
  const [plainBody, setPlainBody] = useState(() => htmlToPlainPreview(htmlBody.current))
  const [isEditingBody, setIsEditingBody] = useState(false)
  const [bodyEdited, setBodyEdited] = useState(false)

  const [showBcc, setShowBcc] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [copied, setCopied] = useState(false)
  const [sentAt, setSentAt] = useState("")

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Switch template
  const handleTemplateSwitch = (t: EmailTemplate) => {
    setActiveTemplate(t)
    setTo(getRecipients(t, shipment))
    setSubject(getSubject(t, shipment))
    htmlBody.current = generateEmailHTML(t, shipment)
    setPlainBody(htmlToPlainPreview(htmlBody.current))
    setBodyEdited(false)
    setIsEditingBody(false)
    setShowTemplateMenu(false)
  }

  // Auto-resize textarea
  useEffect(() => {
    if (bodyRef.current && isEditingBody) {
      bodyRef.current.style.height = "auto"
      bodyRef.current.style.height = bodyRef.current.scrollHeight + "px"
    }
  }, [plainBody, isEditingBody])

  const handleBodyEdit = (val: string) => {
    setPlainBody(val)
    setBodyEdited(true)
    htmlBody.current = `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #1a1a1a;">${val.replace(/\n/g, "<br/>")}</div>`
  }

  const handleCopy = useCallback(() => {
    const text = [`To: ${to}`, cc ? `CC: ${cc}` : null, bcc ? `BCC: ${bcc}` : null, `Subject: ${subject}`, "", plainBody]
      .filter(Boolean)
      .join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [to, cc, bcc, subject, plainBody])

  const handleSend = async () => {
    setSendStatus("sending")
    setErrorMsg("")
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const now = new Date()
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    setSendStatus("sent")
    setSentAt(timeStr)
    const email: SentEmailItem = {
      id: `SE-${Date.now()}`,
      to: to.split(",")[0]?.trim() || to,
      subject,
      body: plainBody,
      timestamp: now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      type: getEmailType(activeTemplate),
    }
    onSend?.(email)
    onSendNotification?.(email)
    onSent?.()
  }

  const isSent = sendStatus === "sent"
  const accent = TEMPLATE_ACCENT[activeTemplate]
  const currentTplCfg = TEMPLATE_OPTIONS.find((t) => t.key === activeTemplate)!

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isSent ? "bg-green-100" : "bg-blue-100"
            )}>
              {isSent ? <MailCheck size={16} className="text-green-600" /> : <Send size={16} className="text-blue-600" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {isSent ? "Email Sent" : `Compose — ${currentTplCfg.label}`}
              </h3>
              <p className="text-[11px] text-gray-400">
                {isSent ? `Delivered at ${sentAt}` : `Booking ${shipment.id} · ${shipment.carrier} · ${shipment.lane}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Template switcher */}
            {!isSent && (
              <div className="relative">
                <button
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  className="text-[10px] rounded-full bg-blue-50 text-blue-600 px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-blue-100 transition-colors"
                >
                  {currentTplCfg.label}
                  <ChevronDown size={10} />
                </button>
                {showTemplateMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-20 overflow-hidden">
                    {TEMPLATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => handleTemplateSwitch(opt.key)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0",
                          opt.key === activeTemplate && "bg-blue-50/60"
                        )}
                      >
                        <span className="font-semibold text-gray-800">{opt.label}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Email Fields */}
        <div className="px-6 py-3 space-y-0 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 py-2 border-b border-gray-50">
            <span className="text-xs font-medium text-gray-400 w-10 shrink-0">To</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSent}
              className={cn(
                "flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-300",
                isSent && "text-gray-400 cursor-default"
              )}
              placeholder="recipient@company.com"
            />
            {!showBcc && !isSent && (
              <button
                onClick={() => setShowBcc(true)}
                className="text-[11px] text-gray-400 hover:text-blue-600 font-medium transition-colors"
              >
                Bcc
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 py-2 border-b border-gray-50">
            <span className="text-xs font-medium text-gray-400 w-10 shrink-0">Cc</span>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              disabled={isSent}
              className={cn(
                "flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-300",
                isSent && "text-gray-400 cursor-default"
              )}
              placeholder="cc@company.com"
            />
          </div>

          {showBcc && (
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <span className="text-xs font-medium text-gray-400 w-10 shrink-0">Bcc</span>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                disabled={isSent}
                className={cn(
                  "flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-300",
                  isSent && "text-gray-400 cursor-default"
                )}
                placeholder="bcc@company.com"
                autoFocus
              />
            </div>
          )}

          <div className="flex items-center gap-3 py-2">
            <span className="text-xs font-medium text-gray-400 w-10 shrink-0">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSent}
              className={cn(
                "flex-1 text-sm font-semibold text-gray-900 bg-transparent outline-none placeholder:text-gray-300",
                isSent && "text-gray-400 cursor-default font-normal"
              )}
              placeholder="Email subject"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="relative">
            {bodyEdited && !isSent && (
              <div className="absolute top-2 right-2 z-10 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                <Pencil size={8} />
                Edited
              </div>
            )}

            {isEditingBody && !isSent ? (
              <textarea
                ref={bodyRef}
                value={plainBody}
                onChange={(e) => handleBodyEdit(e.target.value)}
                className="w-full rounded-xl border border-blue-200 bg-white p-4 text-[13px] text-gray-700 leading-relaxed resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                style={{ fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", minHeight: 300 }}
              />
            ) : (
              <div
                onClick={() => !isSent && setIsEditingBody(true)}
                className={cn(
                  "rounded-xl border p-4 text-[13px] leading-relaxed transition-all",
                  isSent
                    ? "border-gray-100 bg-gray-50/50 text-gray-400 cursor-default"
                    : "border-gray-200 bg-gray-50/30 cursor-text hover:border-blue-200 hover:bg-blue-50/10"
                )}
              >
                {/* Render a nice preview */}
                <div className="space-y-3">
                  {/* Accent bar */}
                  <div className={cn("rounded-lg border-l-4 px-4 py-3", accent.borderColor, accent.bgColor)}>
                    <p className="font-semibold text-gray-800 text-sm">{currentTplCfg.label} — {shipment.id}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Automated notification from Zero Touch Booking Agent</p>
                  </div>

                  <p className="text-gray-700">Dear Team,</p>

                  {/* Details table */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-[12px]">
                      <tbody>
                        {[
                          ["Booking ID", shipment.id, true],
                          ["SAP Order", shipment.sapOrderRef],
                          ["Carrier", shipment.carrier],
                          ...(shipment.bookingRef ? [["Booking Ref", shipment.bookingRef, true]] : []),
                          ["Route", `${shipment.origin} → ${shipment.destination}`],
                          ["Container", shipment.containerType],
                          ["Target Ship Date", shipment.targetShipDate, true],
                          ["Status", shipment.bookingStatus],
                        ].map(([label, value, mono], i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-3 py-2 text-gray-400 w-[130px]">{label as string}</td>
                            <td className={cn("px-3 py-2 text-gray-700", mono ? "font-mono" : "")}>
                              {value as string}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Template-specific block */}
                  {activeTemplate === "confirmation" && (
                    <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
                      <p className="text-[12px] text-green-900">
                        <strong>Next Steps:</strong> Please ensure receiving dock is prepared. Cargo documents will follow separately.
                      </p>
                    </div>
                  )}
                  {activeTemplate === "rejection" && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                      <p className="text-[12px] text-red-900">
                        <strong>Action Required:</strong> {shipment.recommendedAction || "Review alternate carriers or escalate for spot booking approval."}
                      </p>
                    </div>
                  )}
                  {activeTemplate === "escalation" && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                      <p className="text-[12px] text-amber-900">
                        <strong>Agent Summary:</strong> {shipment.agentSummary}
                      </p>
                    </div>
                  )}
                  {activeTemplate === "sap-update" && (
                    <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2.5">
                      <p className="text-[12px] text-violet-900">
                        <strong>SAP Reference:</strong> {shipment.sapOrderRef} -- Status updated to {shipment.bookingStatus}
                      </p>
                    </div>
                  )}

                  <hr className="border-gray-200" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    This notification was generated automatically by the Zero Touch Booking Agent.
                    Please do not reply directly to this email.
                  </p>
                </div>

                {!isSent && (
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                    <Pencil size={9} />
                    Click to edit email body
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Attachment mock */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
            <Paperclip size={11} />
            <span>Booking_Summary_{shipment.id}.pdf</span>
            <span className="text-gray-300">·</span>
            <span>18 KB</span>
          </div>
        </div>

        {/* Sent Confirmation Banner */}
        {isSent && (
          <div className="mx-6 mb-3 rounded-xl border border-green-200 bg-green-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <MailCheck size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-800">Email delivered successfully</p>
                  <p className="text-[10px] text-green-700/80">Sent at {sentAt} to {to.split(",").length} recipient{to.split(",").length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-green-700">
                <Clock size={11} />
                <span>Just now</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {sendStatus === "error" && (
          <div className="mx-6 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-800">Failed to send email</p>
                <p className="text-[10px] text-red-600 truncate">{errorMsg}</p>
              </div>
              <button
                onClick={() => setSendStatus("idle")}
                className="text-[10px] text-red-600 hover:text-red-800 font-medium shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2">
            {!isSent && isEditingBody && (
              <button
                onClick={() => setIsEditingBody(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Check size={12} />
                Done Editing
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isSent ? (
              <>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendStatus === "sending" || !to.trim()}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm",
                    sendStatus === "sending"
                      ? "bg-blue-400 text-white cursor-wait"
                      : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
                  )}
                >
                  {sendStatus === "sending" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Email
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Check size={14} />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
