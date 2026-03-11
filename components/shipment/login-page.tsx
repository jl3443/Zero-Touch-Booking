"use client"

import { useState } from "react"
import { Eye, EyeOff, ArrowRight, Route, Package } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Persona {
  role: string
  name: string
  email: string
  initials: string
  color: string
}

const PERSONAS: Persona[] = [
  {
    role: "Router",
    name: "Alex Chen",
    email: "a.chen@logistics.co",
    initials: "AC",
    color: "bg-violet-600",
  },
  {
    role: "Shipment Coordinator",
    name: "Maria Santos",
    email: "m.santos@logistics.co",
    initials: "MS",
    color: "bg-blue-600",
  },
]

const DEMO_PASSWORD = "Demo@2024"

interface LoginPageProps {
  onLogin: (persona: Persona) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [selected, setSelected] = useState<Persona | null>(null)

  const handlePersonaClick = (p: Persona) => {
    setSelected(p)
    setEmail(p.email)
    setPassword(DEMO_PASSWORD)
  }

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    const match = PERSONAS.find((p) => p.email === email)
    if (match && password) onLogin(match)
    else if (password && email) onLogin(PERSONAS[0]) // fallback
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* ── Left panel ────────────────────────────────────────────────── */}
      <div className="w-[400px] shrink-0 bg-[#0B1629] flex flex-col px-10 py-10 relative overflow-hidden">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">ETA Control Tower</p>
            <p className="text-blue-400 text-[11px] mt-0.5">AI-Powered Shipment Intelligence</p>
          </div>
        </div>

        {/* Headline */}
        <div className="mt-auto mb-auto pt-16 relative z-10">
          <h1 className="text-[2.4rem] font-bold text-white leading-tight tracking-tight">
            Proactive<br />
            Shipment<br />
            <span className="text-blue-400">Exception Control</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mt-5 max-w-[300px]">
            AI-powered platform for real-time ETA monitoring, cross-carrier signal aggregation, and exception resolution across global trade lanes.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              "Real-time ETA drift detection & alerts",
              "Multi-carrier & forwarder signal aggregation",
              "AI-driven exception resolution workflows",
              "Automated OTM sync & carrier notifications",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 relative z-10">
          <p className="text-slate-600 text-[11px]">Demo environment · All data is fictitious</p>
          <p className="text-slate-700 text-[10px] mt-0.5">ETA Control Tower v1.0 · Powered by AI</p>
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────────────── */}
      <div className="flex-1 bg-gray-50 flex items-center justify-center px-12 py-10 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-gray-500 text-sm mb-8">Access your workspace</p>

          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@logistics.co"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={!email || !password}
              className="w-full bg-[#1a2b5f] hover:bg-[#1e3270] disabled:bg-gray-300 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <ArrowRight size={15} />
              Sign In
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-widest mb-3">
              Demo Accounts — Click to Fill
            </p>
            <div className="space-y-2.5">
              {PERSONAS.map((p) => (
                <button
                  key={p.email}
                  onClick={() => handlePersonaClick(p)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 rounded-xl border bg-white transition-all",
                    selected?.email === p.email
                      ? "border-blue-400 ring-2 ring-blue-100 shadow-sm"
                      : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", p.color)}>
                      {p.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{p.role}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{p.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
