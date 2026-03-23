"use client"

import { useState } from "react"
import { Sidebar, type SidebarView } from "./sidebar"
import { TopBar } from "./top-bar"
import { Dashboard } from "./dashboard"
import { ExceptionWorkbench } from "./exception-workbench"
import { AgentActivityLog, type DynamicActivity } from "./agent-activity-log"
import { AnalyticsPage } from "./analytics-page"
import { DocumentsPage } from "./documents-page"
import { WeatherTrafficPage } from "./weather-traffic-page"
import { TimelinePage } from "./timeline-page"
import { EmailInboxPage } from "./email-inbox-page"
import { EmailSentPage, type SentEmailItem } from "./email-sent-page"
import { CarrierScorecardPage } from "./carrier-scorecard-page"
import { TrackingSearchPage } from "./tracking-search-page"
import { BookingPipeline } from "./booking-pipeline"
import { AutomationRulesPage } from "./automation-rules"
import { RateIntelligencePage } from "./rate-intelligence"
import { SearchResultsPage } from "./search-results-page"
import { AIChatPanel } from "./ai-chat-panel"
import { BOOKING_REQUESTS, INBOX_EMAILS } from "@/lib/mock-data"
import { type Persona } from "./login-page"

export type SimulationPhase =
  | "idle"
  | "email-analyzing"
  | "email-order-detected"
  | "email-finding-routes"
  | "email-routes-ready"
  | "email-ready"
  | "transitioning"
  | "pipeline-ingested"
  | "pipeline-carrier"
  | "pipeline-portal"
  | "pipeline-submitted"
  | "pipeline-docs"
  | "pipeline-confirmed"
  | "complete"

