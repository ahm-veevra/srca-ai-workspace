"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

import { type MapIncident, type MapPoint, type MapRegion, type Status } from "@/lib/command-center-types";

// Marker colours (fixed hex so they render correctly inside Leaflet's own DOM panes).
const STATUS_FILL: Record<Status, string> = { good: "#22c55e", warn: "#f59e0b", critical: "#ef4444" };
const PRIORITY: Record<"high" | "medium" | "low", string> = { high: "#ef4444", medium: "#f59e0b", low: "#3b82f6" };

// Inverse of the projection used to place map_x/map_y in the data lake → recover [lat, lon].
// (x = (lon−34.5)/21.2·100 ; y = (32.2−lat)/16.2·76)
export const toLatLng = (x: number, y: number): [number, number] => [
  32.2 - (y / 76) * 16.2,
  34.5 + (x / 100) * 21.2,
];

const SAUDI_BOUNDS: L.LatLngBoundsExpression = [
  [16.0, 34.3],
  [32.4, 55.9],
];

function dot(color: string, size: number, ring = 4) {
  return `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)${ring ? `,0 0 0 ${ring}px ${color}22` : ""}"></span>`;
}
function regionIcon(name: string, color: string, selected: boolean) {
  const s = selected ? 15 : 12;
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [s / 2, s / 2],
    html: `<div style="display:flex;align-items:center;gap:5px;white-space:nowrap">${dot(color, s, 0)}
      <span style="font:600 12px/1 system-ui,sans-serif;color:#111;background:rgba(255,255,255,.92);padding:2px 6px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,.25)">${name}</span></div>`,
  });
}
function stationIcon() {
  return L.divIcon({
    className: "", iconSize: [14, 14], iconAnchor: [7, 7],
    html: `<span style="display:block;width:14px;height:14px;border-radius:3px;background:#f59e0b;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)"></span>`,
  });
}
function hospitalIcon() {
  return L.divIcon({
    className: "", iconSize: [16, 16], iconAnchor: [8, 8],
    html: `<span style="position:relative;display:block;width:16px;height:16px;border-radius:50%;background:#2f7dd1;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)"><span style="position:absolute;inset:0;color:#fff;font:700 12px/16px sans-serif;text-align:center">+</span></span>`,
  });
}
function incidentIcon(color: string) {
  return L.divIcon({ className: "", iconSize: [14, 14], iconAnchor: [7, 7], html: dot(color, 12, 5) });
}
function clusterIcon(cluster: { getChildCount: () => number }) {
  const n = cluster.getChildCount();
  return L.divIcon({
    className: "", iconSize: [34, 34],
    html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:rgba(225,37,27,.9);color:#fff;font:700 13px/1 system-ui,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
  });
}

/** Fits the Kingdom on mount and flies to a region when the focus request changes. */
function Controller({ focus, focusNonce }: { focus: MapRegion | null; focusNonce: number }) {
  const map = useMap();
  React.useEffect(() => {
    // The map mounts inside a grid cell; nudge Leaflet to re-measure so tiles fill it, then fit KSA.
    const id = window.setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(SAUDI_BOUNDS, { padding: [20, 20] });
    }, 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  React.useEffect(() => {
    if (focus) map.flyTo(toLatLng(focus.x, focus.y), 9, { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);
  return null;
}

export interface OpsMapProps {
  regions: MapRegion[];
  stations: MapPoint[];
  hospitals: MapPoint[];
  incidents: MapIncident[];
  selectedKey: string;
  onSelect: (r: MapRegion) => void;
  focus: MapRegion | null;
  focusNonce: number;
  regionName: (r: MapRegion) => string;
  labels: { station: string; hospital: string; incident: string; calls: string; active: string; avgMin: string };
}

export default function OpsMap({
  regions, stations, hospitals, incidents, selectedKey, onSelect, focus, focusNonce, regionName, labels,
}: OpsMapProps) {
  return (
    <MapContainer
      center={[24.5, 45]}
      zoom={5}
      scrollWheelZoom
      doubleClickZoom
      style={{ height: "100%", width: "100%", background: "hsl(210 20% 90%)" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        subdomains="abcd"
        maxZoom={19}
      />
      <Controller focus={focus} focusNonce={focusNonce} />

      {/* Regions — labelled city markers (not clustered, so the labels stay visible) */}
      {regions.map((r) => (
        <Marker
          key={r.key}
          position={toLatLng(r.x, r.y)}
          icon={regionIcon(regionName(r), STATUS_FILL[r.status], r.key === selectedKey)}
          eventHandlers={{ click: () => onSelect(r) }}
          zIndexOffset={500}
        >
          <Popup>
            <div style={{ minWidth: 150 }}>
              <strong>{regionName(r)}</strong>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                {labels.calls}: <b>{r.calls}</b> · {labels.active}: <b>{r.activeIncidents}</b> · {labels.avgMin}: <b>{r.avgResponse}</b>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Stations / hospitals / incidents — clustered so they never pile up at low zoom */}
      <MarkerClusterGroup chunkedLoading iconCreateFunction={clusterIcon} maxClusterRadius={45} showCoverageOnHover={false}>
        {stations.map((s, i) => (
          <Marker key={`s${i}`} position={toLatLng(s.x, s.y)} icon={stationIcon()}>
            <Popup><strong>{s.label}</strong><br />{labels.station}</Popup>
          </Marker>
        ))}
        {hospitals.map((h, i) => (
          <Marker key={`h${i}`} position={toLatLng(h.x, h.y)} icon={hospitalIcon()}>
            <Popup><strong>{h.label}</strong><br />{labels.hospital}</Popup>
          </Marker>
        ))}
        {incidents.map((inc, i) => (
          <Marker key={`i${i}`} position={toLatLng(inc.x, inc.y)} icon={incidentIcon(PRIORITY[inc.priority])}>
            <Popup><strong>{inc.label}</strong><br />{labels.incident} · {inc.priority}</Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
