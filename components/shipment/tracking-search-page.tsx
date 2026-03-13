"use client"

import { useState, useEffect, useRef } from "react"
import { SHIPMENTS, CARRIER_SCORECARDS, type Shipment } from "@/lib/mock-data"
import { BookingStatusBadge, CarrierBadge, SeverityBadge, ModeBadge, ExceptionBadge } from "./shared"
import { ShipmentDrawer } from "./shipment-drawer"
import { type SentEmailItem } from "./email-sent-page"
import { cn } from "@/lib/utils"
import {
  ScanSearch, ArrowRight, Clock, AlertTriangle, CheckCircle2,
  Upload, FileText, Brain, Loader2, Check, X, ChevronRight,
  Database, Package, BarChart3, TrendingUp,
} from "lucide-react"

interface TrackingSearchPageProps {
  preselectedId?: string
  onSendNotification?: (email: SentEmailItem) => void
}

// ── SAP Export Upload AI analysis state ──────────────────────────────────────
type UploadStage = "idle" | "file-ready" | "analyzing" | "done"

const ANALYSIS_STEPS = [
  { label: "Reading SAP export", detail: "Parsing order references, material numbers, and booking fields..." },
  { label: "Extracting booking data", detail: "Matching SAP order refs, carrier allocations, container types..." },
  { label: "Cross-referencing carriers", detail: "Querying carrier portals, rate engine, and booking history..." },
]

const ANALYSIS_INSIGHTS = [
  { category: "Carrier Recommendation", result: "Maersk preferred for SHA\u2192LAX \u2014 92% SLA, $2,800 contract rate", type: "carrier" as const },
  { category: "Exception Alert", result: "BKG-50219 \u2014 Carrier rejection detected, re-routing needed", type: "exception" as const },
  { category: "Rate Analysis", result: "CMA-CGM spot rate $3,800 vs contract $3,200 \u2014 approval needed", type: "rate" as const },
  { category: "Capacity Check", result: "Hapag-Lloyd HKG\u2192RTM \u2014 available capacity, 18-day transit", type: "capacity" as const },
  { category: "Booking Status", result: "3 bookings confirmed, 2 pending approval, 1 exception", type: "status" as const },
]