export function AppShell({ persona }: { persona?: Persona }) {
  const [view, setView] = useState<SidebarView>("dashboard")
  const [viewHistory, setViewHistory] = useState<Array<{ view: SidebarView; openShipmentId?: string }>>([])
  const [backOpenShipmentId, setBackOpenShipmentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sentEmails, setSentEmails] = useState<SentEmailItem[]>([])
  const [trackingPreselect, setTrackingPreselect] = useState<string | null>(null)
  const [weatherHighlightId, setWeatherHighlightId] = useState<string | null>(null)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [etaApprovedCount, setEtaApprovedCount] = useState(3)
  const [readEmailIds, setReadEmailIds] = useState<Set<string>>(new Set())
  const [resolvedExceptionIds, setResolvedExceptionIds] = useState<Set<string>>(new Set())
  const [dynamicActivities, setDynamicActivities] = useState<DynamicActivity[]>([])
  const [simPhase, setSimPhase] = useState<SimulationPhase>("idle")

  const handleEtaApproved = () => setEtaApprovedCount((prev) => prev + 1)

  const addActivity = (description: string, actionType: DynamicActivity["actionType"], shipmentId?: string) => {
    const now = new Date()
    const ts = `${now.toLocaleDateString("en", { month: "short", day: "numeric" })}, ${now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    setDynamicActivities((prev) => [{
      id: `DYN-${Date.now()}`,
      description,
      actionType,
      timestamp: ts,
      shipmentId,
    }, ...prev])
  }

  const handleMarkEmailRead = (emailId: string) => {
    setReadEmailIds((prev) => new Set([...prev, emailId]))
  }

  const handleExceptionResolved = (shipmentId: string) => {
    setResolvedExceptionIds((prev) => new Set([...prev, shipmentId]))
    const booking = BOOKING_REQUESTS.find((b) => b.id === shipmentId)
    if (booking) {
      addActivity(`Exception resolved for ${shipmentId} — ${booking.exceptionType}`, "confirmed", shipmentId)
    }
  }

  const handleResumeWorkflow = (shipmentId: string) => {
    addActivity(`Workflow resumed for ${shipmentId} — agent proceeding to next step`, "booking_submit", shipmentId)
  }

  const handleStartSimulation = () => {
    setSimPhase("email-analyzing")
    setTimeout(() => setSimPhase("email-order-detected"), 2500)
  }

  const handleFindRoutes = () => {
    setSimPhase("email-finding-routes")
    setTimeout(() => setSimPhase("email-routes-ready"), 1500)
  }

  const handleConfirmRoute = () => {
    setSimPhase("email-ready")
  }

  const handleFullAuto = () => {
    setSimPhase("transitioning")
    handleViewChange("booking-pipeline")
    setTimeout(() => setSimPhase("pipeline-ingested"), 500)
  }

  const handleExecuteSimulation = () => {
    setSimPhase("transitioning")
    handleViewChange("booking-pipeline")
    setTimeout(() => setSimPhase("pipeline-ingested"), 500)
  }

  const handleSimPhaseChange = (phase: SimulationPhase) => {
    setSimPhase(phase)
    if (phase === "pipeline-confirmed") {
      addActivity("Zero-touch booking BKG-SIM-01 completed (NGB→HAM) — Maersk confirmed", "confirmed", "BKG-SIM-01")
      setTimeout(() => setSimPhase("complete"), 3000)
    }
  }

  const exceptionsCount = BOOKING_REQUESTS.filter((s) => s.bookingStatus === "Exception" || s.bookingStatus === "Awaiting Approval").filter((s) => !resolvedExceptionIds.has(s.id)).length
  const unreadInboxCount = INBOX_EMAILS.filter((e) => !e.read && !readEmailIds.has(e.id)).length

  const handleViewChange = (v: SidebarView) => {
    setViewHistory((prev) => [...prev, { view }])
    setView(v)
    setSearchQuery("")
    if (v !== "tracking-search") setTrackingPreselect(null)
    if (v !== "weather-traffic") setWeatherHighlightId(null)
    setBackOpenShipmentId(null)
  }

  const handleBack = () => {
    if (viewHistory.length === 0) return
    const entry = viewHistory[viewHistory.length - 1]
    setViewHistory((h) => h.slice(0, -1))
    setView(entry.view)
    setBackOpenShipmentId(entry.openShipmentId ?? null)
    setSearchQuery("")
  }

  const handleSendNotification = (email: SentEmailItem) => {
    setSentEmails((prev) => [email, ...prev])
  }

  const handleOpenWeather = (shipmentId: string) => {
    setWeatherHighlightId(shipmentId)
    setViewHistory((prev) => [...prev, { view, openShipmentId: shipmentId }])
    setView("weather-traffic")
    setSearchQuery("")
    setBackOpenShipmentId(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* Left sidebar */}
      <Sidebar
        view={view}
        onViewChange={handleViewChange}
        exceptionsCount={exceptionsCount || undefined}
        unreadInboxCount={unreadInboxCount || undefined}
        persona={persona}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          onSearch={setSearchQuery}
          onToggleAIChat={() => setAiChatOpen((prev) => !prev)}
          aiChatOpen={aiChatOpen}
          canGoBack={viewHistory.length > 0}
          onBack={handleBack}
        />

        {/* Search results overlay — shown when typing in search bar */}
        {searchQuery.trim() ? (
          <SearchResultsPage
            query={searchQuery}
            onOpenWeather={handleOpenWeather}
            onSendNotification={handleSendNotification}
          />
        ) : (
          <>
            {view === "dashboard" && (
              <Dashboard
                searchQuery={searchQuery}
                onViewChange={handleViewChange}
                onOpenWeather={handleOpenWeather}
                onSendNotification={handleSendNotification}
                autoOpenShipmentId={backOpenShipmentId ?? undefined}
                onEtaApproved={handleEtaApproved}
                etaUpdatedCount={etaApprovedCount}
              />
            )}

            {view === "analytics" && <AnalyticsPage etaUpdatedCount={etaApprovedCount} />}

            {view === "booking-pipeline" && (
              <BookingPipeline onSendNotification={handleSendNotification} onViewChange={handleViewChange} simPhase={simPhase} onSimPhaseChange={handleSimPhaseChange} />
            )}

            {view === "tracking-search" && (
              <TrackingSearchPage
                preselectedId={trackingPreselect ?? undefined}
                onSendNotification={handleSendNotification}
              />
            )}

            {view === "carrier-scorecard" && <CarrierScorecardPage />}

            {view === "exceptions" && (
              <ExceptionWorkbench
                onSendNotification={handleSendNotification}
                onOpenWeather={handleOpenWeather}
                onExceptionResolved={handleExceptionResolved}
              />
            )}

            {view === "documents" && <DocumentsPage />}

            {view === "weather-traffic" && (
              <WeatherTrafficPage highlightShipmentId={weatherHighlightId ?? undefined} />
            )}

            {view === "timeline" && <TimelinePage />}

            {view === "email-inbox" && (
              <EmailInboxPage
                onOpenTracking={(id) => {
                  setTrackingPreselect(id)
                  handleViewChange("tracking-search")
                }}
                onMarkRead={handleMarkEmailRead}
                simPhase={simPhase}
                onStartSimulation={handleStartSimulation}
                onExecuteSimulation={handleExecuteSimulation}
                onFindRoutes={handleFindRoutes}
                onConfirmRoute={handleConfirmRoute}
                onFullAuto={handleFullAuto}
              />
            )}

            {view === "email-sent" && <EmailSentPage dynamicEmails={sentEmails} />}

            {view === "automation-rules" && <AutomationRulesPage />}

            {view === "rate-intelligence" && <RateIntelligencePage />}

            {view === "agent-activity" && (
              <AgentActivityLog
                onShipmentClick={() => handleViewChange("dashboard")}
                dynamicActivities={dynamicActivities}
              />
            )}
          </>
        )}
      </div>

      {/* AI Chat Panel — fixed right-side overlay */}
      <AIChatPanel
        open={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        onOpenWeather={handleOpenWeather}
        onSendNotification={handleSendNotification}
      />
    </div>
  )
}
