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
import { SHIPMENTS, INBOX_EMAILS } from "@/lib/mock-data"

export function AppShell() {
  const [view, setView] = useState<SidebarView>("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [sentEmails, setSentEmails] = useState<SentEmailItem[]>([])
  const [trackingPreselect, setTrackingPreselect] = useState<string | null>(null)

  const exceptionsCount = SHIPMENTS.length
  const unreadInboxCount = INBOX_EMAILS.filter((e) => !e.read).length

  const handleViewChange = (v: SidebarView) => {
    setView(v)
    setSearchQuery("")
    if (v !== "tracking-search") setTrackingPreselect(null)
  }

  const handleSendNotification = (email: SentEmailItem) => {
    setSentEmails((prev) => [email, ...prev])
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* Left sidebar */}
      <Sidebar
        view={view}
        onViewChange={handleViewChange}
        exceptionsCount={exceptionsCount}
        unreadInboxCount={unreadInboxCount}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onSearch={setSearchQuery} />

        {view === "dashboard" && (
          <Dashboard searchQuery={searchQuery} onViewChange={handleViewChange} />
        )}

        {view === "analytics" && <AnalyticsPage />}

        {view === "tracking-search" && (
          <TrackingSearchPage preselectedId={trackingPreselect ?? undefined} />
        )}

        {view === "carrier-scorecard" && <CarrierScorecardPage />}

        {view === "exceptions" && (
          <ExceptionWorkbench onSendNotification={handleSendNotification} />
        )}

        {view === "documents" && <DocumentsPage />}

        {view === "weather-traffic" && <WeatherTrafficPage />}

        {view === "timeline" && <TimelinePage />}

        {view === "email-inbox" && (
          <EmailInboxPage
            onOpenTracking={(id) => {
              setTrackingPreselect(id)
              handleViewChange("tracking-search")
            }}
          />
        )}

        {view === "email-sent" && <EmailSentPage dynamicEmails={sentEmails} />}

        {view === "agent-activity" && (
          <AgentActivityLog
            onShipmentClick={() => handleViewChange("dashboard")}
          />
        )}
      </div>
    </div>
  )
}
