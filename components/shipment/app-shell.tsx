"use client"

import { useState } from "react"
import { Sidebar, type SidebarView } from "./sidebar"
import { TopBar } from "./top-bar"
import { Dashboard } from "./dashboard"
import { ExceptionWorkbench } from "./exception-workbench"
import { AgentActivityLog } from "./agent-activity-log"
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
import { SHIPMENTS, INBOX_EMAILS } from "@/lib/mock-data"
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
  const [etaApprovedCount, setEtaApprovedCount] = useState(5)
  const [readEmailIds, setReadEmailIds] = useState<Set<string>>(new Set())
  const [resolvedExceptionIds, setResolvedExceptionIds] = useState<Set<string>>(new Set())

  const handleEtaApproved = () => setEtaApprovedCount((prev) => prev + 1)

  const handleMarkEmailRead = (emailId: string) => {
    setReadEmailIds((prev) => new Set([...prev, emailId]))
  }

  const handleExceptionResolved = (shipmentId: string) => {
    setResolvedExceptionIds((prev) => new Set([...prev, shipmentId]))
  }

  const exceptionsCount = SHIPMENTS.filter((s) => !resolvedExceptionIds.has(s.id)).length
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
              />
            )}

            {view === "email-sent" && <EmailSentPage dynamicEmails={sentEmails} />}

            {view === "agent-activity" && (
              <AgentActivityLog
                onShipmentClick={() => handleViewChange("dashboard")}
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
