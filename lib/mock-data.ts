export type TransportMode = "Ocean" | "Road" | "Air"
export type Severity = "Critical" | "High" | "Medium" | "Low"
export type ExceptionType =
  | "Schedule Slippage"
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
  disruptionContext?: string
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
    exceptionType: "Schedule Slippage",
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
    disruptionContext: "WBCT Terminal at Los Angeles port experiencing severe congestion with 22+ vessel queue. Peak import season compounding delays. Average wait time for berth assignment: 18-24 hours. Expected to ease after March 15.",
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
    businessImpact: "ETA extended by ~44h — approaching ORD hub slot deadline",
    otmStatus: "Pending Update",
    notificationStatus: "Not Yet Sent",
    agentSummary: "Shipment SHP-20334 (DHL, Shenzhen → Chicago) is held at ORD Customs under a CBP TSCA compliance review typical for Chinese electronics cargo. The estimated hold duration is 44h, with revised ETA Mar 13 10:00 — close to the hub slot window. Broker has been notified. Recommend following up with the broker every 12h for status and updating ORD hub team to adjust inbound schedule.",
    lane: "SZX→ORD",
    lat: 41.9,
    lng: -87.6,
    disruptionContext: "US CBP conducting TSCA Section 6 compliance review on electronics cargo from Shenzhen. Typical hold duration for this inspection type: 36-72 hours. Broker has been notified and is coordinating with CBP.",
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
      { timestamp: "Mar 11 06:15", event: "Delay Risk Alert — Critical Material", location: "System", source: "Agent", status: "critical", anomaly: "Assembly Line 3 deadline in 16h — escalation triggered" },
      { timestamp: "Mar 11 06:20", event: "ETA Recalculated (+10h)", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "Carrier Portal", status: "Ground Hold — PVG Weather", timestamp: "Mar 11 21:42", freshness: "18m ago", aligned: true, fresh: true },
      { source: "Weather API", status: "Severe Weather — PVG Ground Stop", timestamp: "Mar 11 20:00", freshness: "2h ago", aligned: null, fresh: true },
      { source: "GNosis", status: "In Transit", timestamp: "Mar 11 18:00", freshness: "4h ago", aligned: false, fresh: true },
    ],
    exceptionReason: "Revised ETA will miss plant receiving deadline by 8h — critical assembly parts",
    exceptionTrigger: "Weather-induced ground stop at PVG transfer hub + critical material flag",
    likelyCause: "Typhoon remnant causing ground stop and diversions at Shanghai PVG hub",
    businessImpact: "Detroit Assembly Line 3 faces 8h+ production stoppage — CRITICAL parts delayed",
    otmStatus: "Pending Update",
    notificationStatus: "Escalated",
    agentSummary: "CRITICAL: Shipment SHP-40672 (FedEx, Guangzhou → Detroit) carries critical assembly parts for Detroit Line 3. A weather-induced ground stop at Shanghai PVG has pushed revised ETA to Mar 12 06:00 — 8 hours past the plant deadline. Production stoppage is likely. Escalation has been triggered. Recommend contacting FedEx for next available departure, and alerting Line 3 management to initiate contingency planning.",
    lane: "CAN→DTW",
    lat: 31.2,
    lng: 121.3,
    disruptionContext: "Severe thunderstorm and typhoon remnant causing ground stop at Shanghai PVG hub. All outbound cargo flights grounded. Weather expected to clear by Mar 11 18:00 UTC. FedEx rebooking onto next available departure.",
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
    disruptionContext: "Multi-vehicle accident on I-40 East near Flagstaff, AZ blocking 2 of 3 lanes. Arizona DPS estimating 4-hour clearance time. Alternate route via I-17 would add 2 additional hours. GPS confirms vehicle is in the affected zone.",
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
    businessImpact: "ETA to LAX slipped +24h — critical automotive parts approaching receiving deadline",
    otmStatus: "Pending Update",
    notificationStatus: "Escalated",
    agentSummary: "CRITICAL: Shipment SHP-70991 (Emirates SkyCargo, Mumbai → LA) has dwelled at Dubai DXB for 24 hours without being loaded on any outbound flight to LAX. Critical automotive parts are approaching the LAX receiving deadline of Mar 13 08:00. Emirates capacity constraints on the BOM-LAX lane appear to be the cause. Recommend immediate escalation to Emirates cargo supervisor and evaluation of alternative routing via EY (Abu Dhabi) or QR (Doha) if next available EK departure cannot be confirmed.",
    lane: "BOM→LAX",
    lat: 25.2,
    lng: 55.4,
    disruptionContext: "Emirates SkyCargo DXB hub experiencing capacity constraints on BOM-LAX lane. Cargo has been bumped from 2 outbound flights. Next available confirmed departure slot: Mar 13 02:00 UTC.",
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
  { type: "Schedule Slippage", count: 1, color: "#DC2626" },
  { type: "Missing Signal", count: 1, color: "#9CA3AF" },
  { type: "Long Dwell", count: 1, color: "#6366F1" },
  { type: "Route Deviation", count: 0, color: "#F97316" },
  { type: "Weather Disruption", count: 1, color: "#3B82F6" },
  { type: "Traffic Disruption", count: 1, color: "#F59E0B" },
  { type: "Customs Hold", count: 1, color: "#D97706" },
  { type: "Conflicting Sources", count: 1, color: "#6B7280" },
]

