export type TransportMode = "Ocean" | "Road" | "Air"
export type Severity = "Critical" | "High" | "Medium" | "Low"
export type ExceptionType =
  | "Delay"
  | "Missing Signal"
  | "Long Dwell"
  | "Route Deviation"
  | "Weather Disruption"
  | "Traffic Disruption"
  | "Customs Hold"
  | "Conflicting Sources"

export type SignalSource = "GNosis" | "GPS" | "Carrier Portal" | "Email" | "UiPath" | "Weather API" | "Traffic API" | "System Alert" | "Agent"

export interface ReasonChip {
  label: string
  type: "weather" | "traffic" | "signal" | "port" | "flight" | "customs" | "deviation" | "confidence"
}

export interface TimelineEvent {
  timestamp: string
  event: string
  location: string
  source: SignalSource
  status: "ok" | "warning" | "critical" | "info" | "agent"
  anomaly?: string
}

export interface SourceSignal {
  source: SignalSource
  status: string
  timestamp: string
  freshness: string
  aligned: boolean | null
  fresh: boolean
}

export interface Shipment {
  id: string
  mode: TransportMode
  carrier: string
  trackingRef: string
  origin: string
  destination: string
  plant: string
  currentStatus: string
  plannedETA: string
  revisedETA: string
  delayHours: number
  exceptionType: ExceptionType
  severity: Severity
  lastSignal: string
  lastSignalSource: SignalSource
  recommendedAction: string
  reasonChips: ReasonChip[]
  etaConfidence: number
  cutoffTime?: string
  criticalMaterial?: boolean
  timeline: TimelineEvent[]
  sources: SourceSignal[]
  exceptionReason: string
  exceptionTrigger: string
  likelyCause: string
  businessImpact: string
  otmStatus: "Synced" | "Pending Update" | "Needs Review"
  notificationStatus: "Sent" | "Not Yet Sent" | "Escalated"
  agentSummary: string
  lane: string
  lat: number
  lng: number
}

