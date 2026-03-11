"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { Shipment } from "@/lib/mock-data"
import { type SentEmailItem } from "./email-sent-page"
import { cn } from "@/lib/utils"
import {
  X, Send, Copy, Check, Loader2, AlertCircle,
  ChevronDown, Paperclip, Clock, MailCheck, Pencil,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailComposerProps {
  shipment: Shipment
  onClose: () => void
  onSent: () => void
  onSendNotification?: (email: SentEmailItem) => void
}

type SendStatus = "idle" | "sending" | "sent" | "error"

// ─── Helper: generate default recipients ──────────────────────────────────────

function getDefaultRecipients(severity: string) {
  if (severity === "Critical") return "router@company.com, coordinator@company.com, plant-team@company.com"
  if (severity === "High") return "router@company.com, coordinator@company.com"
  return "router@company.com"
}

// ─── Helper: generate HTML email body ─────────────────────────────────────────

function generateEmailHTML(s: Shipment): string {
  return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #f8f9fa; border-left: 4px solid ${s.severity === "Critical" ? "#dc2626" : s.severity === "High" ? "#f59e0b" : "#3b82f6"}; padding: 16px 20px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
    <h2 style="margin: 0 0 4px 0; font-size: 16px; color: #1a1a1a;">Shipment Delay Alert — ${s.id}</h2>
    <p style="margin: 0; font-size: 13px; color: #6b7280;">Automated notification from Shipment Tracking Agent</p>
  </div>

  <p style="font-size: 14px; line-height: 1.6; color: #374151;">Dear Team,</p>
  <p style="font-size: 14px; line-height: 1.6; color: #374151;">
    Shipment <strong>${s.id}</strong> is experiencing a delay. The ETA has been revised and requires your attention.
  </p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; color: #6b7280; width: 140px;">Shipment ID</td>
      <td style="padding: 8px 12px; font-family: monospace; font-weight: 600;">${s.id}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; color: #6b7280;">Carrier / Tracking</td>
      <td style="padding: 8px 12px;">${s.carrier} · ${s.trackingRef}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; color: #6b7280;">Route</td>
      <td style="padding: 8px 12px;">${s.origin} → ${s.destination}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; color: #6b7280;">Planned ETA</td>
      <td style="padding: 8px 12px; font-family: monospace;">${s.plannedETA}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; color: #6b7280;">Revised ETA</td>
      <td style="padding: 8px 12px; font-family: monospace; color: #dc2626; font-weight: 600;">${s.revisedETA}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; color: #6b7280;">Delay</td>
      <td style="padding: 8px 12px; font-weight: 600; color: ${s.delayHours > 12 ? "#dc2626" : "#f59e0b"};">+${s.delayHours}h</td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; color: #6b7280;">Severity</td>
      <td style="padding: 8px 12px;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: ${s.severity === "Critical" ? "#fef2f2" : s.severity === "High" ? "#fffbeb" : "#f0f9ff"}; color: ${s.severity === "Critical" ? "#dc2626" : s.severity === "High" ? "#d97706" : "#2563eb"};">${s.severity}</span></td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; color: #6b7280;">Reason</td>
      <td style="padding: 8px 12px;">${s.reasonChips.map((c) => c.label).join(", ")}</td>
    </tr>
  </table>

  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
    <p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Business Impact:</strong> ${s.businessImpact}</p>
  </div>

  ${s.disruptionContext ? `
  <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
    <p style="margin: 0; font-size: 13px; color: #9a3412;"><strong>Disruption Context:</strong> ${s.disruptionContext}</p>
  </div>
  ` : ""}

  <p style="font-size: 14px; line-height: 1.6; color: #374151;">
    <strong>Recommended Action:</strong> ${s.recommendedAction}
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="font-size: 11px; color: #9ca3af; line-height: 1.5;">
    This notification was generated automatically by the Shipment Tracking Agent.<br/>
    Please do not reply directly to this email. For questions, contact logistics-ops@company.com.
  </p>
</div>`.trim()
}

// ─── Helper: HTML to plain text preview ───────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmailComposer({ shipment, onClose, onSent, onSendNotification }: EmailComposerProps) {
  const [to, setTo] = useState(getDefaultRecipients(shipment.severity))
  const [cc, setCc] = useState("logistics-ops@company.com")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState(
    `Delay Alert — Shipment ${shipment.id} — Revised ETA +${shipment.delayHours}h`
  )

  const htmlBody = useRef(generateEmailHTML(shipment))
  const [plainBody, setPlainBody] = useState(() => htmlToPlainPreview(htmlBody.current))
  const [isEditingBody, setIsEditingBody] = useState(false)
  const [bodyEdited, setBodyEdited] = useState(false)

  const [showBcc, setShowBcc] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [copied, setCopied] = useState(false)
  const [sentAt, setSentAt] = useState("")

  const bodyRef = useRef<HTMLTextAreaElement>(null)

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
    // When user edits, we'll send the plain-text version wrapped in minimal HTML
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
    // Simulate sending (no external email service required)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const now = new Date()
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    setSendStatus("sent")
    setSentAt(timeStr)
    // Register in Sent page
    const email: SentEmailItem = {
      id: `SE-${Date.now()}`,
      to: to.split(",")[0]?.trim() || to,
      toName: to.split(",")[0]?.trim() || "Recipient",
      subject,
      body: plainBody,
      timestamp: now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      shipmentId: shipment.id,
      tag: "delay",
    }
    onSendNotification?.(email)
    onSent()
  }

  const isSent = sendStatus === "sent"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] overflow-hidden">

        {/* ── Header ── */}
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
                {isSent ? "Email Sent" : "Compose Delay Alert"}
              </h3>
              <p className="text-[11px] text-gray-400">
                {isSent ? `Delivered at ${sentAt}` : `Shipment ${shipment.id} · ${shipment.severity} Severity`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSent && (
              <span className="text-[10px] rounded-full bg-blue-50 text-blue-600 px-2.5 py-0.5 font-medium">
                Editable
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Email Fields ── */}
        <div className="px-6 py-3 space-y-0 border-b border-gray-100 shrink-0">
          {/* To */}
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

          {/* CC */}
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

          {/* BCC (toggle) */}
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

          {/* Subject */}
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

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="relative">
            {/* Edit indicator */}
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
                  {/* Severity accent bar */}
                  <div className={cn(
                    "rounded-lg border-l-4 px-4 py-3",
                    shipment.severity === "Critical" ? "border-l-red-500 bg-red-50/50" :
                      shipment.severity === "High" ? "border-l-amber-400 bg-amber-50/50" :
                        "border-l-blue-500 bg-blue-50/50"
                  )}>
                    <p className="font-semibold text-gray-800 text-sm">Shipment Delay Alert — {shipment.id}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Automated notification from Shipment Tracking Agent</p>
                  </div>

                  <p className="text-gray-700">Dear Team,</p>
                  <p className="text-gray-700">
                    Shipment <strong className="text-gray-900">{shipment.id}</strong> is experiencing a delay.
                    The ETA has been revised and requires your attention.
                  </p>

                  {/* Details table */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-[12px]">
                      <tbody>
                        {[
                          ["Shipment ID", shipment.id, true],
                          ["Carrier / Tracking", `${shipment.carrier} · ${shipment.trackingRef}`],
                          ["Route", `${shipment.origin} → ${shipment.destination}`],
                          ["Planned ETA", shipment.plannedETA, true],
                          ["Revised ETA", shipment.revisedETA, true, true],
                          ["Delay", `+${shipment.delayHours}h`, false, shipment.delayHours > 12],
                          ["Severity", shipment.severity],
                          ["Reason", shipment.reasonChips.map((c) => c.label).join(", ")],
                        ].map(([label, value, mono, highlight], i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-3 py-2 text-gray-400 w-[130px]">{label as string}</td>
                            <td className={cn(
                              "px-3 py-2",
                              mono ? "font-mono" : "",
                              highlight ? "text-red-600 font-semibold" : "text-gray-700"
                            )}>
                              {value as string}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Business impact */}
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                    <p className="text-[12px] text-amber-900">
                      <strong>Business Impact:</strong> {shipment.businessImpact}
                    </p>
                  </div>

                  {/* Disruption context */}
                  {shipment.disruptionContext && (
                    <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2.5">
                      <p className="text-[12px] text-orange-900">
                        <strong>Disruption Context:</strong> {shipment.disruptionContext}
                      </p>
                    </div>
                  )}

                  <p className="text-gray-700">
                    <strong>Recommended Action:</strong> {shipment.recommendedAction}
                  </p>

                  <hr className="border-gray-200" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    This notification was generated automatically by the Shipment Tracking Agent.
                    Please do not reply directly to this email.
                  </p>
                </div>

                {/* Click to edit hint */}
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
            <span>Shipment_Report_{shipment.id}.pdf</span>
            <span className="text-gray-300">·</span>
            <span>24 KB</span>
          </div>
        </div>

        {/* ── Sent Confirmation Banner ── */}
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

        {/* ── Error Banner ── */}
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

        {/* ── Footer Actions ── */}
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
