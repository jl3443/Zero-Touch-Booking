"use client"

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet"
import { SHIPMENTS } from "@/lib/mock-data"
import type { Shipment } from "@/lib/mock-data"
import "leaflet/dist/leaflet.css"

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "#DC2626",
  High: "#F59E0B",
  Medium: "#FBBF24",
  Low: "#22C55E",
}

interface LeafletMapProps {
  onShipmentClick?: (s: Shipment) => void
}

export default function LeafletMap({ onShipmentClick }: LeafletMapProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={0}
      minZoom={0}
      maxZoom={4}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
      />
      {SHIPMENTS.map((s) => {
        const color = SEVERITY_COLOR[s.severity] ?? "#3B82F6"
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={s.severity === "Critical" ? 8 : 6}
            pathOptions={{
              color: "white",
              weight: 2,
              fillColor: color,
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onShipmentClick?.(s),
            }}
          >
            <Popup>
              <div className="text-xs leading-snug">
                <div className="font-mono font-bold text-blue-700">{s.id}</div>
                <div className="text-gray-600">{s.carrier}</div>
                <div className="text-gray-500">{s.origin} → {s.destination}</div>
                {s.delayHours > 0 && (
                  <div className="text-red-600 font-semibold mt-0.5">+{s.delayHours}h delay</div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
