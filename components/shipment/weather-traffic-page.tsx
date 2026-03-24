"use client"

import { useEffect, useRef, useState } from "react"
import { PORTAL_STATUSES, BOOKING_REQUESTS, type PortalStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import {
  Globe, Shield, Clock, AlertTriangle, CheckCircle2, XCircle,
  Wifi, WifiOff, Bot, Key, Server, Activity, Brain, Zap, Ban, Package,
  ArrowRight, Loader2, Link2,
} from "lucide-react"

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PortalStatus["status"], { color: string; dot: string; icon: React.ReactNode; label: string }> = {
  Online:   { color: "text-green-700 bg-green-50 border-green-200",  dot: "bg-green-500",            icon: <CheckCircle2 size={12} className="text-green-600" />, label: "Online" },
  Degraded: { color: "text-amber-700 bg-amber-50 border-amber-200",  dot: "bg-amber-500 animate-pulse", icon: <AlertTriangle size={12} className="text-amber-600" />, label: "Degraded" },
  Offline:  { color: "text-red-700 bg-red-50 border-red-200",        dot: "bg-red-500 animate-pulse",   icon: <XCircle size={12} className="text-red-600" />, label: "Offline" },
}

const CRED_CONFIG: Record<PortalStatus["credentialStatus"], { color: string; label: string }> = {
  Valid:          { color: "text-green-700 bg-green-50 border-green-200", label: "Valid" },
  "Expiring Soon": { color: "text-amber-700 bg-amber-50 border-amber-200", label: "Expiring Soon" },
  Expired:        { color: "text-red-700 bg-red-50 border-red-200",       label: "Expired" },
}

const UPTIME_COLOR = (pct: number) =>
  pct >= 99.5 ? "bg-green-500" : pct >= 98 ? "bg-green-400" : pct >= 95 ? "bg-amber-400" : "bg-red-500"

// Separate system portals from carrier portals
const systemPortals = PORTAL_STATUSES.filter((p) => p.carrier === "SAP" || p.carrier === "OTM")
const carrierPortals = PORTAL_STATUSES.filter((p) => p.carrier !== "SAP" && p.carrier !== "OTM")

// Count statuses
const onlineCount = PORTAL_STATUSES.filter((p) => p.status === "Online").length
const degradedCount = PORTAL_STATUSES.filter((p) => p.status === "Degraded").length
const offlineCount = PORTAL_STATUSES.filter((p) => p.status === "Offline").length

// Agent capability counts (carrier portals only)
const autoBookableCount = carrierPortals.filter((p) => p.apiAvailable && p.credentialStatus === "Valid").length
const degradedPortalCount = carrierPortals.filter((p) => p.status === "Degraded").length
const blockedCount = carrierPortals.filter((p) => p.status === "Offline" || p.credentialStatus === "Expired").length

// Bookings affected by portal issues
const affectedBookings = BOOKING_REQUESTS.filter((b) =>
  b.exceptionType === "Portal Unavailable" || b.exceptionType === "Credentials Expired"
)

// ─── Component ───────────────────────────────────────────────────────────────

interface CarrierPortalStatusPageProps {
  highlightShipmentId?: string
  showBackupConnection?: boolean
  onBackupConnectionDone?: () => void
}

export function WeatherTrafficPage({ highlightShipmentId, showBackupConnection, onBackupConnectionDone }: CarrierPortalStatusPageProps) {
  const highlightRef = useRef<HTMLDivElement | null>(null)

  // Determine which portal to highlight based on a booking's carrier
  const highlightCarrier = highlightShipmentId
    ? BOOKING_REQUESTS.find((b) => b.id === highlightShipmentId)?.carrier
    : null

  const backupRef = useRef<HTMLDivElement | null>(null)
  const [backupPhase, setBackupPhase] = useState<"connecting" | "connected" | null>(showBackupConnection ? "connecting" : null)

  useEffect(() => {
    if (highlightCarrier && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightCarrier])

  // Backup connection animation sequence
  useEffect(() => {
    if (!showBackupConnection) return
    setBackupPhase("connecting")
    // Scroll to backup card
    const scrollT = setTimeout(() => {
      backupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 300)
    // Mark connected after 1s
    const connT = setTimeout(() => setBackupPhase("connected"), 1200)
    // Auto-return after 2s total
    const returnT = setTimeout(() => {
      onBackupConnectionDone?.()
    }, 2500)
    return () => { clearTimeout(scrollT); clearTimeout(connT); clearTimeout(returnT) }
  }, [showBackupConnection, onBackupConnectionDone])

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1100px] mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Globe size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Carrier Portal Status</h2>
              <p className="text-xs text-gray-400">Carrier portals, system integrations, and credential health</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-green-600 font-semibold bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {onlineCount} Online
            </span>
            {degradedCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {degradedCount} Degraded
              </span>
            )}
            {offlineCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 font-semibold bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {offlineCount} Offline
              </span>
            )}
          </div>
        </div>

        {/* Agent Readiness Panel */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={15} className="text-indigo-600" />
            <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Agent Booking Capability</h3>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-green-600 font-semibold bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Agent Active
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-green-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                <Zap size={16} className="text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{autoBookableCount}</div>
                <div className="text-[11px] font-medium text-gray-600">Auto-bookable</div>
                <div className="text-[10px] text-gray-400">API + valid credentials</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-amber-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Activity size={16} className="text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{degradedPortalCount}</div>
                <div className="text-[11px] font-medium text-gray-600">Degraded</div>
                <div className="text-[10px] text-gray-400">RPA fallback active</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-red-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Ban size={16} className="text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{blockedCount}</div>
                <div className="text-[11px] font-medium text-gray-600">Blocked</div>
                <div className="text-[10px] text-gray-400">Manual booking required</div>
              </div>
            </div>
          </div>

          {/* Affected bookings by portal issues */}
          {affectedBookings.length > 0 && (
            <div className="mt-4 pt-4 border-t border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <Package size={12} className="text-indigo-500" />
                <span className="text-[11px] font-semibold text-indigo-700">{affectedBookings.length} Booking{affectedBookings.length !== 1 ? "s" : ""} Blocked by Portal/API Unavailability</span>
                <span className="text-[9px] text-indigo-400 font-normal">· Req. type #2</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {affectedBookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-1.5 bg-white border border-red-200 rounded-full px-2.5 py-1 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="font-mono font-bold text-red-700">{b.id}</span>
                    <span className="text-gray-500">{b.carrier}</span>
                    <span className="text-red-500">· {b.exceptionType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Integration Cards (SAP TM / OTM) */}
        <div>
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">System Integrations</h3>
          <div className="grid grid-cols-2 gap-3">
            {systemPortals.map((portal) => {
              const statusCfg = STATUS_CONFIG[portal.status]
              const credCfg = CRED_CONFIG[portal.credentialStatus]
              return (
                <div key={portal.portal} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                        <Server size={14} className="text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{portal.portal}</div>
                        <div className="text-[10px] text-gray-400">{portal.carrier}</div>
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5", statusCfg.color)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Wifi size={10} className={portal.apiAvailable ? "text-green-500" : "text-red-500"} />
                      <span className="text-gray-500">API</span>
                      <span className={cn("w-1.5 h-1.5 rounded-full", portal.apiAvailable ? "bg-green-500" : "bg-red-500")} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bot size={10} className={portal.rpaAvailable ? "text-green-500" : "text-gray-300"} />
                      <span className="text-gray-500">RPA</span>
                      <span className={cn("w-1.5 h-1.5 rounded-full", portal.rpaAvailable ? "bg-green-500" : "bg-gray-300")} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <Activity size={10} />
                      <span>Uptime: <span className="font-mono font-semibold text-gray-700">{portal.uptime}%</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <Clock size={10} />
                      <span>{portal.lastChecked}</span>
                    </div>
                  </div>

                  {/* Uptime bar */}
                  <div className="mt-2 w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", UPTIME_COLOR(portal.uptime))} style={{ width: `${portal.uptime}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Backup Connection Card (shown during portal failure switch) */}
        {backupPhase && (
          <div ref={backupRef} className="animate-in fade-in slide-in-from-top-3 duration-500">
            <div className={cn(
              "rounded-xl border-2 p-4 transition-all duration-700",
              backupPhase === "connecting"
                ? "border-blue-400 bg-blue-50/50 ring-2 ring-blue-200 shadow-lg"
                : "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-200 shadow-lg"
            )}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-500",
                  backupPhase === "connecting" ? "bg-blue-100 border border-blue-300" : "bg-emerald-100 border border-emerald-300"
                )}>
                  <Link2 size={18} className={backupPhase === "connecting" ? "text-blue-600" : "text-emerald-600"} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">INTTRA EDI Channel</span>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      backupPhase === "connecting"
                        ? "bg-blue-100 text-blue-700 border-blue-300"
                        : "bg-emerald-100 text-emerald-700 border-emerald-300"
                    )}>
                      {backupPhase === "connecting" ? "Connecting..." : "Backup Active"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">EDI backup channel for Maersk bookings — 99.9% uptime</p>
                </div>
                {backupPhase === "connecting" ? (
                  <Loader2 size={18} className="text-blue-500 animate-spin" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                )}
              </div>

              {/* Connection details */}
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Protocol</div>
                  <div className="font-semibold text-gray-700">INTTRA EDI</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Uptime</div>
                  <div className="font-semibold text-emerald-700">99.9%</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Status</div>
                  <div className="flex items-center gap-1">
                    {backupPhase === "connecting" ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-semibold text-blue-600">Establishing</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-emerald-600">Connected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Flow arrow: Maersk Portal (down) → INTTRA EDI (active) */}
              {backupPhase === "connected" && (
                <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center gap-2 text-[11px] animate-in fade-in duration-300">
                  <span className="text-red-500 font-semibold line-through">Maersk Portal</span>
                  <ArrowRight size={12} className="text-gray-400" />
                  <span className="text-emerald-700 font-bold">INTTRA EDI</span>
                  <span className="text-gray-400 ml-1">· Booking rerouted successfully</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Carrier Portal Cards */}
        <div>
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Carrier Booking Portals</h3>
          <div className="grid grid-cols-2 gap-3">
            {carrierPortals.map((portal) => {
              const statusCfg = STATUS_CONFIG[portal.status]
              const credCfg = CRED_CONFIG[portal.credentialStatus]
              const isHighlighted = highlightCarrier === portal.carrier
              return (
                <div
                  key={portal.portal}
                  ref={isHighlighted ? highlightRef : null}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all duration-500",
                    isHighlighted
                      ? "border-blue-400 ring-2 ring-blue-200 shadow-md"
                      : "border-gray-200"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                        <Globe size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{portal.portal}</div>
                        <div className="text-[10px] text-gray-400">{portal.carrier}</div>
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5", statusCfg.color)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {isHighlighted && (
                    <div className="mb-2 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 inline-block">
                      Relevant portal for selected booking
                    </div>
                  )}

                  {/* Agent capability badge */}
                  {(() => {
                    const canAutoBook = portal.apiAvailable && portal.credentialStatus === "Valid"
                    const isBlocked = portal.status === "Offline" || portal.credentialStatus === "Expired"
                    return (
                      <div className={cn(
                        "mb-3 inline-flex items-center gap-1.5 text-[10px] font-semibold rounded-full px-2.5 py-1 border",
                        canAutoBook
                          ? "bg-green-50 border-green-200 text-green-700"
                          : isBlocked
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      )}>
                        <Brain size={9} />
                        {canAutoBook ? "Agent: Auto-book enabled" : isBlocked ? "Agent: Blocked — manual required" : "Agent: RPA fallback"}
                      </div>
                    )
                  })()}

                  {/* Availability indicators */}
                  <div className="grid grid-cols-3 gap-3 text-[11px] mb-3">
                    <div className="flex items-center gap-1.5">
                      {portal.apiAvailable ? (
                        <Wifi size={10} className="text-green-500" />
                      ) : (
                        <WifiOff size={10} className="text-red-500" />
                      )}
                      <span className="text-gray-500">API</span>
                      <span className={cn("w-1.5 h-1.5 rounded-full", portal.apiAvailable ? "bg-green-500" : "bg-red-500")} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bot size={10} className={portal.rpaAvailable ? "text-green-500" : "text-red-500"} />
                      <span className="text-gray-500">RPA</span>
                      <span className={cn("w-1.5 h-1.5 rounded-full", portal.rpaAvailable ? "bg-green-500" : "bg-red-500")} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Key size={10} className={
                        portal.credentialStatus === "Valid" ? "text-green-500" :
                        portal.credentialStatus === "Expiring Soon" ? "text-amber-500" : "text-red-500"
                      } />
                      <span className={cn("text-[10px] font-semibold border rounded-full px-1.5 py-0.5", credCfg.color)}>
                        {credCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Uptime bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-gray-400 w-12 shrink-0">Uptime</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", UPTIME_COLOR(portal.uptime))} style={{ width: `${portal.uptime}%` }} />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-gray-700 w-12 text-right">{portal.uptime}%</span>
                  </div>

                  {/* Last checked */}
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Clock size={10} />
                    <span>Checked {portal.lastChecked}</span>
                  </div>

                  {/* Notes (warning banner) */}
                  {portal.notes && (
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
                      <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800 leading-relaxed">{portal.notes}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Health Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-blue-600" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Integration Health Summary</h3>
          </div>
          <div className="space-y-2">
            {PORTAL_STATUSES.map((portal) => {
              const statusCfg = STATUS_CONFIG[portal.status]
              const credCfg = CRED_CONFIG[portal.credentialStatus]
              return (
                <div key={portal.portal} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-600 w-44 shrink-0 truncate">{portal.portal}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold w-20 text-center", statusCfg.color)}>
                    {statusCfg.label}
                  </span>
                  <div className="flex items-center gap-1 w-14">
                    <span className={cn("w-1.5 h-1.5 rounded-full", portal.apiAvailable ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-[10px] text-gray-400">API</span>
                  </div>
                  <div className="flex items-center gap-1 w-14">
                    <span className={cn("w-1.5 h-1.5 rounded-full", portal.rpaAvailable ? "bg-green-500" : "bg-gray-300")} />
                    <span className="text-[10px] text-gray-400">RPA</span>
                  </div>
                  <span className={cn("text-[10px] font-semibold border rounded-full px-1.5 py-0.5", credCfg.color)}>
                    {credCfg.label}
                  </span>
                  <span className="font-mono text-gray-500 flex-1 text-right">{portal.uptime}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
