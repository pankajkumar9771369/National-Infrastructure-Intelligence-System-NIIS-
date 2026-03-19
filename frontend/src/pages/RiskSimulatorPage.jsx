import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis
} from 'recharts';

// ── Mirrors the Python risk_formula.py logic exactly ──────────────────────
const DESIGN_LIFE = { steel: 75, composite: 80, concrete: 70, asphalt: 20, masonry: 100 };
const LOAD_F = { light: 0.2, medium: 0.5, heavy: 0.8, extreme: 1.0 };
const MAT_F = { steel: 0.3, composite: 0.5, concrete: 0.7, asphalt: 0.65, masonry: 0.9 };
const ENV_F = { low: 0.1, medium: 0.3, high: 0.6, severe: 1.0 };
const FLOOD_F = { negligible: 0.0, low: 0.15, medium: 0.45, high: 0.75, very_high: 1.0 };
const SEISMIC_F = { II: 0.15, III: 0.45, IV: 0.75, V: 1.0 };
const ZONE_MULT = { coastal: 1.30, tropical: 1.20, highland: 1.10, 'semi-arid': 1.05, arid: 1.0 };
const COST_SQFT = { replacement: 400, major_repair: 150, preventive: 45, routine: 12 };

function computeRisk(p) {
    const maxAge = DESIGN_LIFE[p.material] || 80;
    const ageFactor = Math.min(p.age / maxAge, 1.0);
    const loadF = LOAD_F[p.traffic] || 0.5;
    const matF = MAT_F[p.material] || 0.7;
    const envF = ENV_F[p.env] || 0.3;
    const floodF = FLOOD_F[p.flood] || 0.15;
    const seismicF = SEISMIC_F[p.seismic] || 0.15;
    const rainF = Math.min(p.rainfall / 2500, 1.0);
    const climateF = Math.min(0.45 * floodF + 0.35 * seismicF + 0.20 * rainF, 1.0);
    const zoneMult = ZONE_MULT[p.zone] || 1.05;
    const base = (0.30 * ageFactor + 0.22 * loadF + 0.18 * matF + 0.15 * envF + 0.15 * climateF) * 100;
    const score = Math.min(base * zoneMult, 100);
    const level = score >= 75 ? 'critical' : score >= 55 ? 'high' : score >= 35 ? 'moderate' : 'low';
    const maintMap = { critical: 'replacement', high: 'major_repair', moderate: 'preventive', low: 'routine' };
    const maint = maintMap[level];
    const budget = (p.area_sqft * COST_SQFT[maint]);
    return {
        score: Math.round(score * 10) / 10,
        health: Math.round((100 - score) * 10) / 10,
        level,
        ageFactor: Math.round(ageFactor * 100) / 100,
        loadFactor: loadF,
        matFactor: matF,
        envFactor: envF,
        climateFactor: Math.round(climateF * 100) / 100,
        budget,
        maint,
    };
}

// Build 20-year deterioration projection
function buildProjection(params) {
    return Array.from({ length: 21 }, (_, i) => {
        const r = computeRisk({ ...params, age: params.age + i });
        return { year: new Date().getFullYear() + i, risk: r.score, health: r.health };
    });
}

const RISK_COLOR = { critical: '#ef4444', high: '#f97316', moderate: '#f59e0b', low: '#10b981' };
const RISK_EMOJI = { critical: '🔴', high: '🟠', moderate: '🟡', low: '🟢' };

const SliderRow = ({ label, value, min, max, step = 1, unit = '', onChange, color = '#3b82f6', note }) => (
    <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
            <span style={{
                fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem',
                color, background: `${color}18`, padding: '2px 10px', borderRadius: 6
            }}>{value}{unit}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
        {note && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>}
    </div>
);

const SelectRow = ({ label, value, opts, onChange }) => (
    <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label" style={{ fontSize: '0.8rem' }}>{label}</label>
        <select className="form-control" value={value} onChange={e => onChange(e.target.value)}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
    </div>
);

const DEFAULTS = {
    age: 30, material: 'concrete', traffic: 'medium', env: 'medium',
    flood: 'low', seismic: 'II', zone: 'tropical', rainfall: 800, area_sqft: 5000,
};