// ─── Agent Activity Log ──────────────────────────────────────────────────────

export type AgentActionType = "detected" | "recalculated" | "notified" | "flagged" | "recommended" | "synced"

export interface AgentActivity {
  id: string
  timestamp: string
  actionType: AgentActionType
  description: string
  shipmentId?: string
  lane?: string
}

export const AGENT_ACTIVITIES: AgentActivity[] = [
  {
    id: "AA-001",
    timestamp: "Mar 12, 10:15",
    actionType: "detected",
    description: "Detected ETA drift on SHP-10421 (+18h) — port congestion at WBCT Terminal, Los Angeles",
    shipmentId: "SHP-10421",
    lane: "SHA→LAX",
  },
  {
    id: "AA-002",
    timestamp: "Mar 12, 10:16",
    actionType: "recalculated",
    description: "Recalculated ETA for SHP-10421: Mar 12 08:00 → Mar 13 02:00 (confidence: 79%)",
    shipmentId: "SHP-10421",
  },
  {
    id: "AA-003",
    timestamp: "Mar 12, 09:05",
    actionType: "recalculated",
    description: "Recalculated ETA for SHP-70991: Mar 12 06:00 → Mar 13 06:00 (+24h, confidence: 60%)",
    shipmentId: "SHP-70991",
  },
  {
    id: "AA-004",
    timestamp: "Mar 12, 09:00",
    actionType: "detected",
    description: "Detected dwell threshold exceeded on SHP-70991 — 24h at DXB hub without outbound booking",
    shipmentId: "SHP-70991",
    lane: "BOM→LAX",
  },
  {
    id: "AA-005",
    timestamp: "Mar 11, 15:05",
    actionType: "recalculated",
    description: "Recalculated ETA for SHP-20334: Mar 11 14:00 → Mar 13 10:00 (+44h estimated hold)",
    shipmentId: "SHP-20334",
  },
  {
    id: "AA-006",
    timestamp: "Mar 11, 14:05",
    actionType: "flagged",
    description: "Flagged conflicting signals on SHP-50219 — GPS says In Transit but forwarder email claims Arrived at Houston",
    shipmentId: "SHP-50219",
    lane: "MAA→HOU",
  },
  {
    id: "AA-007",
    timestamp: "Mar 11, 09:35",
    actionType: "recalculated",
    description: "Recalculated ETA for SHP-60441 (+6h) — traffic incident on I-40E near Flagstaff confirmed by Traffic API and GPS",
    shipmentId: "SHP-60441",
  },
  {
    id: "AA-008",
    timestamp: "Mar 11, 06:20",
    actionType: "recalculated",
    description: "Recalculated ETA for SHP-40672 (+10h) — weather ground stop at PVG transfer hub",
    shipmentId: "SHP-40672",
  },
  {
    id: "AA-009",
    timestamp: "Mar 11, 06:15",
    actionType: "notified",
    description: "Triggered critical escalation for SHP-40672 — Detroit Assembly Line 3 schedule at risk, plant management notified",
    shipmentId: "SHP-40672",
    lane: "CAN→DTW",
  },
  {
    id: "AA-010",
    timestamp: "Mar 11, 06:00",
    actionType: "detected",
    description: "Pulled weather data: severe storm warning at Shanghai PVG — ground stop affecting all outbound cargo",
    shipmentId: "SHP-40672",
  },
  {
    id: "AA-011",
    timestamp: "Mar 10, 22:00",
    actionType: "recommended",
    description: "Recommended contacting Maersk vessel ops for SHP-30188 — AIS signal lost 9h ago in Arabian Sea",
    shipmentId: "SHP-30188",
    lane: "BOM→RTM",
  },
  {
    id: "AA-012",
    timestamp: "Mar 10, 18:00",
    actionType: "detected",
    description: "Detected lane pattern: SHA→LAX lane has 12 delays in 30 days at Los Angeles port — average +16h above baseline",
    lane: "SHA→LAX",
  },
  {
    id: "AA-013",
    timestamp: "Mar 10, 14:00",
    actionType: "synced",
    description: "Synced 5 ETA updates to OTM for active shipments — 2 pending coordinator approval",
  },
  {
    id: "AA-014",
    timestamp: "Mar 10, 10:00",
    actionType: "notified",
    description: "Drafted delay notification for LAX Distribution Center team regarding SHA→LAX lane congestion pattern",
    lane: "SHA→LAX",
  },
  {
    id: "AA-015",
    timestamp: "Mar 12, 08:45",
    actionType: "recommended",
    description: "Generated 3 reroute options for SHP-40672 via HKG/PEK bypass — awaiting coordinator approval",
    shipmentId: "SHP-40672",
    lane: "CAN→DTW",
  },
  {
    id: "AA-016",
    timestamp: "Mar 12, 07:30",
    actionType: "synced",
    description: "Queried COSCO vessel portal for SHP-10421 — no berth update; retry scheduled in 2h",
    shipmentId: "SHP-10421",
  },
  {
    id: "AA-017",
    timestamp: "Mar 11, 23:15",
    actionType: "detected",
    description: "Recovered AIS signal for SHP-30188 — vessel at 14.2°N 62.8°E, speed 11.4 kn, heading 322°",
    shipmentId: "SHP-30188",
    lane: "BOM→RTM",
  },
  {
    id: "AA-018",
    timestamp: "Mar 11, 23:20",
    actionType: "recalculated",
    description: "Recalculated ETA for SHP-30188 via AIS recovery: +12h adjustment — new ETA Mar 16 06:00 (confidence 58%)",
    shipmentId: "SHP-30188",
  },
]