function ThinkingDots() {
  return (
    <span className="inline-flex items-end gap-[3px] ml-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1 h-1 rounded-full bg-indigo-500 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  )
}

export function TrackingSearchPage({ preselectedId, onSendNotification }: TrackingSearchPageProps) {
  const [query, setQuery] = useState("")
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)

  // SAP upload state
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle")
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-open drawer when navigated from another flow
  useEffect(() => {
    if (preselectedId) {
      const s = SHIPMENTS.find((sh) => sh.id === preselectedId)
      if (s) setSelectedShipment(s)
    }
  }, [preselectedId])

  const handleFileSelect = (file: File) => {
    if (!file) return
    setUploadedFileName(file.name)
    setUploadStage("file-ready")
    setAnalysisStep(0)
  }

  const handleAnalyze = () => {
    setUploadStage("analyzing")
    setAnalysisStep(0)
    const step = (n: number) => setTimeout(() => setAnalysisStep(n), n * 750)
    step(1); step(2); step(3)
    setTimeout(() => setUploadStage("done"), 2400)
  }

  const handleOpenTracked = () => {
    const s = SHIPMENTS.find((sh) => sh.id === "BKG-10421")
    if (s) setSelectedShipment(s)
  }

  const handleReset = () => {
    setUploadStage("idle")
    setUploadedFileName(null)
    setAnalysisStep(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const filtered = SHIPMENTS.filter((s) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      s.id.toLowerCase().includes(q) ||
      s.carrier.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.lane.toLowerCase().includes(q) ||
      s.bookingStatus.toLowerCase().includes(q) ||
      s.exceptionType.toLowerCase().includes(q) ||
      s.sapOrderRef.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1100px] mx-auto space-y-5">

        {/* Header + Search */}
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
              <ScanSearch size={20} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Search Bookings</h2>
              <p className="text-xs text-gray-400">Search by ID, carrier, lane, origin, or destination</p>
            </div>
          </div>

          <div className="relative">
            <ScanSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Booking ID (e.g. BKG-10421), carrier, lane, or SAP ref..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
            <span>Quick select:</span>
            {SHIPMENTS.slice(0, 5).map((s) => (
              <button key={s.id} onClick={() => setQuery(s.id)} className="font-mono text-blue-600 hover:underline">{s.id}</button>
            ))}
          </div>

          {/* -- SAP Upload divider -- */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">or upload SAP export for AI analysis</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* -- Upload zone / states -- */}
          {uploadStage === "idle" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
              className={cn(
                "border-2 border-dashed rounded-xl px-6 py-7 text-center transition-colors cursor-pointer",
                dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xml,.csv,.xlsx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />
              <Upload size={22} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">Upload SAP Export for AI Analysis</p>
              <p className="text-[11px] text-gray-400 mt-1">Supports PDF, XML, CSV, XLSX</p>
              <button className="mt-3 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors">
                Browse File
              </button>
            </div>
          )}

          {uploadStage === "file-ready" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{uploadedFileName}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">SAP export detected \u2014 AI analysis ready</p>
                  </div>
                </div>
                <button onClick={handleReset} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={14} /></button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Brain size={13} />
                  Analyze with AI
                </button>
                <button onClick={handleReset} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          )}

          {uploadStage === "analyzing" && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-indigo-600 animate-pulse" />
                <span className="text-xs font-semibold text-indigo-700">Agent analyzing SAP export</span>
                <ThinkingDots />
              </div>
              <div className="space-y-2">
                {ANALYSIS_STEPS.map((step, i) => {
                  const done = analysisStep > i
                  const active = analysisStep === i
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={cn(
                        "w-4 h-4 rounded-full shrink-0 flex items-center justify-center mt-0.5 transition-colors",
                        done ? "bg-green-500" : active ? "bg-indigo-500 animate-pulse" : "bg-gray-200"
                      )}>
                        {done ? <Check size={8} className="text-white" /> : <span className="text-[8px] text-white font-bold">{i + 1}</span>}
                      </div>
                      <div>
                        <p className={cn("text-[11px] font-semibold", done ? "text-green-700" : active ? "text-indigo-700" : "text-gray-400")}>
                          {step.label}
                        </p>
                        {(done || active) && <p className="text-[10px] text-gray-400">{step.detail}</p>}
                      </div>
                      {active && <Loader2 size={11} className="text-indigo-400 animate-spin ml-auto shrink-0 mt-0.5" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {uploadStage === "done" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
              {/* Result header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Check size={14} className="text-green-700" />
                    <span className="text-xs font-bold text-green-800 uppercase tracking-wider">AI Analysis Complete</span>
                  </div>
                  <p className="text-[11px] text-green-700">SAP export <span className="font-mono font-semibold">{uploadedFileName}</span> processed successfully.</p>
                </div>
                <button onClick={handleReset} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={13} /></button>
              </div>

              {/* Extracted booking data */}
              <div className="rounded-lg border border-green-200 bg-white p-3 space-y-1.5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  {[
                    ["SAP Order Ref", "SAP-PO-88442"],
                    ["Booking ID", "BKG-10421"],
                    ["Lane", "SHA\u2192LAX"],
                    ["Carrier", "Maersk"],
                    ["Container Type", "40' HC"],
                    ["Booking Status", "Confirmed"],
                    ["Target Ship Date", "Mar 15, 2025"],
                    ["Contract Rate", "$2,800"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-1.5">
                      <span className="text-gray-400 shrink-0">{k}:</span>
                      <span className="font-semibold text-gray-800">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">AI Booking Insights</p>
                <div className="space-y-1.5">
                  {ANALYSIS_INSIGHTS.map((item) => {
                    const colors = {
                      carrier: { bg: "bg-blue-50 border-blue-200", icon: "text-blue-600" },
                      exception: { bg: "bg-red-50 border-red-200", icon: "text-red-600" },
                      rate: { bg: "bg-amber-50 border-amber-200", icon: "text-amber-600" },
                      capacity: { bg: "bg-green-50 border-green-200", icon: "text-green-600" },
                      status: { bg: "bg-indigo-50 border-indigo-200", icon: "text-indigo-600" },
                    }
                    const c = colors[item.type]
                    const IconComp = item.type === "carrier" ? TrendingUp : item.type === "exception" ? AlertTriangle : item.type === "rate" ? BarChart3 : item.type === "capacity" ? Package : CheckCircle2
                    return (
                      <div key={item.category} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] border", c.bg)}>
                        <IconComp size={12} className={cn(c.icon, "shrink-0")} />
                        <span className="font-semibold shrink-0 w-40 text-gray-700">{item.category}</span>
                        <span className="text-gray-600">{item.result}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Status note */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2">
                <Package size={13} className="text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-800">
                  <span className="font-semibold">8 bookings identified in export.</span>{" "}
                  3 confirmed, 2 awaiting approval, 1 exception requiring action.
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={handleOpenTracked}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                <ScanSearch size={13} />
                Open Booking Detail \u2014 BKG-10421
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {query ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"` : `All Active Bookings \u2014 ${SHIPMENTS.length} total`}
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <ScanSearch size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No bookings match &quot;<span className="font-mono">{query}</span>&quot;</p>
              <p className="text-xs text-gray-400 mt-1">Try BKG-10421, BKG-20334, Maersk...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filtered.map((s) => (
                <BookingCard key={s.id} booking={s} onClick={() => setSelectedShipment(s)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedShipment && (
        <ShipmentDrawer
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onSendNotification={onSendNotification}
        />
      )}
    </div>
  )
}

function BookingCard({ booking: s, onClick }: { booking: Shipment; onClick: () => void }) {
  const isCritical = s.severity === "Critical"
  const hasException = s.exceptionType !== "None"
  const isConfirmed = s.bookingStatus === "Confirmed" || s.bookingStatus === "Notified"
  const completedSteps = s.workflowSteps.filter((ws) => ws.status === "completed").length
  const totalSteps = s.workflowSteps.length
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border text-left p-4 hover:shadow-md hover:border-blue-300 transition-all group",
        isCritical ? "border-red-200 border-l-4 border-l-red-500" :
        s.severity === "High" ? "border-amber-200 border-l-4 border-l-amber-400" :
        isConfirmed ? "border-green-200 border-l-4 border-l-green-400" :
        "border-gray-200"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-blue-700 text-sm">{s.id}</span>
          <ModeBadge mode={s.mode} />
          <SeverityBadge severity={s.severity} />
          <BookingStatusBadge status={s.bookingStatus} />
        </div>
        <ArrowRight size={15} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Route / Lane */}
      <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium mb-1">
        <span className="truncate">{s.origin.split(",")[0]}</span>
        <ArrowRight size={12} className="text-gray-400 shrink-0" />
        <span className="truncate">{s.destination.split(",")[0]}</span>
      </div>
      <div className="text-[11px] text-gray-400 mb-3">
        <CarrierBadge carrier={s.carrier} />
        <span className="ml-2">{s.lane} \u00b7 {s.containerType}</span>
      </div>

      {/* Status */}
      <div className="text-xs text-gray-600 mb-3 line-clamp-1">{s.currentStatus}</div>

      {/* Footer row */}
      <div className="flex items-center gap-2 flex-wrap">
        {hasException && <ExceptionBadge type={s.exceptionType} />}
        {isConfirmed ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
            <CheckCircle2 size={11} /> Booking confirmed
          </span>
        ) : s.bookingStatus === "Exception" ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
            <AlertTriangle size={11} /> Needs attention
          </span>
        ) : s.bookingStatus === "Awaiting Approval" ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
            <Clock size={11} /> Awaiting approval
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
            <Database size={11} /> In progress
          </span>
        )}
        {s.severity === "Critical" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5 ml-auto">
            <AlertTriangle size={10} /> Action required
          </span>
        )}
      </div>

      {/* Workflow progress */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-[11px] text-gray-400">
        <span>Workflow: <span className="font-semibold text-gray-600">{completedSteps}/{totalSteps} steps</span></span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", progressPct === 100 ? "bg-green-500" : progressPct >= 50 ? "bg-blue-500" : "bg-amber-500")}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="font-mono text-gray-500">{progressPct}%</span>
      </div>
    </button>
  )
}
