# Booking Automation — Zero Touch Agent Demo

AI-powered freight booking automation platform for multi-modal logistics (ocean, air, road). Built to demonstrate autonomous booking workflows, intelligent exception handling, carrier selection, and human-in-the-loop escalation across a supply chain portfolio.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss)

---

## Overview

A full-featured logistics booking automation platform that manages freight bookings across carriers, modes, and geographies. The system integrates with carrier portals (Maersk, MSC, Hapag-Lloyd, CMA-CGM), SAP TM, and uses AI agents to autonomously execute bookings, detect exceptions, reconcile multi-source signals, and recommend corrective actions when human intervention is needed.

### Key Capabilities

- **Autonomous booking workflows** — 8-step pipeline from SAP requirement intake through carrier selection, portal login, booking submission, document upload, confirmation, and stakeholder notification
- **AI agent exception handling** — Detect capacity shortages, portal failures, rate mismatches, missing SAP fields, carrier rejections, and expired credentials with recommended resolution paths
- **Multi-source signal reconciliation** — Compare data from 14 sources (SAP TM, OTM, carrier portals, RPA Bot, EDI, API Gateway, etc.) with freshness tracking and alignment status
- **Carrier selection intelligence** — Rate comparison, SLA scoring, capacity availability, contract vs spot pricing, and lane performance analytics
- **Exception workbench** — Structured resolution workflows: approve carrier override, authorize spot booking, complete missing fields, retry portal, reroute via alternate lanes
- **Portfolio analytics** — Booking success rate, zero-touch rate, exception distribution, carrier performance, lane trends
- **Email management** — Inbox with AI-powered shipment reference extraction, sent folder, tagged messages (carrier, customs, weather, compliance, advisory)
- **Natural language AI chat** — Query booking status, exceptions, carrier options, and lane performance in English or Chinese

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19 |
| Language | TypeScript 5.7 (strict) |
| Styling | Tailwind CSS 4.2 |
| UI Components | shadcn/ui + Radix UI |
| Charts | Recharts 2.15 |
| Maps | Leaflet + React Leaflet |
| Icons | Lucide React |
| Fonts | IBM Plex Sans / Mono |

---

## Pages & Features

### Overview

| Page | Description |
|------|-------------|
| **Dashboard** | KPI cards (bookings, exceptions, zero-touch rate), AI corridor analysis, booking table, exception distribution, mini map, portal health |
| **Analytics** | Booking success charts, carrier performance, exception trends, agent action timeline, lane utilization |

### Exception Workflow

| Page | Description |
|------|-------------|
| **Exception Workbench** | Per-booking exception cards with multi-step resolution: carrier override approval, spot booking authorization, missing field completion, portal retry, reroute options |
| **Portal Status** | Carrier portal health (Online / Degraded / Offline), API connectivity, weather disruptions, port congestion |
| **Booking Timeline** | Full booking lifecycle timeline with multi-source event attribution (SAP TM, carrier portals, RPA Bot, Agent, etc.) |

### Booking Operations

| Page | Description |
|------|-------------|
| **Search Bookings** | Search and filter bookings by status, carrier, lane, mode, severity |
| **Carrier Selection** | Carrier scorecards with performance ratings (Preferred / Monitor / Caution), KPI trends, contract rates, SLA scores |
| **Documents** | Shipping document tracking (BOL, commercial invoice, packing list, certificate of origin) |

### Communication

| Page | Description |
|------|-------------|
| **Email Inbox** | Tagged inbox with AI analysis to auto-extract booking references from unregistered emails |
| **Email Sent** | History of sent notifications and escalations |

### Intelligence

| Feature | Description |
|---------|-------------|
| **AI Chat Panel** | Natural language queries about bookings, exceptions, carrier capacity, lane performance |
| **Agent Activity Log** | Real-time feed of AI agent actions (detect, book, retry, flag, recommend, escalate, sync) |

---

## Booking Drawer

Click any booking to open a detail drawer with three tabs:

- **Overview** — 8-step workflow progress, booking status, AI agent summary, carrier options with rate/SLA comparison, recommended actions (approve, override, reroute, escalate)
- **Signals** — Multi-source data comparison table with freshness, alignment status, and reconciliation across 14 signal sources
- **Shipping Document** — OTM sync status, document upload with AI extraction, receiver notification workflow

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) — select a persona (Router or Shipment Planner) to enter the dashboard.

---

## Project Structure

