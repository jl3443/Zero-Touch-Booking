"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, BarChart2, Ship, AlertTriangle, FileText,
  CloudLightning, GitBranch, Mail, Inbox, Send, Brain,
  ChevronDown, ChevronRight, FileStack, User, Award, ScanSearch,
} from "lucide-react"

export type SidebarView =
  | "dashboard"
  | "analytics"
  | "carrier-scorecard"
  | "tracking-search"
  | "exceptions"
  | "documents"
  | "weather-traffic"
  | "timeline"
  | "email-inbox"
  | "email-sent"
  | "agent-activity"

interface SidebarProps {
  view: SidebarView
  onViewChange: (view: SidebarView) => void
  exceptionsCount?: number
  unreadInboxCount?: number
}

export function Sidebar({ view, onViewChange, exceptionsCount = 7, unreadInboxCount = 3 }: SidebarProps) {
  const [shipmentOpen, setShipmentOpen] = useState(true)
  const [emailOpen, setEmailOpen] = useState(true)

  return (
    <aside className="w-[260px] bg-[#0A0A0B] text-[#A1A1AA] flex flex-col shrink-0 border-r border-gray-800">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-gray-800">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <FileStack className="w-5 h-5 text-white" />
        </div>
        <div className="text-[14px] font-semibold text-white leading-tight">
          Operations Readiness<br />
          <span className="text-[11px] font-normal text-gray-400">ETA Control Tower</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">

        <SectionLabel>Portfolio</SectionLabel>

        <NavItem
          label="Dashboard"
          icon={<LayoutDashboard size={15} />}
          active={view === "dashboard"}
          onClick={() => onViewChange("dashboard")}
        />
        <NavItem
          label="Analytics"
          icon={<BarChart2 size={15} />}
          active={view === "analytics"}
          onClick={() => onViewChange("analytics")}
        />
        <NavItem
          label="Carrier Scorecards"
          icon={<Award size={15} />}
          active={view === "carrier-scorecard"}
          onClick={() => onViewChange("carrier-scorecard")}
        />
        <NavItem
          label="Track Shipment"
          icon={<ScanSearch size={15} />}
          active={view === "tracking-search"}
          onClick={() => onViewChange("tracking-search")}
        />

        <div className="pt-2 pb-1" />

        <SectionLabel>Shipment Order</SectionLabel>

        <NavParent
          label="Shipment Overview"
          icon={<Ship size={15} />}
          open={shipmentOpen}
          onToggle={() => setShipmentOpen(!shipmentOpen)}
        />

        {shipmentOpen && (
          <div className="ml-3 border-l border-gray-800 pl-3 space-y-0.5">
            <NavSubItem
              label="Exceptions"
              icon={<AlertTriangle size={13} />}
              active={view === "exceptions"}
              onClick={() => onViewChange("exceptions")}
              badge={exceptionsCount}
            />
            <NavSubItem
              label="Supporting Documents"
              icon={<FileText size={13} />}
              active={view === "documents"}
              onClick={() => onViewChange("documents")}
            />
            <NavSubItem
              label="Weather / Traffic"
              icon={<CloudLightning size={13} />}
              active={view === "weather-traffic"}
              onClick={() => onViewChange("weather-traffic")}
            />
            <NavSubItem
              label="Timeline"
              icon={<GitBranch size={13} />}
              active={view === "timeline"}
              onClick={() => onViewChange("timeline")}
            />
          </div>
        )}

        <div className="pt-2 pb-1" />

        <SectionLabel>Email</SectionLabel>

        <NavParent
          label="Email"
          icon={<Mail size={15} />}
          open={emailOpen}
          onToggle={() => setEmailOpen(!emailOpen)}
        />

        {emailOpen && (
          <div className="ml-3 border-l border-gray-800 pl-3 space-y-0.5">
            <NavSubItem
              label="Inbox"
              icon={<Inbox size={13} />}
              active={view === "email-inbox"}
              onClick={() => onViewChange("email-inbox")}
              badge={unreadInboxCount}
            />
            <NavSubItem
              label="Sent"
              icon={<Send size={13} />}
              active={view === "email-sent"}
              onClick={() => onViewChange("email-sent")}
            />
          </div>
        )}

        <div className="pt-2 pb-1" />

        <NavItem
          label="Agent Activity"
          icon={<Brain size={15} />}
          active={view === "agent-activity"}
          onClick={() => onViewChange("agent-activity")}
        />
      </nav>

      {/* Footer — User */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
            <User size={14} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">Export Coordinator</div>
            <div className="text-[10px] text-gray-500 truncate">coordinator@company.com</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
      {children}
    </div>
  )
}

function NavItem({
  label, icon, active, onClick, badge,
}: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void; badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
        active ? "bg-[#27272A] text-white" : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-white"
      )}
    >
      <span className={cn("shrink-0", active ? "text-blue-400" : "text-gray-500")}>{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && (
        <span className="shrink-0 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}

function NavParent({
  label, icon, open, onToggle,
}: {
  label: string; icon: React.ReactNode; open: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-semibold text-[#E4E4E7] hover:bg-[#18181B] transition-colors"
    >
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {open ? <ChevronDown size={12} className="text-gray-600" /> : <ChevronRight size={12} className="text-gray-600" />}
    </button>
  )
}

function NavSubItem({
  label, icon, active, onClick, badge,
}: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void; badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors",
        active ? "bg-[#27272A] text-white" : "text-[#71717A] hover:bg-[#18181B] hover:text-[#A1A1AA]"
      )}
    >
      <span className={cn("shrink-0", active ? "text-blue-400" : "text-gray-600")}>{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && (
        <span className="shrink-0 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}
