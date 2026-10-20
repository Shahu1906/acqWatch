import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { fetchMapProjects, fetchFilters } from '../api';
import type { MapFeature, FiltersResponse } from '../types';
import {
  RefreshCw,
  MapPin,
  Info,
  Layers,
  LocateFixed,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Spinner, ConnectionError, getRiskColor, formatCrore } from './ui';

interface RiskMapProps {
  onSelectProject: (code: string) => void;
}

const INDIA_CENTER: [number, number] = [22.5, 82.0];
const INDIA_ZOOM = 5;

const RISK_CATEGORIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const RISK_LEGEND = [
  { cat: 'CRITICAL', label: 'Critical (81–100)' },
  { cat: 'HIGH', label: 'High (61–80)' },
  { cat: 'MEDIUM', label: 'Medium (31–60)' },
  { cat: 'LOW', label: 'Low (0–30)' },
];

function buildPopupHtml(props: MapFeature['properties']): string {
  const riskColor = props.badge_color || getRiskColor(props.risk_category);
  const delay =
    props.delay_months && props.delay_months > 0
      ? `+${props.delay_months} months`
      : 'On time';
  const cost = props.orig_cost_cr ? formatCrore(props.orig_cost_cr) : '—';
  return `
    <div style="font-family: 'Inter', sans-serif; font-size: 12px; min-width: 220px; padding: 0;">
      <div style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0;">
        <div style="font-weight: 700; color: #0f172a; font-size: 13px; line-height: 1.3; margin-bottom: 4px;">
          ${props.project_name}
        </div>
        <div style="font-family: monospace; font-size: 10px; color: #94a3b8;">
          ${props.project_code} · ${props.agency || ''}
        </div>
      </div>
      <div style="padding: 10px 14px;">
        <div style="margin-bottom: 8px;">
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 10px; color: white; background-color: ${riskColor};">
            ${props.risk_score != null ? props.risk_score + ' · ' : ''}${props.risk_category || 'N/A'}
          </span>
        </div>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; color: #334155; font-size: 11px;">
          <span style="color: #94a3b8;">State</span>
          <span style="font-weight: 500;">${props.state}</span>
          <span style="color: #94a3b8;">Sector</span>
          <span>${props.sector?.replace(' AND ', ' & ') || '—'}</span>
          <span style="color: #94a3b8;">Cost</span>
          <span>${cost}</span>
          <span style="color: #94a3b8;">Delay</span>
          <span style="color: ${props.delay_months && props.delay_months > 0 ? '#dc2626' : '#16a34a'}; font-weight: 500;">${delay}</span>
        </div>
        <div style="margin-top: 8px; font-size: 9px; color: #94a3b8; font-style: italic;">
          📍 ${props.geo_precision || 'State centroid — not GPS precise'}
        </div>
      </div>
      <div style="padding: 0 14px 12px;">
        <button
          id="map-detail-btn-${props.project_code}"
          style="width: 100%; padding: 7px; background: #0f172a; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;"
        >
          Inspect Full Analysis →
        </button>
      </div>
    </div>
  `;
}

