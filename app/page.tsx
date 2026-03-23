"use client"

import { useState } from "react"
import { AppShell } from "@/components/shipment/app-shell"
import { LoginPage, type Persona } from "@/components/shipment/login-page"

function DemoBadge() {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full pl-2 pr-3.5 py-1.5 shadow-lg">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0">
        <span className="text-[9px] font-bold text-white tracking-tight">TCS</span>
      </div>
      <span className="text-[11px] font-semibold text-gray-600">
        Built by <span className="text-indigo-600 font-bold">TCS MGF</span>
      </span>
    </div>
  )
}

export default function Page() {
  const [persona, setPersona] = useState<Persona | null>(null)

  return (
    <>
      {!persona ? <LoginPage onLogin={setPersona} /> : <AppShell persona={persona} />}
      <DemoBadge />
    </>
  )
}