// ─── Reroute Options ─────────────────────────────────────────────────────────

export interface RerouteOption {
  id: string
  label: string
  via: string
  etaDeltaHours: number
  additionalCostUSD: number
  carrier: string
  confidence: number
  recommended: boolean
  note: string
}

export const REROUTE_OPTIONS: Partial<Record<string, RerouteOption[]>> = {
  "SHP-40672": [
    {
      id: "A",
      label: "Original Route",
      via: "SHA → PVG → ORD → DTW",
      etaDeltaHours: 10,
      additionalCostUSD: 0,
      carrier: "FedEx International",
      confidence: 45,
      recommended: false,
      note: "PVG ground stop expected to lift by 18:00 UTC. High uncertainty on timing.",
    },
    {
      id: "B",
      label: "HKG Bypass",
      via: "SHA → HKG → LAX → DTW",
      etaDeltaHours: 6,
      additionalCostUSD: 2400,
      carrier: "FedEx International",
      confidence: 88,
      recommended: true,
      note: "HKG operates normally. LAX→DTW transfer confirmed. Best ETA vs. cost trade-off.",
    },
    {
      id: "C",
      label: "PEK Diversion",
      via: "SHA → PEK → ORD → DTW",
      etaDeltaHours: 8,
      additionalCostUSD: 800,
      carrier: "FedEx International",
      confidence: 70,
      recommended: false,
      note: "PEK capacity limited but available. Middle option on cost vs. ETA delta.",
    },
  ],
  "SHP-70991": [
    {
      id: "A",
      label: "Hold at DXB",
      via: "DXB → JFK → LAX",
      etaDeltaHours: 36,
      additionalCostUSD: 0,
      carrier: "Emirates SkyCargo",
      confidence: 40,
      recommended: false,
      note: "Hub capacity advisory still active. Estimated additional 2-day hold at DXB.",
    },
    {
      id: "B",
      label: "BOM Reroute via FRA",
      via: "BOM → FRA → LAX",
      etaDeltaHours: 12,
      additionalCostUSD: 3100,
      carrier: "Emirates SkyCargo EK7723+EK7731",
      confidence: 85,
      recommended: true,
      note: "Pharma cold-chain (2–8°C) maintained throughout. Earliest departure Mar 13.",
    },
    {
      id: "C",
      label: "BOM via AUH",
      via: "BOM → AUH → JFK → LAX",
      etaDeltaHours: 20,
      additionalCostUSD: 1600,
      carrier: "Etihad Airways Cargo",
      confidence: 72,
      recommended: false,
      note: "Etihad AUH slot available Mar 13. Carrier switch adds rebooking complexity.",
    },
  ],
  "SHP-60441": [
    {
      id: "A",
      label: "Wait on I-40E",
      via: "I-40E (current)",
      etaDeltaHours: 6,
      additionalCostUSD: 0,
      carrier: "Midwest Express Freight",
      confidence: 55,
      recommended: false,
      note: "Incident near Flagstaff. Clearance estimate: 4–8h. High variance.",
    },
    {
      id: "B",
      label: "US-89 → I-17 Bypass",
      via: "I-40W → US-89S → I-17N → I-40E",
      etaDeltaHours: 3,
      additionalCostUSD: 220,
      carrier: "Midwest Express Freight",
      confidence: 91,
      recommended: true,
      note: "62-mile detour but avoids incident entirely. GPS confirms clear routing.",
    },
    {
      id: "C",
      label: "NM-6 → I-25 Alternate",
      via: "I-40 → NM-6 → I-25N → I-40E",
      etaDeltaHours: 4,
      additionalCostUSD: 310,
      carrier: "Midwest Express Freight",
      confidence: 76,
      recommended: false,
      note: "Longer mileage but fully clear. Option if US-89 develops congestion.",
    },
  ],
}

