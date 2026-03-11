"use client"

import { useState } from "react"
import { AppShell } from "@/components/shipment/app-shell"
import { LoginPage, type Persona } from "@/components/shipment/login-page"

function DemoBadge() {
  return (
    <a
      href="https://www.jianlianggroup.com"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full pl-1.5 pr-3 py-1.5 shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
    >
      {/* Icon — purple V with yellow lightning bolt */}
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        {/* Purple V / triangle */}
        <path d="M8 8L20 34L32 8" fill="url(#vGrad)" stroke="none" strokeWidth="0" />
        {/* Blue accent on the right arm */}
        <path d="M24 8L20 18L32 8Z" fill="#60A5FA" opacity="0.9" />
        {/* Yellow lightning bolt */}
        <path d="M18 12L14 22H19L16 30L26 18H20L24 12Z" fill="#FACC15" />
        <defs>
          <linearGradient id="vGrad" x1="8" y1="8" x2="20" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#6D28D9" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
        Built by <span className="text-violet-600 font-bold">JL Group</span>
      </span>
    </a>
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
