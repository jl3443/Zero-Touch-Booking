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
import { SearchResultsPage } from "./search-results-page"
import { AIChatPanel } from "./ai-chat-panel"
import { BOOKING_REQUESTS, INBOX_EMAILS, DEMO_SHIPMENT, DEMO_SCENARIOS, type BookingRequest } from "@/lib/mock-data"
import { SapSimulationPage } from "./sap-simulation-page"
import { type Persona } from "./login-page"

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

  // ── Demo mode state ──
  const [demoActive, setDemoActive] = useState(false)
  const [demoStep, setDemoStep] = useState(0) // 0 = not started, 1-8 = current step, 9 = complete
  const [demoPaused, setDemoPaused] = useState(false)
  const [demoScenario, setDemoScenario] = useState("happy-path")
  const [demoShipmentVisible, setDemoShipmentVisible] = useState(false)
  const [demoExceptionActive, setDemoExceptionActive] = useState(false)
  const [demoZoomActive, setDemoZoomActive] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [demoElapsedTime, setDemoElapsedTime] = useState("0s")
  const [dynamicInboxEmails, setDynamicInboxEmails] = useState<Array<{ id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }>>([])
  const [sapAutoOpenOrderId, setSapAutoOpenOrderId] = useState<string | null>(null)
  const [emailAutoSelectId, setEmailAutoSelectId] = useState<string | null>(null)
  const [demoReturnedFromInbox, setDemoReturnedFromInbox] = useState(false)

  const handleAddInboxEmail = (email: typeof dynamicInboxEmails[0]) => {
    setDynamicInboxEmails((prev) => [email, ...prev])
  }

  const handleDemoComplete = (elapsedTime: string) => {
    setDemoElapsedTime(elapsedTime)
    // Trigger dashboard zoom + completion modal
    setView("dashboard")
    setDemoZoomActive(true)
    setTimeout(() => {
      setDemoZoomActive(false)
      setShowCompletionModal(true)
    }, 3500) // 1s zoom in + 1.5s hold + 1s zoom out
  }

  const handleStartDemo = (scenarioId: string) => {
    setDemoScenario(scenarioId)
    setDemoActive(true)
    setDemoStep(0)
    setDemoPaused(false)
    setDemoShipmentVisible(true)
    setDemoExceptionActive(false)
    setView("dashboard")
    setSearchQuery("")
    addActivity("Demo mode started — new shipment detected from SAP TM", "ingested", "BKG-NEW-001")
  }

  const handleStopDemo = () => {
    setDemoActive(false)
    setDemoStep(0)
    setDemoPaused(false)
    setDemoShipmentVisible(false)
    setDemoExceptionActive(false)
  }

  const STEP_LABELS = [
    "", "Read Shipment", "Carrier Selection", "Portal Login", "Booking Submission",
    "Document Upload", "Confirmation", "System Update", "Monitoring",
  ]

  const handleDemoStepAdvance = (step: number) => {
    setDemoStep(step)
    if (step >= 1 && step <= 8) {
      addActivity(
        `Step ${step}: ${STEP_LABELS[step]} — completed for BKG-NEW-001`,
        step === 1 ? "ingested" : step === 2 ? "carrier_eval" : step === 3 ? "portal_login" : step === 4 ? "booking_submit" : step === 5 ? "doc_upload" : step === 6 ? "confirmed" : step === 7 ? "notified" : "confirmed",
        "BKG-NEW-001",
      )
    }
  }

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

  const exceptionsCount = BOOKING_REQUESTS.filter((s) => s.bookingStatus === "Exception" || s.bookingStatus === "Awaiting Approval").filter((s) => !resolvedExceptionIds.has(s.id)).length
  const unreadInboxCount = INBOX_EMAILS.filter((e) => !e.read && !readEmailIds.has(e.id)).length + dynamicInboxEmails.filter((e) => !e.read && !readEmailIds.has(e.id)).length

  const handleViewChange = (v: SidebarView, opts?: { sapOrderId?: string; emailId?: string }) => {
    setViewHistory((prev) => [...prev, { view }])
    setView(v)
    setSearchQuery("")
    if (v !== "tracking-search") setTrackingPreselect(null)
    if (v !== "weather-traffic") setWeatherHighlightId(null)
    setBackOpenShipmentId(null)
    // Set auto-open targets for SAP / Email
    setSapAutoOpenOrderId(opts?.sapOrderId ?? null)
    setEmailAutoSelectId(opts?.emailId ?? null)
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
        demoActive={demoActive}
        onStartDemo={handleStartDemo}
        onStopDemo={handleStopDemo}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          onSearch={setSearchQuery}
          onToggleAIChat={() => setAiChatOpen((prev) => !prev)}
          aiChatOpen={aiChatOpen}
          canGoBack={viewHistory.length > 0}
          onBack={handleBack}
          demoActive={demoActive}
          demoStep={demoStep}
          onStopDemo={handleStopDemo}
          onGoToDashboard={() => { setView("dashboard"); setDemoShipmentVisible(true) }}
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
                demoActive={demoActive}
                demoShipmentVisible={demoShipmentVisible}
                demoStep={demoStep}
                demoPaused={demoPaused}
                demoScenario={demoScenario}
                demoExceptionActive={demoExceptionActive}
                onDemoStepAdvance={handleDemoStepAdvance}
                onDemoPause={() => setDemoPaused(true)}
                onDemoResume={() => setDemoPaused(false)}
                onDemoExceptionResolved={() => setDemoExceptionActive(false)}
                onDemoExceptionTriggered={() => setDemoExceptionActive(true)}
                onDemoShipmentDismiss={() => setDemoShipmentVisible(false)}
                onDemoComplete={handleDemoComplete}
                onAddInboxEmail={handleAddInboxEmail}
                demoReturnedFromInbox={demoReturnedFromInbox}
                onDemoReturnedFromInboxConsumed={() => setDemoReturnedFromInbox(false)}
                demoZoomActive={demoZoomActive}
                showCompletionModal={showCompletionModal}
                onCloseCompletionModal={() => { setShowCompletionModal(false); handleStopDemo() }}
                demoElapsedTime={demoElapsedTime}
              />
            )}

            {view === "analytics" && <AnalyticsPage etaUpdatedCount={etaApprovedCount} />}

            {view === "sap-tm" && <SapSimulationPage autoOpenOrderId={sapAutoOpenOrderId ?? undefined} demoUpdated={demoStep >= 7} />}

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
                dynamicEmails={dynamicInboxEmails}
                onReturnToFlow={() => {
                  // Resolve exception and advance — flow will fast-forward remaining steps
                  setDemoExceptionActive(false)
                  handleDemoStepAdvance(demoStep + 1)
                  handleViewChange("dashboard")
                  setDemoShipmentVisible(true)
                }}
              />
            )}

            {view === "email-sent" && <EmailSentPage dynamicEmails={sentEmails} autoSelectId={emailAutoSelectId ?? undefined} />}

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
