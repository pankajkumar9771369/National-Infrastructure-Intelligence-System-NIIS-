import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { getHeatmapData } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet heat plugin loaded via CDN script in index.html
// We use direct L.heatLayer

function HeatLayer({ points }) {
    const map = useMap();

    useEffect(() => {
        if (!points.length) return;
        if (!window.L?.heatLayer) return;

        const heat = window.L.heatLayer(
            points.map(p => [p.lat, p.lng, p.intensity]),
            {
                radius: 35,
                blur: 20,
                maxZoom: 14,
                gradient: { 0.2: '#10b981', 0.5: '#f59e0b', 0.75: '#f97316', 1.0: '#ef4444' }
            }
        );
        heat.addTo(map);

        // Add circle markers for each point
        const markers = points.map(p => {
            const color = p.risk_level === 'critical' ? '#ef4444' : p.risk_level === 'high' ? '#f97316' : p.risk_level === 'moderate' ? '#f59e0b' : '#10b981';
            const marker = L.circleMarker([p.lat, p.lng], {
                radius: 7,
                fillColor: color,
                color: 'rgba(0,0,0,0.5)',
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.85,
            });
            marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:200px">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${p.name}</div>
          <div style="color:#94a3b8;font-size:12px;text-transform:capitalize;margin-bottom:8px">🏗️ ${p.type}</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:#94a3b8;font-size:12px">Risk Score</span>
            <span style="font-weight:600;color:${color}">${p.risk_score.toFixed(1)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#94a3b8;font-size:12px">Risk Level</span>
            <span style="font-weight:600;text-transform:capitalize;color:${color}">${p.risk_level}</span>
          </div>
        </div>
      `);
            marker.addTo(map);
            return marker;
        });

        return () => {
            heat.remove();
            markers.forEach(m => m.remove());
        };
    }, [map, points]);

    return null;
}

export default function HeatmapPage() {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ critical: 0, high: 0, moderate: 0, low: 0 });

    useEffect(() => {
        // Load leaflet.heat dynamically
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
        script.onload = () => {
            getHeatmapData().then(res => {
                setPoints(res.data);
                const c = { critical: 0, high: 0, moderate: 0, low: 0 };
                res.data.forEach(p => { if (c[p.risk_level] !== undefined) c[p.risk_level]++; });
                setCounts(c);
            }).catch(console.error).finally(() => setLoading(false));
        };
        document.head.appendChild(script);
    }, []);

    const center = [12.9716, 77.5946]; // Bangalore

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">City Infrastructure Risk Heatmap</div>
                    <div className="page-subtitle">Bangalore City — Geospatial risk visualization · Click markers for details</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                    { label: 'Critical', count: counts.critical, color: '#ef4444' },
                    { label: 'High', count: counts.high, color: '#f97316' },
                    { label: 'Moderate', count: counts.moderate, color: '#f59e0b' },
                    { label: 'Low', count: counts.low, color: '#10b981' },
                ].map(({ label, count, color }) => (
                    <div key={label} className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <div>
                            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.2rem', color }}>{count}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="heatmap-container" style={{ position: 'relative' }}>
                {loading ? (
                    <div className="loading-spinner" style={{ height: '100%' }}><div className="spinner" /><span>Loading map data...</span></div>
                ) : (
                    <MapContainer center={center} zoom={12} style={{ width: '100%', height: '100%' }}>
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='© CartoDB'
                        />
                        <HeatLayer points={points} />
                    </MapContainer>
                )}

                {/* Legend */}
                <div className="map-legend">
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 10, color: 'var(--text-primary)' }}>Risk Heat Legend</div>
                    {[
                        { label: 'Critical (75–100)', color: '#ef4444' },
                        { label: 'High (55–74)', color: '#f97316' },
                        { label: 'Moderate (35–54)', color: '#f59e0b' },
                        { label: 'Low (0–34)', color: '#10b981' },
                    ].map(({ label, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{label}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        📍 {points.length} structures plotted
                    </div>
                </div>
            </div>
        </div>
    );
}
