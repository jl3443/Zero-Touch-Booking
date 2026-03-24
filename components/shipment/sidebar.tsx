"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, BarChart2, Anchor, AlertTriangle,
  Monitor, GitBranch, Mail, Inbox, Send, Brain,
  ChevronDown, ChevronRight, FileStack, User, Award, ScanSearch,
  Route, Zap, Square, Play, Database, Shield,
} from "lucide-react"
import { type Persona } from "./login-page"
import { DEMO_SCENARIOS } from "@/lib/mock-data"

export type SidebarView =
  | "dashboard"
  | "analytics"
  | "carrier-scorecard"
  | "exceptions"
  | "documents"
  | "weather-traffic"
  | "timeline"
  | "email-inbox"
  | "email-sent"
  | "agent-activity"
  | "tracking-search"
  | "sap-tm"
  | "policies"

interface SidebarProps {
  view: SidebarView
  onViewChange: (view: SidebarView) => void
  exceptionsCount?: number
  unreadInboxCount?: number
  persona?: Persona
  demoActive?: boolean
  onStartDemo?: (scenarioId: string) => void
  onStopDemo?: () => void
}

export function Sidebar({ view, onViewChange, exceptionsCount = 4, unreadInboxCount = 3, persona, demoActive, onStartDemo, onStopDemo }: SidebarProps) {
  const [exceptionOpen, setExceptionOpen] = useState(true)
  const [opsOpen, setOpsOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [scenarioPickerOpen, setScenarioPickerOpen] = useState(false)

  return (
    <aside className="w-[260px] bg-[#0A0A0B] text-[#A1A1AA] flex flex-col shrink-0 border-r border-gray-800">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-gray-800">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Route className="w-5 h-5 text-white" />
        </div>
        <div className="text-[14px] font-semibold text-white leading-tight">
          Booking Automation<br />
          <span className="text-[11px] font-normal text-gray-400">Zero Touch Agent</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">

        {/* Demo Mode */}
        <div className="mb-3">
          {demoActive ? (
            <button
              onClick={onStopDemo}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-600/15 border border-emerald-600/30 text-[13px] font-semibold text-emerald-400 hover:bg-emerald-600/25 transition-colors"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="flex-1 text-left">Demo Running</span>
              <Square size={12} className="text-emerald-500" />
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setScenarioPickerOpen(!scenarioPickerOpen)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-blue-600/15 border border-blue-600/30 text-[13px] font-semibold text-blue-400 hover:bg-blue-600/25 transition-colors"
              >
                <Zap size={15} className="shrink-0 text-blue-400" />
                <span className="flex-1 text-left">Start Demo</span>
                <Play size={12} className="text-blue-400" />
              </button>
              {scenarioPickerOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#18181B] border border-gray-700 rounded-lg shadow-xl z-50 py-1 max-h-[260px] overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Select Scenario</div>
                  {DEMO_SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onStartDemo?.(s.id)
                        setScenarioPickerOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#27272A] transition-colors"
                    >
                      <div className="text-[12px] font-medium text-white">{s.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{s.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <SectionLabel>Overview</SectionLabel>

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

        <div className="pt-2 pb-1" />

        <SectionLabel>Exception Workflow</SectionLabel>

        <NavParent
          label="Exception Handling"
          icon={<AlertTriangle size={15} />}
          open={exceptionOpen}
          onToggle={() => setExceptionOpen(!exceptionOpen)}
        />

        {exceptionOpen && (
          <div className="ml-3 border-l border-gray-800 pl-3 space-y-0.5">
            <NavSubItem
              label="Exception Workbench"
              icon={<AlertTriangle size={13} />}
              active={view === "exceptions"}
              onClick={() => onViewChange("exceptions")}
              badge={exceptionsCount}
            />
            <NavSubItem
              label="Portal Status"
              icon={<Monitor size={13} />}
              active={view === "weather-traffic"}
              onClick={() => onViewChange("weather-traffic")}
            />
            <NavSubItem
              label="Booking Timeline"
              icon={<GitBranch size={13} />}
              active={view === "timeline"}
              onClick={() => onViewChange("timeline")}
            />
          </div>
        )}

        <div className="pt-2 pb-1" />

        <SectionLabel>Booking Operations</SectionLabel>

        <NavParent
          label="Operations"
          icon={<Anchor size={15} />}
          open={opsOpen}
          onToggle={() => setOpsOpen(!opsOpen)}
        />

        {opsOpen && (
          <div className="ml-3 border-l border-gray-800 pl-3 space-y-0.5">
            <NavSubItem
              label="Search Bookings"
              icon={<ScanSearch size={13} />}
              active={view === "tracking-search"}
              onClick={() => onViewChange("tracking-search")}
            />
            <NavSubItem
              label="Carrier Selection"
              icon={<Award size={13} />}
              active={view === "carrier-scorecard"}
              onClick={() => onViewChange("carrier-scorecard")}
            />
            <NavSubItem
              label="Documents"
              icon={<FileStack size={13} />}
              active={view === "documents"}
              onClick={() => onViewChange("documents")}
            />
          </div>
        )}

        <div className="pt-2 pb-1" />

        <SectionLabel>Communication</SectionLabel>

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

        <NavItem
          label="Policy"
          icon={<Shield size={15} />}
          active={view === "policies"}
          onClick={() => onViewChange("policies")}
        />

        <div className="pt-2 pb-1" />

        <SectionLabel>Systems</SectionLabel>

        <NavItem
          label="SAP TM / ERP"
          icon={<Database size={15} />}
          active={view === "sap-tm"}
          onClick={() => onViewChange("sap-tm")}
        />
      </nav>

      {/* Footer — User */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          {persona ? (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold ${persona.color}`}>
              {persona.initials}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
              <User size={14} className="text-blue-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{persona?.role ?? "Router"}</div>
            <div className="text-[10px] text-gray-500 truncate">{persona?.email ?? "router@company.com"}</div>
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