// ─── Supporting Documents ────────────────────────────────────────────────────

export type DocStatus = "verified" | "received" | "pending" | "missing" | "na"

export interface ShipmentDocument {
  docType: string
  status: DocStatus
  source: string
  receivedAt?: string
  notes?: string
}

export interface ShipmentDocSet {
  shipmentId: string
  docs: ShipmentDocument[]
}

export const SHIPMENT_DOCUMENTS: ShipmentDocSet[] = [
  {
    shipmentId: "SHP-10421",
    docs: [
      { docType: "Bill of Lading", status: "verified", source: "GNosis", receivedAt: "Mar 05, 09:30" },
      { docType: "Commercial Invoice", status: "verified", source: "Carrier Portal", receivedAt: "Mar 04, 17:00" },
      { docType: "Packing List", status: "verified", source: "Carrier Portal", receivedAt: "Mar 04, 17:05" },
      { docType: "ISF Filing (10+2)", status: "received", source: "UiPath", receivedAt: "Mar 03, 14:00", notes: "Filed — awaiting CBP acknowledgement" },
      { docType: "Certificate of Origin", status: "received", source: "Email", receivedAt: "Mar 04, 10:00" },
      { docType: "Dangerous Goods Decl.", status: "na", source: "—" },
    ],
  },
  {
    shipmentId: "SHP-20334",
    docs: [
      { docType: "Bill of Lading", status: "verified", source: "GNosis", receivedAt: "Mar 06, 08:00" },
      { docType: "Commercial Invoice", status: "received", source: "Carrier Portal", receivedAt: "Mar 06, 09:00" },
      { docType: "Packing List", status: "received", source: "Email", receivedAt: "Mar 06, 09:05" },
      { docType: "ISF Filing (10+2)", status: "verified", source: "UiPath", receivedAt: "Mar 04, 11:00" },
      { docType: "TSCA Compliance Cert.", status: "pending", source: "—", notes: "Required for CBP hold release — broker coordinating" },
      { docType: "Certificate of Origin", status: "received", source: "Email", receivedAt: "Mar 05, 14:00" },
    ],
  },
  {
    shipmentId: "SHP-30178",
    docs: [
      { docType: "Bill of Lading", status: "missing", source: "—", notes: "Last known location: carrier portal — signal lost Mar 14" },
      { docType: "Commercial Invoice", status: "received", source: "Email", receivedAt: "Mar 08, 11:00" },
      { docType: "Packing List", status: "received", source: "Email", receivedAt: "Mar 08, 11:05" },
      { docType: "ISF Filing (10+2)", status: "verified", source: "UiPath", receivedAt: "Mar 07, 09:00" },
      { docType: "Certificate of Origin", status: "pending", source: "—", notes: "Requested from shipper — no response" },
    ],
  },
  {
    shipmentId: "SHP-40672",
    docs: [
      { docType: "Air Waybill (AWB)", status: "verified", source: "Carrier Portal", receivedAt: "Mar 11, 06:00" },
      { docType: "Commercial Invoice", status: "verified", source: "Carrier Portal", receivedAt: "Mar 10, 17:00" },
      { docType: "Packing List", status: "verified", source: "Carrier Portal", receivedAt: "Mar 10, 17:05" },
      { docType: "MSDS / SDS", status: "pending", source: "—", notes: "Required for DG pre-clearance at LAX — shipper to provide" },
      { docType: "DG Declaration", status: "pending", source: "—", notes: "Awaiting MSDS before filing" },
      { docType: "Certificate of Origin", status: "received", source: "Email", receivedAt: "Mar 10, 12:00" },
    ],
  },
  {
    shipmentId: "SHP-50219",
    docs: [
      { docType: "Bill of Lading", status: "verified", source: "GNosis", receivedAt: "Mar 01, 14:00" },
      { docType: "Commercial Invoice", status: "received", source: "Email", receivedAt: "Mar 01, 15:00", notes: "Version mismatch with carrier portal copy — broker to reconcile" },
      { docType: "Packing List", status: "received", source: "Email", receivedAt: "Mar 01, 15:05" },
      { docType: "ISF Filing (10+2)", status: "verified", source: "UiPath", receivedAt: "Feb 28, 10:00" },
      { docType: "Certificate of Origin", status: "verified", source: "Email", receivedAt: "Mar 01, 09:00" },
    ],
  },
  {
    shipmentId: "SHP-60441",
    docs: [
      { docType: "Bill of Lading", status: "verified", source: "GNosis", receivedAt: "Mar 07, 13:00" },
      { docType: "Commercial Invoice", status: "verified", source: "Carrier Portal", receivedAt: "Mar 07, 14:00" },
      { docType: "Packing List", status: "verified", source: "Carrier Portal", receivedAt: "Mar 07, 14:05" },
      { docType: "Certificate of Origin", status: "verified", source: "Email", receivedAt: "Mar 06, 16:00" },
    ],
  },
  {
    shipmentId: "SHP-70991",
    docs: [
      { docType: "Air Waybill (AWB)", status: "verified", source: "Carrier Portal", receivedAt: "Mar 09, 11:00" },
      { docType: "Commercial Invoice", status: "received", source: "Email", receivedAt: "Mar 09, 12:00" },
      { docType: "Packing List", status: "received", source: "Email", receivedAt: "Mar 09, 12:05" },
      { docType: "MSDS / SDS", status: "verified", source: "Email", receivedAt: "Mar 08, 16:00" },
      { docType: "DG Declaration", status: "received", source: "Carrier Portal", receivedAt: "Mar 09, 10:00", notes: "Under DXB customs review" },
      { docType: "Certificate of Origin", status: "received", source: "Email", receivedAt: "Mar 09, 09:00" },
    ],
  },
]