```
app/
├── page.tsx                    # Entry point (login → app shell)
├── layout.tsx                  # Root layout, fonts, metadata
└── api/send-email/route.ts     # Email API endpoint (nodemailer + Gmail SMTP)

components/shipment/            # 26 feature components
├── app-shell.tsx               # Main layout + state management + view routing
├── sidebar.tsx                 # Navigation with dynamic badges
├── top-bar.tsx                 # Search, AI toggle, back nav
├── login-page.tsx              # Persona selection (Router / Shipment Planner)
├── dashboard.tsx               # Portfolio dashboard with KPIs
├── kpi-cards.tsx               # Compact KPI row
├── shipment-table.tsx          # Sortable booking list
├── shipment-drawer.tsx         # Detail drawer (Overview/Signals/Documents)
├── exception-workbench.tsx     # Exception resolution workflows
├── exception-panels.tsx        # Distribution chart + D&D risk
├── analytics-page.tsx          # Charts and metrics
├── carrier-scorecard-page.tsx  # Carrier performance ratings
├── tracking-search-page.tsx    # Booking search
├── search-results-page.tsx     # Global search results
├── weather-traffic-page.tsx    # Portal status + weather disruptions
├── timeline-page.tsx           # Booking lifecycle timeline
├── documents-page.tsx          # Document tracking
├── email-inbox-page.tsx        # Email inbox + AI analysis
├── email-sent-page.tsx         # Sent email history
├── email-composer.tsx          # Email drafting
├── agent-activity-log.tsx      # AI agent feed
├── ai-chat-panel.tsx           # Natural language chat
├── mini-map.tsx                # Leaflet map (dashboard)
├── leaflet-map.tsx             # Full interactive map
├── lane-insight-banner.tsx     # Lane performance insights
└── shared.tsx                  # Reusable badges + chips

components/ui/                  # ~56 shadcn/ui primitives

lib/
├── mock-data.ts                # All mock data (bookings, emails, carriers, etc.)
└── utils.ts                    # Utility functions
```

---

## Mock Data

The app runs entirely on client-side mock data — no external APIs required (except optional email sending via Gmail SMTP). The dataset includes:

- **14 bookings** across ocean, air, and road with full 8-step workflow progression, multi-source signals, and exception scenarios
- **20+ inbox emails** tagged by category (carrier, customs, weather, compliance, advisory, agent)
- **7 carrier scorecards** with performance metrics and contract rates
- **20+ agent activity logs** with action reasoning
- **Frequent routes**, lane performance data, carrier options with rate/SLA scoring

---

## Demo Scenarios

### Exception Bookings

| Booking | Mode | Route | Exception | Severity |
|---------|------|-------|-----------|----------|
| BKG-50219 | Ocean (Maersk) | Chennai → Houston | Carrier Rejection — vessel capacity exhausted | Critical |
| BKG-30188 | Ocean | Mumbai → Rotterdam | Missing Allocation — all carriers full | High |
| BKG-60441 | Road (CMA-CGM) | Memphis → Chicago | Portal Unavailable — API timeout | High |
| BKG-70991 | Ocean (CMA-CGM) | Mumbai → Los Angeles | Rate Mismatch — spot 19% above contract | High |
| BKG-92410 | Ocean (CMA-CGM) | Mumbai → Los Angeles | Credentials Expired — portal session expired | High |
| BKG-88442 | Ocean (Hapag-Lloyd) | Hong Kong → Rotterdam | Missing Booking Fields — SAP data incomplete | Medium |

### Approval Bookings

| Booking | Mode | Route | Approval Type |
|---------|------|-------|---------------|
| BKG-40672 | Road (Hapag-Lloyd) | Toronto → Detroit | Carrier Override — AI pick vs historical preference |

### Active / Completed Bookings

| Booking | Mode | Route | Status |
|---------|------|-------|--------|
| BKG-10421 | Ocean (Maersk) | Shanghai → Los Angeles | Confirmed |
| BKG-91204 | Ocean (Maersk) | Shanghai → Los Angeles | Confirmed |
| BKG-91003 | Road (FedEx) | Memphis → Chicago | Confirmed |
| BKG-93001 | Road (XPO) | Memphis → Chicago | Notified |
| BKG-92015 | Ocean (MSC) | Shenzhen → Chicago | Docs Uploaded |
| BKG-20334 | Ocean (MSC) | Shenzhen → Chicago | In Progress |
| BKG-91587 | Road (DHL) | Toronto → Detroit | In Progress |

---

## Built By

**[JL Group](https://www.jianlianggroup.com)**