export default function RiskSimulatorPage() {
    const [p, setP] = useState(DEFAULTS);
    const [result, setResult] = useState(() => computeRisk(DEFAULTS));
    const [projection, setProjection] = useState(() => buildProjection(DEFAULTS));
    const navigate = useNavigate();

    const set = (key) => (val) => setP(prev => ({ ...prev, [key]: val }));

    useEffect(() => {
        setResult(computeRisk(p));
        setProjection(buildProjection(p));
    }, [p]);

    const radarData = [
        { factor: 'Age', value: Math.round(result.ageFactor * 100) },
        { factor: 'Load', value: Math.round(result.loadFactor * 100) },
        { factor: 'Material', value: Math.round(result.matFactor * 100) },
        { factor: 'Environment', value: Math.round(result.envFactor * 100) },
        { factor: 'Climate', value: Math.round(result.climateFactor * 100) },
    ];

    const col = RISK_COLOR[result.level];

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">⚡ What-If Risk Simulator</div>
                    <div className="page-subtitle">
                        Explore how engineering parameters affect infrastructure risk — real-time, using the NIIS ML risk formula
                    </div>
                </div>
                <button className="btn btn-outline" onClick={() => navigate('/infrastructures')}>
                    View Real Structures
                </button>
            </div>

            {/* Disclaimer */}
            <div style={{
                background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: '0.8rem', color: 'var(--text-muted)'
            }}>
                💡 <strong style={{ color: 'var(--text-secondary)' }}>Simulation only.</strong> Adjust the sliders and dropdowns to see how age, material, load, and climate conditions change the NIIS risk score in real-time.
                This uses the exact same formula as the ML service.
            </div>

            <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>

                {/* ── Left: Input Sliders ─────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Core Engineering */}
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: 14, color: '#3b82f6', fontSize: '0.9rem' }}>
                            🏗️ Structural Parameters
                        </div>
                        <SliderRow label="Structure Age" value={p.age} min={1} max={120} unit=" yrs"
                            onChange={set('age')} color="#3b82f6"
                            note={`Design life for ${p.material}: ${DESIGN_LIFE[p.material]} yrs`} />
                        <SliderRow label="Deck Area" value={p.area_sqft} min={500} max={50000} step={500} unit=" sqft"
                            onChange={set('area_sqft')} color="#8b5cf6" />
                        <SelectRow label="Primary Material" value={p.material} onChange={set('material')}
                            opts={[['concrete', 'Concrete (70yr life)'], ['steel', 'Steel (75yr)'], ['composite', 'Composite (80yr)'], ['masonry', 'Masonry (100yr)'], ['asphalt', 'Asphalt (20yr)']]} />
                        <SelectRow label="Traffic Load" value={p.traffic} onChange={set('traffic')}
                            opts={[['light', 'Light (factor 0.2)'], ['medium', 'Medium (0.5)'], ['heavy', 'Heavy (0.8)'], ['extreme', 'Extreme (1.0)']]} />
                        <SelectRow label="Environmental Exposure" value={p.env} onChange={set('env')}
                            opts={[['low', 'Low — Dry / Indoor'], ['medium', 'Medium — Humid'], ['high', 'High — Coastal / Industrial'], ['severe', 'Severe — Marine / Chemical']]} />
                    </div>

                    {/* Climate */}
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: 14, color: '#06b6d4', fontSize: '0.9rem' }}>
                            🌦️ Climate & Seismic Inputs
                        </div>
                        <SelectRow label="Climate Zone" value={p.zone} onChange={set('zone')}
                            opts={[['arid', 'Arid (×1.0)'], ['semi-arid', 'Semi-Arid (×1.05)'], ['highland', 'Highland (×1.10)'], ['tropical', 'Tropical (×1.20)'], ['coastal', 'Coastal (×1.30)']]} />
                        <SelectRow label="Flood Risk" value={p.flood} onChange={set('flood')}
                            opts={[['negligible', 'Negligible'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['very_high', 'Very High']]} />
                        <SelectRow label="Seismic Zone (BIS IS-1893)" value={p.seismic} onChange={set('seismic')}
                            opts={[['II', 'Zone II — Low damage'], ['III', 'Zone III — Moderate'], ['IV', 'Zone IV — High'], ['V', 'Zone V — Very High']]} />
                        <SliderRow label="Annual Rainfall" value={p.rainfall} min={100} max={3000} step={50} unit=" mm"
                            onChange={set('rainfall')} color="#06b6d4" />
                    </div>
                </div>

                {/* ── Right: Live Results ──────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Big Score Card */}
                    <div className="card" style={{
                        textAlign: 'center', border: `1px solid ${col}40`,
                        background: `linear-gradient(135deg, ${col}10 0%, transparent 60%)`,
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                            Simulated Risk Score
                        </div>
                        <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '5rem', color: col, lineHeight: 1 }}>
                            {result.score}
                        </div>
                        <div style={{ fontSize: '1.4rem', marginTop: 8 }}>{RISK_EMOJI[result.level]}</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: col, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {result.level}
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Health Score</div>
                                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>{result.health}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Maintenance Type</div>
                                <div style={{ fontWeight: 700, color: col, fontSize: '0.88rem', textTransform: 'capitalize' }}>{result.maint.replace('_', ' ')}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Est. Budget</div>
                                <div style={{ fontWeight: 800, color: '#a855f7', fontSize: '1rem' }}>
                                    ${(result.budget / 1e6).toFixed(2)}M
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Factor Radar */}
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            Risk Factor Breakdown
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                <PolarAngleAxis dataKey="factor" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                <Radar name="Risk Factor" dataKey="value" stroke={col} fill={col} fillOpacity={0.25} strokeWidth={2} />
                                <Tooltip
                                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                                    formatter={(v) => [`${v}%`, 'Factor Weight']}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 20-year Forecast */}
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            📈 20-Year Deterioration Forecast
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                            Projected risk score assuming no maintenance
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={projection} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                <defs>
                                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={col} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={col} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                                    formatter={(v, n) => [v.toFixed(1), n === 'risk' ? 'Risk Score' : 'Health Score']}
                                />
                                <Area type="monotone" dataKey="risk" stroke={col} fill="url(#riskGrad)" strokeWidth={2} dot={false} name="risk" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