// ─── Inbox Emails ─────────────────────────────────────────────────────────────

export type EmailTag = "carrier" | "customs" | "weather" | "compliance" | "advisory" | "agent"

export interface InboxEmail {
  id: string
  from: string
  fromName: string
  subject: string
  preview: string
  body: string
  timestamp: string
  read: boolean
  shipmentId?: string
  tag: EmailTag
}

export const INBOX_EMAILS: InboxEmail[] = [
  {
    id: "EM-001",
    from: "noreply@cosco.com",
    fromName: "COSCO Shipping",
    subject: "ETA Advisory — COSU8812045 — Port Congestion at Los Angeles",
    preview: "Dear Shipper, Please be advised that vessel COSCO GLORY has arrived at San Pedro Bay but is experiencing extended wait time for berth assignment...",
    body: `Dear Shipper,

Please be advised that vessel COSCO GLORY (Voyage 2024W12) has arrived at San Pedro Bay but is experiencing extended wait time for berth assignment due to significant congestion at WBCT Terminal.

Current Status: Vessel at anchor — Position: 33.7° N, 118.3° W
Expected Berth Assignment: Mar 13, 2025 ~02:00 local
Revised Cargo Available Date: Mar 13, 2025 ~10:00 local

Your shipment COSU8812045 is on board and will be discharged once berth is confirmed. Our operations team is monitoring closely.

We apologize for the inconvenience. Please contact your local COSCO agent for further queries.

Best regards,
COSCO Shipping Operations`,
    timestamp: "Mar 12, 09:45",
    read: false,
    shipmentId: "SHP-10421",
    tag: "carrier",
  },
  {
    id: "EM-002",
    from: "cbp.autimated@dhs.gov",
    fromName: "U.S. Customs and Border Protection",
    subject: "HOLD NOTICE — Shipment SHP-20334 — TSCA Section 6 Review",
    preview: "This is an automated notice from U.S. Customs and Border Protection. Entry #ORD-2024-98812 has been selected for TSCA Section 6 compliance review...",
    body: `AUTOMATED NOTICE — U.S. Customs and Border Protection

Entry Number: ORD-2024-98812
Carrier: United Airlines Cargo
Commodity: Electronics Components
Port of Entry: Chicago O'Hare (ORD)

This shipment has been selected for TSCA Section 6 compliance review for electronics cargo originating from Shenzhen, China.

Required Documentation:
- TSCA Compliance Certificate (Section 6(a))
- Supplier Declaration of Compliance
- SDS/MSDS for applicable substances

Please submit documentation to your licensed customs broker within 48 hours to avoid extended hold. Failure to provide documentation may result in shipment refusal.

For inquiries: cbp-ord@dhs.gov`,
    timestamp: "Mar 11, 16:20",
    read: true,
    shipmentId: "SHP-20334",
    tag: "customs",
  },
  {
    id: "EM-003",
    from: "ops-alerts@fedex.com",
    fromName: "FedEx Cargo Operations",
    subject: "Flight Disruption — SQ7301 Cancelled — Cargo Rebooking in Progress",
    preview: "Dear Customer, We regret to inform you that FedEx flight operating as SQ7301 PVG→LAX scheduled for Mar 11 has been cancelled due to severe weather...",
    body: `Dear Customer,

We regret to inform you that FedEx cargo operating on SQ7301 (PVG→LAX, Mar 11 departure) has been cancelled due to a severe weather ground stop at Shanghai Pudong International Airport (PVG).

Your Shipment: AWB 7489 2234 5521
Status: Held at PVG — Rebooking in progress
Next Available Departure: Mar 12, 22:00 (pending slot confirmation)
Revised ETA Los Angeles: Mar 13, 10:00 (estimated)

We are working with ground handling to expedite loading on the next available departure. You will receive an updated AWB scan notification once cargo is loaded.

We sincerely apologize for this disruption. For urgent inquiries, please contact FedEx International Priority support.

FedEx Cargo Operations`,
    timestamp: "Mar 11, 07:15",
    read: false,
    shipmentId: "SHP-40672",
    tag: "weather",
  },
  {
    id: "EM-004",
    from: "alerts@maersk.com",
    fromName: "Maersk Line",
    subject: "Port Advisory: West Coast Port Congestion — March 2025",
    preview: "Maersk wishes to advise all customers of ongoing congestion at major West Coast ports including Los Angeles/Long Beach. Vessel dwell times are averaging...",
    body: `CUSTOMER ADVISORY — Maersk Line
Reference: MCO-2025-03-WC

Maersk wishes to advise all customers of ongoing congestion at major West Coast ports including Los Angeles/Long Beach. Current conditions:

• Average vessel anchorage wait: 2–4 days
• WBCT Terminal particularly impacted (22+ vessel queue)
• Peak import season compounding existing congestion
• Expected relief: Mid-March as import volumes normalize

We recommend:
1. Advising consignees of likely delays
2. Booking inland transport with flexibility (48h buffer)
3. Contacting your local Maersk office for demurrage waivers

This advisory applies to all westbound Trans-Pacific services.

Maersk Customer Operations`,
    timestamp: "Mar 10, 14:00",
    read: true,
    tag: "advisory",
  },
  {
    id: "EM-005",
    from: "cargo@emirates.com",
    fromName: "Emirates SkyCargo",
    subject: "Re: SHP-70991 — Cargo Rebooking — BOM-DXB-LAX",
    preview: "Dear Valued Customer, This is to inform you that your shipment AWB 176-21093445 was offloaded from EK8821 (DXB→LAX) on Mar 12 due to capacity constraints...",
    body: `Dear Valued Customer,

This is to inform you that your shipment AWB 176-21093445 was offloaded from EK8821 (DXB→LAX) on Mar 12 due to capacity constraints at Dubai hub.

Shipment Details:
AWB: 176-21093445
Route: BOM → DXB → LAX
Weight: 847 kg / 6.2 CBM
Commodity: Electronic Components

Rebooking Status:
You have been confirmed on EK8833 (DXB→LAX) departing Mar 13, 02:00 GST
Revised ETA Los Angeles: Mar 13, 16:00 local time

We apologize for this inconvenience. As a courtesy, we will waive the storage charges for the additional hold period at DXB.

Emirates SkyCargo Customer Experience`,
    timestamp: "Mar 12, 08:30",
    read: false,
    shipmentId: "SHP-70991",
    tag: "carrier",
  },
  {
    id: "EM-006",
    from: "noreply@weatherrouting.com",
    fromName: "WeatherRouting Inc.",
    subject: "Marine Weather Alert — Arabian Sea — Vessel Signal Advisory",
    preview: "NAVIGATIONAL ADVISORY: Tropical low-pressure system developing in northern Arabian Sea. Vessels transiting BOM-RTM route via Lakshadweep Sea should expect...",
    body: `MARINE WEATHER ADVISORY
Issued: Mar 10, 2025 18:00 UTC
Area: Arabian Sea (Northern) — Lakshadweep Sea

TROPICAL LOW PRESSURE SYSTEM developing approx. 14°N 68°E. Expected to strengthen over next 48-72 hours.

AFFECTED ROUTES:
• BOM → RTM (via Suez/Red Sea)
• Chennai → Mediterranean lanes

FORECAST:
Wind: 25–35 knots (seas 3–5m)
Visibility: Moderate, occasional reduced in squalls
Movement: WNW at 10 knots

MARINERS: Exercise extreme caution. AIS signal reliability may be reduced in this region. Recommend alternative routing north of affected area.

This advisory is relevant to SHP-30178 operating on the BOM→RTM lane.

WeatherRouting Inc. — Marine Operations`,
    timestamp: "Mar 10, 20:00",
    read: false,
    shipmentId: "SHP-30178",
    tag: "weather",
  },
  {
    id: "EM-007",
    from: "procurement@globalparts.com",
    fromName: "Global Parts Procurement",
    subject: "New Purchase Order Confirmed — PO-88321 / MSC CHLOE V.423E",
    preview: "Hi team, PO-88321 for 240 units Tier-1 battery modules has been confirmed. Carrier reference SHP-50219 / MSC CHLOE V.423E. Please add to ETA monitoring...",
    body: `Hi Operations Team,

PO-88321 for 240 units Tier-1 battery modules (Chennai plant, Lot C-2025-03) has been confirmed and is now in transit.

Carrier Reference: SHP-50219
Vessel: MSC CHLOE V.423E
Booking: MSCUQ882103
Route: Chennai (INNSA) → Houston (USTXH)
ETD Chennai: Mar 12, 2025
ETA Houston: Mar 18, 2025
Port of Load: Nhava Sheva (INNSA)

Please add shipment reference SHP-50219 to the ETA monitoring system and advise on current status and any exceptions. This order is tied to the Q2 battery assembly schedule.

Regards,
Sarah Chen
Global Parts Procurement`,
    timestamp: "Mar 12, 11:30",
    read: false,
    tag: "agent",
  },
]