export const SHIPMENTS: Shipment[] = [
  // Scenario 1: Ocean — Shanghai → LA Port Congestion
  {
    id: "SHP-10421",
    mode: "Ocean",
    carrier: "COSCO",
    trackingRef: "COSU8812045",
    origin: "Shanghai, CN",
    destination: "Los Angeles, US",
    plant: "LAX Distribution Center",
    currentStatus: "At Destination Port — Awaiting Berth",
    plannedETA: "Mar 12, 2025 08:00",
    revisedETA: "Mar 13, 2025 02:00",
    delayHours: 18,
    exceptionType: "Delay",
    severity: "High",
    lastSignal: "2h ago",
    lastSignalSource: "GNosis",
    recommendedAction: "Notify Destination Team",
    reasonChips: [{ label: "Port Congestion", type: "port" }, { label: "Berth Delay", type: "deviation" }],
    etaConfidence: 79,
    timeline: [
      { timestamp: "Mar 05 09:00", event: "Pickup Completed", location: "Shanghai Port, CN", source: "GNosis", status: "ok" },
      { timestamp: "Mar 05 18:00", event: "Vessel Departed Yangshan Deep Water Port", location: "Shanghai, CN", source: "GNosis", status: "ok" },
      { timestamp: "Mar 09 12:00", event: "En Route — Trans-Pacific", location: "Open Pacific", source: "GNosis", status: "ok" },
      { timestamp: "Mar 12 06:00", event: "Arrived San Pedro Bay", location: "Los Angeles, US", source: "GNosis", status: "warning", anomaly: "Berth unavailable — congestion" },
      { timestamp: "Mar 12 08:00", event: "Port Congestion Alert", location: "Los Angeles Port", source: "UiPath", status: "critical", anomaly: "22+ vessel queue at WBCT Terminal" },
      { timestamp: "Mar 12 08:05", event: "ETA Recalculated (+18h)", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "GNosis", status: "At Port — Awaiting Berth", timestamp: "Mar 12 10:00", freshness: "2h ago", aligned: true, fresh: true },
      { source: "Carrier Portal", status: "Arrived Destination", timestamp: "Mar 12 09:30", freshness: "2.5h ago", aligned: true, fresh: true },
      { source: "UiPath", status: "Port Congestion Detected", timestamp: "Mar 12 08:00", freshness: "4h ago", aligned: null, fresh: true },
    ],
    exceptionReason: "ETA drift beyond 6h ocean threshold",
    exceptionTrigger: "Vessel arrived at port but no berth assigned after 6h",
    likelyCause: "LA port WBCT terminal congestion — 22+ vessel queue, peak import season",
    businessImpact: "ETA slipped +18h — LAX Distribution Center receiving window at risk",
    otmStatus: "Pending Update",
    notificationStatus: "Not Yet Sent",
    agentSummary: "Shipment SHP-10421 (COSCO, Shanghai → LA) arrived at San Pedro Bay but cannot berth due to severe WBCT terminal congestion with 22+ vessels queued. ETA revised from Mar 12 08:00 to Mar 13 02:00 — 18 hours delayed. LAX Distribution Center receiving window may be impacted. Recommend approving OTM ETA update and notifying destination team immediately.",
    lane: "SHA→LAX",
    lat: 33.7,
    lng: -118.2,
  },

  // Scenario 2: Air — Shenzhen → Chicago Customs Hold
  {
    id: "SHP-20334",
    mode: "Air",
    carrier: "DHL",
    trackingRef: "AWB: 057-11223344",
    origin: "Shenzhen, CN",
    destination: "Chicago, US",
    plant: "ORD Air Freight Hub",
    currentStatus: "Customs Hold — US CBP Inspection",
    plannedETA: "Mar 11, 2025 14:00",
    revisedETA: "Mar 13, 2025 10:00",
    delayHours: 44,
    exceptionType: "Customs Hold",
    severity: "High",
    lastSignal: "3h ago",
    lastSignalSource: "Carrier Portal",
    recommendedAction: "Follow Up with Broker",
    reasonChips: [{ label: "Customs Hold", type: "customs" }, { label: "CBP Inspection", type: "deviation" }],
    etaConfidence: 52,
    cutoffTime: "Mar 13, 2025 12:00",
    timeline: [
      { timestamp: "Mar 10 08:00", event: "Freight Accepted at SZX", location: "Shenzhen Airport, CN", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 10 14:00", event: "Departed Shenzhen (DHL EK787)", location: "Shenzhen, CN", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 11 06:00", event: "Transited Hong Kong HKG", location: "Hong Kong", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 11 12:00", event: "Arrived ORD — Customs Entry Filed", location: "Chicago O'Hare, US", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 11 14:00", event: "Customs Hold Triggered — CBP Physical Inspection", location: "ORD Customs", source: "Carrier Portal", status: "critical", anomaly: "CBP hold on electronics cargo — TSCA review" },
      { timestamp: "Mar 11 15:00", event: "Broker Notified via Email", location: "System", source: "Email", status: "info" },
      { timestamp: "Mar 11 15:05", event: "ETA Recalculated (+44h estimated)", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "Carrier Portal", status: "Customs Hold — ORD", timestamp: "Mar 11 21:00", freshness: "3h ago", aligned: true, fresh: true },
      { source: "Email", status: "Broker Notified — Awaiting CBP Release", timestamp: "Mar 11 15:00", freshness: "9h ago", aligned: true, fresh: true },
      { source: "GNosis", status: "Arrived Destination", timestamp: "Mar 11 12:30", freshness: "11h ago", aligned: false, fresh: true },
    ],
    exceptionReason: "Shipment held at ORD Customs for CBP physical inspection — electronics",
    exceptionTrigger: "CBP selected cargo for TSCA compliance review on entry",
    likelyCause: "Electronics shipment flagged for TSCA Section 6 compliance review — common for SZX exports",
    businessImpact: "ETA extended by ~44h — approaching ORD hub slot cutoff",
    otmStatus: "Pending Update",
    notificationStatus: "Not Yet Sent",
    agentSummary: "Shipment SHP-20334 (DHL, Shenzhen → Chicago) is held at ORD Customs under a CBP TSCA compliance review typical for Chinese electronics cargo. The estimated hold duration is 44h, with revised ETA Mar 13 10:00 — close to the hub slot cutoff. Broker has been notified. Recommend following up with the broker every 12h for status and updating ORD hub team to adjust inbound schedule.",
    lane: "SZX→ORD",
    lat: 41.9,
    lng: -87.6,
  },

  // Scenario 3: Ocean — Mumbai → Rotterdam Missing Signal
  {
    id: "SHP-30188",
    mode: "Ocean",
    carrier: "Maersk",
    trackingRef: "MSKU7234891",
    origin: "Mumbai, IN",
    destination: "Rotterdam, NL",
    plant: "Rotterdam Port Terminal",
    currentStatus: "GPS Signal Lost — Last Known: Arabian Sea",
    plannedETA: "Mar 20, 2025 08:00",
    revisedETA: "Mar 20, 2025 20:00",
    delayHours: 12,
    exceptionType: "Missing Signal",
    severity: "High",
    lastSignal: "9h ago",
    lastSignalSource: "GNosis",
    recommendedAction: "Contact Carrier",
    reasonChips: [{ label: "No AIS Signal", type: "signal" }, { label: "Low Confidence", type: "confidence" }],
    etaConfidence: 38,
    timeline: [
      { timestamp: "Mar 13 10:00", event: "Departed JNPT Port Mumbai", location: "Mumbai, IN", source: "GNosis", status: "ok" },
      { timestamp: "Mar 15 06:00", event: "En Route — Arabian Sea", location: "Arabian Sea", source: "GNosis", status: "ok" },
      { timestamp: "Mar 15 14:00", event: "AIS Signal Lost", location: "Arabian Sea (15°N, 63°E)", source: "System Alert", status: "critical", anomaly: "No AIS ping for 9+ hours — unusual for this lane" },
      { timestamp: "Mar 15 23:00", event: "Missing Signal Alert — Vessel Offline", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "GNosis", status: "Last Known — Arabian Sea", timestamp: "Mar 15 14:00", freshness: "9h ago", aligned: false, fresh: false },
      { source: "Carrier Portal", status: "In Transit", timestamp: "Mar 14 22:00", freshness: "25h ago", aligned: false, fresh: false },
      { source: "Email", status: "", timestamp: "", freshness: "No update", aligned: null, fresh: false },
    ],
    exceptionReason: "No AIS signal for 9+ hours — ocean threshold exceeded",
    exceptionTrigger: "AIS transponder offline since 14:00 Mar 15 in Arabian Sea",
    likelyCause: "AIS transponder malfunction or vessel in restricted zone near Gulf of Oman",
    businessImpact: "ETA to Rotterdam unknown — port slot at risk; cannot confirm customs pre-arrival filing",
    otmStatus: "Needs Review",
    notificationStatus: "Not Yet Sent",
    agentSummary: "Shipment SHP-30188 (Maersk, Mumbai → Rotterdam) has lost AIS tracking for 9+ hours since last known position in the Arabian Sea. Carrier portal has not been updated in 25 hours. Confidence is at 38% — manual follow-up with Maersk vessel operations is required to verify position and re-establish tracking before the Rotterdam port slot is forfeited.",
    lane: "BOM→RTM",
    lat: 15.0,
    lng: 63.0,
  },

  // Scenario 4: Air — Guangzhou → Detroit (Critical Material, Assembly Line)
  {
    id: "SHP-40672",
    mode: "Air",
    carrier: "FedEx",
    trackingRef: "AWB: 023-77891023",
    origin: "Guangzhou, CN",
    destination: "Detroit, US",
    plant: "Detroit Assembly Plant — Line 3",
    currentStatus: "Delayed at PVG Transfer — Weather Diversion",
    plannedETA: "Mar 11, 2025 20:00",
    revisedETA: "Mar 12, 2025 06:00",
    delayHours: 10,
    exceptionType: "Weather Disruption",
    severity: "Critical",
    lastSignal: "18m ago",
    lastSignalSource: "Carrier Portal",
    recommendedAction: "Escalate + Notify Plant",
    reasonChips: [{ label: "Weather Diversion", type: "weather" }, { label: "Critical Material", type: "deviation" }],
    etaConfidence: 58,
    cutoffTime: "Mar 11, 2025 22:00",
    criticalMaterial: true,
    timeline: [
      { timestamp: "Mar 10 18:00", event: "Freight Accepted CAN Airport", location: "Guangzhou, CN", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 11 00:00", event: "Departed CAN (FX819)", location: "Guangzhou, CN", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 11 05:00", event: "PVG Transfer Hub — Weather Hold", location: "Shanghai PVG, CN", source: "Carrier Portal", status: "warning", anomaly: "Typhoon remnant causing ground stop at PVG" },
      { timestamp: "Mar 11 06:00", event: "Severe Weather Alert — PVG", location: "Shanghai, CN", source: "Weather API", status: "critical" },
      { timestamp: "Mar 11 06:15", event: "Cutoff Risk Alert — Critical Material", location: "System", source: "Agent", status: "critical", anomaly: "Assembly Line 3 cutoff in 16h — escalation triggered" },
      { timestamp: "Mar 11 06:20", event: "ETA Recalculated (+10h)", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "Carrier Portal", status: "Ground Hold — PVG Weather", timestamp: "Mar 11 21:42", freshness: "18m ago", aligned: true, fresh: true },
      { source: "Weather API", status: "Severe Weather — PVG Ground Stop", timestamp: "Mar 11 20:00", freshness: "2h ago", aligned: null, fresh: true },
      { source: "GNosis", status: "In Transit", timestamp: "Mar 11 18:00", freshness: "4h ago", aligned: false, fresh: true },
    ],
    exceptionReason: "Revised ETA will miss plant receiving cutoff by 8h — critical assembly parts",
    exceptionTrigger: "Weather-induced ground stop at PVG transfer hub + critical material flag",
    likelyCause: "Typhoon remnant causing ground stop and diversions at Shanghai PVG hub",
    businessImpact: "Detroit Assembly Line 3 faces 8h+ production stoppage — CRITICAL parts delayed",
    otmStatus: "Pending Update",
    notificationStatus: "Escalated",
    agentSummary: "CRITICAL: Shipment SHP-40672 (FedEx, Guangzhou → Detroit) carries critical assembly parts for Detroit Line 3. A weather-induced ground stop at Shanghai PVG has pushed revised ETA to Mar 12 06:00 — 8 hours past the plant cutoff. Production stoppage is likely. Escalation has been triggered. Recommend contacting FedEx for next available departure, and alerting Line 3 management to initiate contingency planning.",
    lane: "CAN→DTW",
    lat: 31.2,
    lng: 121.3,
  },

  // Scenario 5: Ocean — Chennai → Houston (Conflicting Sources)
  {
    id: "SHP-50219",
    mode: "Ocean",
    carrier: "MSC",
    trackingRef: "MSCU4451209",
    origin: "Chennai, IN",
    destination: "Houston, US",
    plant: "Houston Port Terminal",
    currentStatus: "Status Conflict — Manual Review Required",
    plannedETA: "Mar 18, 2025 09:00",
    revisedETA: "Mar 18, 2025 09:00",
    delayHours: 0,
    exceptionType: "Conflicting Sources",
    severity: "Medium",
    lastSignal: "1h ago",
    lastSignalSource: "Email",
    recommendedAction: "Manual Review",
    reasonChips: [{ label: "Low Confidence", type: "confidence" }, { label: "Source Conflict", type: "deviation" }],
    etaConfidence: 35,
    timeline: [
      { timestamp: "Mar 08 10:00", event: "Departed Chennai (Ennore Port)", location: "Chennai, IN", source: "GNosis", status: "ok" },
      { timestamp: "Mar 13 08:00", event: "Transit — Indian Ocean", location: "Indian Ocean", source: "GPS", status: "ok" },
      { timestamp: "Mar 17 14:00", event: "Email: 'Vessel Arrived Houston'", location: "Houston, US", source: "Email", status: "warning", anomaly: "Forwarder email claims arrival — not confirmed" },
      { timestamp: "Mar 17 15:00", event: "Carrier Portal: 'In Transit — Gulf of Mexico'", location: "Gulf of Mexico", source: "Carrier Portal", status: "warning", anomaly: "Contradicts email — vessel shows 50nm from port" },
      { timestamp: "Mar 17 15:05", event: "Conflicting Source Alert", location: "System", source: "Agent", status: "critical", anomaly: "3 sources disagree — low confidence flag raised" },
    ],
    sources: [
      { source: "GNosis", status: "Approaching Houston", timestamp: "Mar 17 09:00", freshness: "6h ago", aligned: false, fresh: true },
      { source: "GPS", status: "Vessel — Gulf of Mexico 50nm out", timestamp: "Mar 17 10:00", freshness: "5h ago", aligned: false, fresh: true },
      { source: "Carrier Portal", status: "In Transit", timestamp: "Mar 17 15:00", freshness: "1h ago", aligned: false, fresh: true },
      { source: "Email", status: "Arrived Houston (forwarder unconfirmed)", timestamp: "Mar 17 14:00", freshness: "2h ago", aligned: null, fresh: true },
    ],
    exceptionReason: "Multiple sources provide conflicting status — low confidence triggered",
    exceptionTrigger: "Forwarder email claims arrival; GPS and portal show vessel 50nm out",
    likelyCause: "Forwarder email may be premature or reference different voyage; vessel AIS shows Gulf approach",
    businessImpact: "Cannot confirm ETA — Houston Terminal pre-arrival planning on hold; customs filing at risk",
    otmStatus: "Needs Review",
    notificationStatus: "Not Yet Sent",
    agentSummary: "Shipment SHP-50219 (MSC, Chennai → Houston) has a critical source conflict: a forwarder email claims arrival in Houston, but GPS and carrier portal show vessel is 50nm out in the Gulf of Mexico. Confidence is 35%. Do not update OTM until the conflict is resolved — contact MSC operations to confirm vessel position directly, then update the Houston Terminal on the corrected ETA.",
    lane: "MAA→HOU",
    lat: 24.5,
    lng: -90.0,
  },

  // Scenario 6: Road — Nhava Sheva Dray to Chicago Plant (Traffic)
  {
    id: "SHP-60441",
    mode: "Road",
    carrier: "Schneider",
    trackingRef: "PRO-229841",
    origin: "Los Angeles, US",
    destination: "Chicago, US",
    plant: "Chicago Manufacturing Hub",
    currentStatus: "Delayed — I-40 Incident Near Flagstaff",
    plannedETA: "Mar 11, 2025 18:00",
    revisedETA: "Mar 12, 2025 00:00",
    delayHours: 6,
    exceptionType: "Traffic Disruption",
    severity: "Medium",
    lastSignal: "30m ago",
    lastSignalSource: "GPS",
    recommendedAction: "Monitor & Update ETA",
    reasonChips: [{ label: "Traffic", type: "traffic" }, { label: "Route Incident", type: "traffic" }],
    etaConfidence: 70,
    timeline: [
      { timestamp: "Mar 10 14:00", event: "Container Picked Up — LAX Port", location: "Los Angeles, US", source: "GPS", status: "ok" },
      { timestamp: "Mar 10 16:00", event: "Departed Origin — I-10 East", location: "Los Angeles, US", source: "GPS", status: "ok" },
      { timestamp: "Mar 11 09:00", event: "Traffic Incident Detected — I-40E", location: "Flagstaff, AZ", source: "Traffic API", status: "warning", anomaly: "Multi-vehicle accident blocking 2 lanes — 4h delay" },
      { timestamp: "Mar 11 09:30", event: "Vehicle Slowed Near Flagstaff", location: "Near Flagstaff, AZ", source: "GPS", status: "warning" },
      { timestamp: "Mar 11 09:35", event: "ETA Recalculated (+6h)", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "GPS", status: "Slow Moving — I-40E Flagstaff", timestamp: "Mar 11 21:30", freshness: "30m ago", aligned: true, fresh: true },
      { source: "Traffic API", status: "Major Incident — I-40E Flagstaff", timestamp: "Mar 11 09:00", freshness: "12h ago", aligned: null, fresh: true },
      { source: "Carrier Portal", status: "In Transit", timestamp: "Mar 11 16:00", freshness: "6h ago", aligned: true, fresh: true },
    ],
    exceptionReason: "ETA drift beyond 2h road threshold",
    exceptionTrigger: "Traffic API incident on route; GPS confirms speed drop",
    likelyCause: "Multi-vehicle accident on I-40 East near Flagstaff blocking 2 lanes — 4h clearance time",
    businessImpact: "ETA slipped +6h — Chicago hub receiving window may close before arrival; dray origin is ocean import from India/China lane",
    otmStatus: "Pending Update",
    notificationStatus: "Not Yet Sent",
    agentSummary: "Shipment SHP-60441 (Schneider dray from LAX — ocean import) is delayed 6 hours due to a multi-vehicle accident on I-40 East near Flagstaff. This is an intermodal last-mile leg for cargo that originated in Asia. Revised ETA is Mar 12 00:00. Recommend approving OTM ETA update and notifying Chicago hub team to reschedule receiving.",
    lane: "LAX→CHI",
    lat: 35.2,
    lng: -111.6,
  },

  // Scenario 7: Air — Mumbai → Los Angeles (Long Dwell at Hub)
  {
    id: "SHP-70991",
    mode: "Air",
    carrier: "Emirates SkyCargo",
    trackingRef: "AWB: 176-88990011",
    origin: "Mumbai, IN",
    destination: "Los Angeles, US",
    plant: "LAX Receiving Dock B",
    currentStatus: "Long Dwell at DXB Transfer Hub",
    plannedETA: "Mar 12, 2025 06:00",
    revisedETA: "Mar 13, 2025 06:00",
    delayHours: 24,
    exceptionType: "Long Dwell",
    severity: "Critical",
    lastSignal: "1h ago",
    lastSignalSource: "Carrier Portal",
    recommendedAction: "Escalate + Notify Plant",
    reasonChips: [{ label: "Hub Dwell", type: "port" }, { label: "Critical Material", type: "deviation" }],
    etaConfidence: 60,
    cutoffTime: "Mar 13, 2025 08:00",
    criticalMaterial: true,
    timeline: [
      { timestamp: "Mar 11 02:00", event: "Freight Accepted at BOM", location: "Mumbai Airport, IN", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 11 05:00", event: "Departed Mumbai (EK501)", location: "Mumbai, IN", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 11 08:00", event: "Arrived Dubai DXB Hub", location: "Dubai, UAE", source: "Carrier Portal", status: "ok" },
      { timestamp: "Mar 12 08:00", event: "Dwell Threshold Exceeded — 24h at DXB", location: "Dubai, UAE", source: "System Alert", status: "critical", anomaly: "Cargo not loaded on any outbound flight to LAX" },
      { timestamp: "Mar 12 09:00", event: "Long Dwell Alert — Critical Material", location: "System", source: "Agent", status: "critical" },
      { timestamp: "Mar 12 09:05", event: "ETA Recalculated (+24h)", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "Carrier Portal", status: "At DXB Hub — Awaiting Outbound", timestamp: "Mar 12 13:00", freshness: "1h ago", aligned: true, fresh: true },
      { source: "GNosis", status: "In Transit", timestamp: "Mar 12 10:00", freshness: "4h ago", aligned: false, fresh: true },
      { source: "Email", status: "No broker update", timestamp: "", freshness: "No update", aligned: null, fresh: false },
    ],
    exceptionReason: "Cargo has dwelled at DXB for 24h without being loaded — threshold exceeded",
    exceptionTrigger: "24h dwell at Emirates DXB hub without outbound booking confirmed",
    likelyCause: "Emirates capacity constraint at DXB — BOM-LAX lane heavily booked; cargo bumped twice",
    businessImpact: "ETA to LAX slipped +24h — critical automotive parts approaching receiving cutoff",
    otmStatus: "Pending Update",
    notificationStatus: "Escalated",
    agentSummary: "CRITICAL: Shipment SHP-70991 (Emirates SkyCargo, Mumbai → LA) has dwelled at Dubai DXB for 24 hours without being loaded on any outbound flight to LAX. Critical automotive parts are approaching the LAX receiving cutoff of Mar 13 08:00. Emirates capacity constraints on the BOM-LAX lane appear to be the cause. Recommend immediate escalation to Emirates cargo supervisor and evaluation of alternative routing via EY (Abu Dhabi) or QR (Doha) if next available EK departure cannot be confirmed.",
    lane: "BOM→LAX",
    lat: 25.2,
    lng: 55.4,
  },
]

export const LANE_INSIGHTS = [
  {
    lane: "SHA→LAX",
    insight: "Trans-Pacific lane SHA→LAX showing increased port dwell at LA — average +16h above baseline over last 12 vessels from Chinese ports.",
    count: 12,
    period: "30 days",
    node: "Los Angeles Port",
  },
  {
    lane: "BOM→RTM",
    insight: "Mumbai–Rotterdam lane via Suez showing AIS signal disruptions, likely due to vessel diversion around Red Sea. Add 3–5 days buffer.",
    count: 5,
    period: "3 weeks",
    node: "Red Sea / Suez",
  },
]

export const EXCEPTION_DISTRIBUTION = [
  { type: "Delay", count: 1, color: "#DC2626" },
  { type: "Missing Signal", count: 1, color: "#9CA3AF" },
  { type: "Long Dwell", count: 1, color: "#6366F1" },
  { type: "Route Deviation", count: 0, color: "#F97316" },
  { type: "Weather Disruption", count: 1, color: "#3B82F6" },
  { type: "Traffic Disruption", count: 1, color: "#F59E0B" },
  { type: "Customs Hold", count: 1, color: "#D97706" },
  { type: "Conflicting Sources", count: 1, color: "#6B7280" },
]
