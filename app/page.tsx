"use client"

import { useState } from "react"
import { AppShell } from "@/components/shipment/app-shell"
import { LoginPage, type Persona } from "@/components/shipment/login-page"

export default function Page() {
  const [persona, setPersona] = useState<Persona | null>(null)

  if (!persona) return <LoginPage onLogin={setPersona} />
  return <AppShell persona={persona} />
}