// ─── Carrier Scorecards ────────────────────────────────────────────────────────

export type CarrierRating = "preferred" | "monitor" | "caution"
export type PerformanceTrend = "improving" | "declining" | "stable"

export interface CarrierScorecard {
  carrier: string
  modes: TransportMode[]
  activeShipments: number
  otpPercent: number           // on-time performance %
  avgDelayHours: number
  exceptionRate: number        // % of shipments with exceptions
  trackingCompliance: number   // % with tracking events
  trend: PerformanceTrend
  rating: CarrierRating
  lanes: string[]
}

export const CARRIER_SCORECARDS: CarrierScorecard[] = [
  {
    carrier: "COSCO Shipping",
    modes: ["Ocean"],
    activeShipments: 2,
    otpPercent: 62,
    avgDelayHours: 22,
    exceptionRate: 50,
    trackingCompliance: 94,
    trend: "declining",
    rating: "monitor",
    lanes: ["SHA→LAX", "SHA→LGB"],
  },
  {
    carrier: "Maersk Line",
    modes: ["Ocean"],
    activeShipments: 1,
    otpPercent: 71,
    avgDelayHours: 14,
    exceptionRate: 30,
    trackingCompliance: 98,
    trend: "stable",
    rating: "preferred",
    lanes: ["BOM→RTM"],
  },
  {
    carrier: "United Airlines Cargo",
    modes: ["Air"],
    activeShipments: 1,
    otpPercent: 44,
    avgDelayHours: 44,
    exceptionRate: 100,
    trackingCompliance: 89,
    trend: "declining",
    rating: "caution",
    lanes: ["SZX→ORD"],
  },
  {
    carrier: "FedEx International",
    modes: ["Air"],
    activeShipments: 1,
    otpPercent: 55,
    avgDelayHours: 10,
    exceptionRate: 100,
    trackingCompliance: 97,
    trend: "stable",
    rating: "monitor",
    lanes: ["CAN→DTW"],
  },
  {
    carrier: "Amazon Freight",
    modes: ["Road"],
    activeShipments: 1,
    otpPercent: 82,
    avgDelayHours: 6,
    exceptionRate: 100,
    trackingCompliance: 100,
    trend: "stable",
    rating: "preferred",
    lanes: ["LAX→CHI"],
  },
  {
    carrier: "MSC Mediterranean",
    modes: ["Ocean"],
    activeShipments: 1,
    otpPercent: 67,
    avgDelayHours: 18,
    exceptionRate: 100,
    trackingCompliance: 91,
    trend: "improving",
    rating: "monitor",
    lanes: ["MAA→HOU"],
  },
  {
    carrier: "Emirates SkyCargo",
    modes: ["Air"],
    activeShipments: 1,
    otpPercent: 58,
    avgDelayHours: 24,
    exceptionRate: 100,
    trackingCompliance: 93,
    trend: "declining",
    rating: "caution",
    lanes: ["BOM→LAX"],
  },
]

