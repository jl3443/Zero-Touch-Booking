"use client"

import { useState } from "react"
import { Sidebar, type SidebarView } from "./sidebar"
import { TopBar } from "./top-bar"
import { Dashboard } from "./dashboard"
import { ExceptionWorkbench } from "./exception-workbench"
import { SHIPMENTS } from "@/lib/mock-data"
import { FileText, MessageSquare, Clock, Inbox, Send, BarChart3 } from "lucide-react"

export function AppShell() {
  const [view, setView] = useState<SidebarView>("dashboard")
  const [searchQuery, setSearchQuery] = useState("")

  const exceptionsCount = SHIPMENTS.length

  const handleViewChange = (v: SidebarView) => {
    setView(v)
    setSearchQuery("")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* Left sidebar */}
      <Sidebar
        view={view}
        onViewChange={handleViewChange}
        exceptionsCount={exceptionsCount}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onSearch={setSearchQuery} />

        {(view === "dashboard" || view === "analytics") && (
          <Dashboard searchQuery={searchQuery} activeView={view} onViewChange={handleViewChange} />
        )}

        {view === "exceptions" && (
          <ExceptionWorkbench />
        )}

        {view === "documents" && <PlaceholderView icon={<FileText size={32} />} title="Documents" description="Shipment documents, OCR processing and validation status across all active lanes." />}
        {view === "communications" && <PlaceholderView icon={<MessageSquare size={32} />} title="Communications" description="All carrier, broker and plant communications linked to active shipments." />}
        {view === "timeline" && <PlaceholderView icon={<Clock size={32} />} title="Timeline" description="Cross-shipment chronological event feed across all modes and lanes." />}
        {view === "inbox" && <PlaceholderView icon={<Inbox size={32} />} title="Inbox" description="Incoming emails from carriers, brokers and customs agents." />}
        {view === "sent" && <PlaceholderView icon={<Send size={32} />} title="Sent" description="Notification emails sent by the agent to plant teams and coordinators." />}
      </div>
    </div>
  )
}

function PlaceholderView({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#F8F9FA]">
      <div className="flex flex-col items-center text-center gap-3 max-w-xs">
        <div className="text-gray-300">{icon}</div>
        <div className="text-[15px] font-semibold text-gray-700">{title}</div>
        <div className="text-sm text-gray-400 leading-relaxed">{description}</div>
      </div>
    </div>
  )
}
