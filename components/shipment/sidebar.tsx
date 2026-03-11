"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BarChart3,
  Ship,
  AlertTriangle,
  FileText,
  MessageSquare,
  Clock,
  Mail,
  Inbox,
  Send,
  ChevronDown,
  FileStack,
} from "lucide-react"

export type SidebarView =
  | "dashboard"
  | "analytics"
  | "exceptions"
  | "documents"
  | "communications"
  | "timeline"
  | "inbox"
  | "sent"

interface SidebarProps {
  view: SidebarView
  onViewChange: (view: SidebarView) => void
  exceptionsCount?: number
}

export function Sidebar({ view, onViewChange, exceptionsCount = 7 }: SidebarProps) {
  const [shipmentOpen, setShipmentOpen] = useState(true)
  const [emailOpen, setEmailOpen] = useState(false)

  return (
    <aside className="w-[280px] bg-[#0A0A0B] text-[#A1A1AA] flex flex-col shrink-0 border-r border-gray-800">
      {/* Logo header */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-gray-800">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <FileStack className="w-5 h-5 text-white" />
        </div>
        <div className="text-[15px] font-medium text-white leading-tight">
          ETA Control Tower
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* PORTFOLIO */}
        <div className="mb-6">
          <div className="text-[10px] font-semibold tracking-wider text-gray-500 px-3 mb-2">
            PORTFOLIO
          </div>
          <NavItem
            label="Dashboard"
            icon={<LayoutDashboard size={16} />}
            active={view === "dashboard"}
            onClick={() => onViewChange("dashboard")}
          />
          <NavItem
            label="Analytics"
            icon={<BarChart3 size={16} />}
            active={view === "analytics"}
            onClick={() => onViewChange("analytics")}
          />
        </div>

        {/* SHIPMENT OVERVIEW */}
        <div className="mb-6">
          <NavParent
            label="Shipment Overview"
            icon={<Ship size={16} />}
            open={shipmentOpen}
            onToggle={() => setShipmentOpen(!shipmentOpen)}
          />
          {shipmentOpen && (
            <div className="ml-3 mt-1 space-y-1">
              <NavSubItem
                label="Exceptions"
                icon={<AlertTriangle size={14} />}
                active={view === "exceptions"}
                onClick={() => onViewChange("exceptions")}
                badge={exceptionsCount}
              />
              <NavSubItem
                label="Documents"
                icon={<FileText size={14} />}
                active={view === "documents"}
                onClick={() => onViewChange("documents")}
              />
              <NavSubItem
                label="Communications"
                icon={<MessageSquare size={14} />}
                active={view === "communications"}
                onClick={() => onViewChange("communications")}
              />
              <NavSubItem
                label="Timeline"
                icon={<Clock size={14} />}
                active={view === "timeline"}
                onClick={() => onViewChange("timeline")}
              />
            </div>
          )}
        </div>

        {/* EMAIL */}
        <div>
          <NavParent
            label="Email"
            icon={<Mail size={16} />}
            open={emailOpen}
            onToggle={() => setEmailOpen(!emailOpen)}
          />
          {emailOpen && (
            <div className="ml-3 mt-1 space-y-1">
              <NavSubItem
                label="Inbox"
                icon={<Inbox size={14} />}
                active={view === "inbox"}
                onClick={() => onViewChange("inbox")}
              />
              <NavSubItem
                label="Sent"
                icon={<Send size={14} />}
                active={view === "sent"}
                onClick={() => onViewChange("sent")}
              />
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <div className="text-[10px] font-semibold tracking-wider text-gray-500 mb-1.5">
          LOGGED IN AS
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-white font-medium">Export Coordinator</div>
          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Switch
          </button>
        </div>
        <div className="text-[11px] text-gray-600">
          ETA Control Tower · v2.4
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-[#27272A] text-white"
          : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-white"
      )}
    >
      <span className={cn("shrink-0", active ? "text-blue-400" : "text-gray-500")}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

function NavParent({
  label,
  icon,
  open,
  onToggle,
}: {
  label: string
  icon: React.ReactNode
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-[#A1A1AA] hover:bg-[#18181B] hover:text-white transition-colors"
    >
      <span className="shrink-0 text-gray-500">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      <ChevronDown
        size={14}
        className={cn(
          "shrink-0 transition-transform text-gray-500",
          open && "rotate-180"
        )}
      />
    </button>
  )
}

function NavSubItem({
  label,
  icon,
  active,
  onClick,
  badge,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-[#27272A] text-white"
          : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-white"
      )}
    >
      <span className={cn("shrink-0", active ? "text-blue-400" : "text-gray-500")}>
        {icon}
      </span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && (
        <span className="shrink-0 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}