// ─── Port Intelligence ─────────────────────────────────────────────────────────

export type CongestionLevel = "Low" | "Medium" | "High" | "Critical"

export interface PortStatus {
  code: string
  name: string
  country: string
  congestionLevel: CongestionLevel
  vesselQueue: number
  avgBerthWait: string
  avgDwell: string
  trend: "improving" | "worsening" | "stable"
  affectedLanes: string[]
  note: string
}

export const PORT_STATUS: PortStatus[] = [
  {
    code: "USLAX",
    name: "Los Angeles / Long Beach",
    country: "US",
    congestionLevel: "High",
    vesselQueue: 22,
    avgBerthWait: "18–24h",
    avgDwell: "4.2 days",
    trend: "worsening",
    affectedLanes: ["SHA→LAX", "CAN→LAX"],
    note: "WBCT Terminal — peak import season, 22 vessels at anchor",
  },
  {
    code: "CNPVG",
    name: "Shanghai Pudong (PVG)",
    country: "CN",
    congestionLevel: "Critical",
    vesselQueue: 0,
    avgBerthWait: "Ground Stop",
    avgDwell: "N/A",
    trend: "worsening",
    affectedLanes: ["CAN→DTW", "SHA→LAX"],
    note: "Typhoon remnant — outbound cargo flights suspended until Mar 11 18:00 UTC",
  },
  {
    code: "NLRTM",
    name: "Rotterdam",
    country: "NL",
    congestionLevel: "Low",
    vesselQueue: 2,
    avgBerthWait: "2–4h",
    avgDwell: "1.8 days",
    trend: "stable",
    affectedLanes: ["BOM→RTM", "SHA→RTM"],
    note: "Normal operations — ECT Delta Terminal at 88% capacity",
  },
  {
    code: "AEDXB",
    name: "Dubai / Jebel Ali",
    country: "AE",
    congestionLevel: "Medium",
    vesselQueue: 6,
    avgBerthWait: "8–12h",
    avgDwell: "2.9 days",
    trend: "stable",
    affectedLanes: ["BOM→LAX", "SIN→EU"],
    note: "DXB air hub at 85% capacity — minor rebooking delays expected",
  },
  {
    code: "INBOM",
    name: "Mumbai (JNPT)",
    country: "IN",
    congestionLevel: "Medium",
    vesselQueue: 9,
    avgBerthWait: "10–16h",
    avgDwell: "3.1 days",
    trend: "improving",
    affectedLanes: ["BOM→RTM", "BOM→LAX"],
    note: "Customs pre-clearance delays for select HTS categories",
  },
]

