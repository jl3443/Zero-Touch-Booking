"use client"

import { useState } from "react"
import { type Shipment } from "@/lib/mock-data"
import { KPICards } from "./kpi-cards"
import { LaneInsightBanner } from "./lane-insight-banner"
import { ShipmentTable } from "./shipment-table"
import { ExceptionDistributionPanel, CriticalCutoffPanel } from "./exception-panels"
import { MiniMap } from "./mini-map"
import { ShipmentDrawer } from "./shipment-drawer"
import { type SidebarView } from "./sidebar"

interface DashboardProps {
  searchQuery: string
  activeView?: SidebarView
  onViewChange?: (view: SidebarView) => void
}

export function Dashboard({ searchQuery, onViewChange }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
        {/* Lane Insight Banner */}
        <LaneInsightBanner />

        {/* KPI Cards — clicking the exception KPI navigates to Exception Workbench */}
        <KPICards
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onExceptionsClick={() => onViewChange?.("exceptions")}
        />

        {/* Main Table */}
        <ShipmentTable
          searchQuery={searchQuery}
          activeFilter={activeFilter}
          onSelectShipment={setSelectedShipment}
          selectedId={selectedShipment?.id ?? null}
        />

        {/* Bottom row: exception chart + cutoff list + mini map */}
        <div className="grid grid-cols-3 gap-4">
          <ExceptionDistributionPanel onExceptionClick={() => onViewChange?.("exceptions")} />
          <CriticalCutoffPanel onShipmentClick={setSelectedShipment} />
          <MiniMap onShipmentClick={setSelectedShipment} />
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedShipment && (
        <ShipmentDrawer
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
        />
      )}
    </div>
  )
}