export const RiskMap: React.FC<RiskMapProps> = ({ onSelectProject }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVisible, setTotalVisible] = useState(0);

  // Load filter options
  useEffect(() => {
    fetchFilters().then(setFilterOptions).catch(() => null);
  }, []);

  // Load geo features
  const loadFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMapProjects();
      setFeatures(data.features);
    } catch (err: any) {
      setError(err.message || 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      zoomControl: false, // we add custom controls
    });

    // Use high-reliability OpenStreetMap tile provider with CartoDB option
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    let layerGroup: any;
    if (typeof (L as any).markerClusterGroup === 'function') {
      layerGroup = (L as any).markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 200,
        chunkDelay: 50,
        maxClusterRadius: 40,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 34 : count < 100 ? 40 : 46;
          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(30,58,138,0.9);color:white;display:flex;align-items:center;justify-content:center;font-size:${count < 10 ? 12 : 11}px;font-weight:700;font-family:Inter,sans-serif;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.3);">${count < 1000 ? count : Math.round(count / 100) + 'h'}</div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      });
    } else {
      layerGroup = L.layerGroup();
    }

    map.addLayer(layerGroup);
    clusterGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Ensure map tiles recalculate bounding box after DOM layout renders
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      clusterGroupRef.current = null;
    };
  }, []);

  // Render markers when features or filters change
  useEffect(() => {
    const cluster = clusterGroupRef.current;
    const map = mapInstanceRef.current;
    if (!cluster || !map || features.length === 0) return;

    cluster.clearLayers();

    const filtered = features.filter((f) => {
      const riskMatch =
        selectedRisk === 'ALL' || f.properties.risk_category === selectedRisk;
      const sectorMatch =
        selectedSector === 'ALL' || f.properties.sector === selectedSector;
      return riskMatch && sectorMatch;
    });

    setTotalVisible(filtered.length);

    const markers: L.CircleMarker[] = [];

    filtered.forEach((f, idx) => {
      let [lng, lat] = f.geometry.coordinates;
      if (!lat || !lng) return;

      // Slight deterministic radial jitter so projects at the identical state centroid don't fully occlude
      const angle = (idx * 137.5 * Math.PI) / 180;
      const radiusOffset = 0.04 * Math.sqrt((idx % 25) + 1);
      const jLat = lat + Math.sin(angle) * radiusOffset;
      const jLng = lng + Math.cos(angle) * radiusOffset;

      const riskCat = f.properties.risk_category;
      const color = f.properties.badge_color || getRiskColor(riskCat);
      const radius =
        riskCat === 'CRITICAL' ? 8 : riskCat === 'HIGH' ? 7 : riskCat === 'MEDIUM' ? 6 : 5;

      const marker = L.circleMarker([jLat, jLng], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.95,
        fillOpacity: 0.85,
      });

      const popup = L.popup({
        closeButton: true,
        maxWidth: 280,
        className: 'acq-popup',
      }).setContent(buildPopupHtml(f.properties));

      marker.bindPopup(popup);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`map-detail-btn-${f.properties.project_code}`);
        if (btn) {
          btn.onclick = () => onSelectProject(f.properties.project_code);
        }
      });

      markers.push(marker);
    });

    cluster.addLayers(markers);
  }, [features, selectedRisk, selectedSector, onSelectProject]);

  const resetView = () => {
    mapInstanceRef.current?.setView(INDIA_CENTER, INDIA_ZOOM);
  };

  const fitResults = () => {
    const cluster = clusterGroupRef.current;
    const map = mapInstanceRef.current;
    if (!cluster || !map) return;
    const bounds = cluster.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  return (
    <div className="view-enter">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-14 z-30">
        <div className="max-w-screen-xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              National Risk Map
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              State-level centroids — coordinates are administrative, not GPS-precise
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* Risk filter */}
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="input-base w-auto py-1.5 text-xs"
              aria-label="Filter map by risk tier"
            >
              {RISK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Risk Tiers' : c}
                </option>
              ))}
            </select>

            {/* Sector filter */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="input-base w-auto py-1.5 text-xs hidden sm:block"
              aria-label="Filter map by sector"
            >
              <option value="ALL">All Sectors</option>
              {filterOptions?.sectors.map((s) => (
                <option key={s} value={s}>
                  {s.replace(' AND ', ' & ')}
                </option>
              ))}
            </select>

            {/* Count badge */}
            <div className="text-xs text-slate-500 tabular-nums px-2 py-1 bg-slate-100 rounded-full">
              {loading ? '…' : totalVisible.toLocaleString()} markers
            </div>

            {/* Reload */}
            <button
              onClick={loadFeatures}
              className="btn btn-secondary btn-sm"
              disabled={loading}
              aria-label="Reload map data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin-slow' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4">
            <ConnectionError message={error} onRetry={loadFeatures} compact />
          </div>
        )}

        <div
          className="card overflow-hidden"
          style={{ height: 'calc(100dvh - 240px)', minHeight: 480 }}
        >
          <div className="relative w-full h-full">
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <Spinner size="lg" />
                <p className="text-sm text-slate-500">Loading project locations…</p>
              </div>
            )}

            {/* Map */}
            <div ref={mapRef} className="w-full h-full relative z-0" style={{ minHeight: 480 }} aria-label="India infrastructure risk map" />

            {/* Map controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
              <button
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-sm transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-sm transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4 text-slate-600" />
              </button>
              <div className="w-px h-2 bg-slate-200 mx-auto" />
              <button
                onClick={fitResults}
                className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-sm transition-colors"
                aria-label="Fit to results"
                title="Fit to filtered results"
              >
                <Layers className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={resetView}
                className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 shadow-sm transition-colors"
                aria-label="Reset to India view"
                title="Reset view"
              >
                <LocateFixed className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Risk legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-md">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Risk Tier
              </div>
              {RISK_LEGEND.map(({ cat, label }) => (
                <div key={cat} className="flex items-center gap-2 mb-1 last:mb-0">
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0"
                    style={{ backgroundColor: getRiskColor(cat) }}
                  />
                  <span className="text-[10px] text-slate-600">{label}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600/85 border-2 border-white shadow-sm flex items-center justify-center">
                    <span className="text-[7px] text-white font-bold">N</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Cluster</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMap;