// ─── Lane Performance ──────────────────────────────────────────────────────────

export interface LanePerformance {
  lane: string
  mode: TransportMode
  origin: string
  destination: string
  otifPercent: number
  avgTransitDays: number
  activeShipments: number
  avgDelayHours: number
  riskLevel: "Low" | "Medium" | "High" | "Critical"
  preferredCarrier: string
}

export const LANE_PERFORMANCE: LanePerformance[] = [
  { lane: "SHA→LAX", mode: "Ocean", origin: "Shanghai, CN", destination: "Los Angeles, US", otifPercent: 45, avgTransitDays: 14, activeShipments: 2, avgDelayHours: 28, riskLevel: "High", preferredCarrier: "Maersk" },
  { lane: "BOM→RTM", mode: "Ocean", origin: "Mumbai, IN", destination: "Rotterdam, NL", otifPercent: 58, avgTransitDays: 22, activeShipments: 1, avgDelayHours: 19, riskLevel: "High", preferredCarrier: "Maersk" },
  { lane: "CAN→DTW", mode: "Air", origin: "Guangzhou, CN", destination: "Detroit, US", otifPercent: 31, avgTransitDays: 1, activeShipments: 1, avgDelayHours: 10, riskLevel: "Critical", preferredCarrier: "Delta Cargo" },
  { lane: "SZX→ORD", mode: "Air", origin: "Shenzhen, CN", destination: "Chicago, US", otifPercent: 52, avgTransitDays: 1, activeShipments: 1, avgDelayHours: 44, riskLevel: "High", preferredCarrier: "FedEx Intl" },
  { lane: "LAX→CHI", mode: "Road", origin: "Los Angeles, US", destination: "Chicago, US", otifPercent: 83, avgTransitDays: 2, activeShipments: 1, avgDelayHours: 6, riskLevel: "Medium", preferredCarrier: "Amazon Freight" },
  { lane: "MAA→HOU", mode: "Ocean", origin: "Chennai, IN", destination: "Houston, US", otifPercent: 67, avgTransitDays: 25, activeShipments: 1, avgDelayHours: 12, riskLevel: "Medium", preferredCarrier: "MSC" },
  { lane: "BOM→LAX", mode: "Air", origin: "Mumbai, IN", destination: "Los Angeles, US", otifPercent: 54, avgTransitDays: 2, activeShipments: 1, avgDelayHours: 24, riskLevel: "High", preferredCarrier: "Emirates SkyCargo" },
]

// ─── Detention & Demurrage Risk ────────────────────────────────────────────────

export interface DDRisk {
  shipmentId: string
  carrier: string
  port: string
  mode: TransportMode
  daysExposed: number
  dailyRateUSD: number
  totalExposureUSD: number
  status: "accumulating" | "at-risk" | "resolved"
  note: string
}

export const DD_RISKS: DDRisk[] = [
  {
    shipmentId: "SHP-10421",
    carrier: "COSCO",
    port: "Los Angeles (WBCT)",
    mode: "Ocean",
    daysExposed: 2,
    dailyRateUSD: 350,
    totalExposureUSD: 700,
    status: "accumulating",
    note: "Vessel at anchor since Mar 12 06:00. Free time expires Mar 13.",
  },
  {
    shipmentId: "SHP-40672",
    carrier: "FedEx International",
    port: "Shanghai PVG",
    mode: "Air",
    daysExposed: 1,
    dailyRateUSD: 850,
    totalExposureUSD: 850,
    status: "accumulating",
    note: "Ground stop cargo held in temp facility. Storage fees accruing.",
  },
  {
    shipmentId: "SHP-70991",
    carrier: "Emirates SkyCargo",
    port: "Dubai DXB Hub",
    mode: "Air",
    daysExposed: 3,
    dailyRateUSD: 620,
    totalExposureUSD: 1860,
    status: "at-risk",
    note: "Dwell exceeds 72h. Hub transfer delayed by capacity constraints.",
  },
  {
    shipmentId: "SHP-30188",
    carrier: "Maersk Line",
    port: "Arabian Sea (AIS Loss)",
    mode: "Ocean",
    daysExposed: 0,
    dailyRateUSD: 275,
    totalExposureUSD: 0,
    status: "at-risk",
    note: "AIS signal lost. Port entry fees may apply on arrival.",
  },
]
