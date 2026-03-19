import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInfrastructure, triggerPrediction, getSensorReadings, postSensorReading, getInspectionHistory } from '../services/api';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    ReferenceLine, CartesianGrid
} from 'recharts';
import { ArrowLeft, Download, Zap, Activity, AlertTriangle, ClipboardList, Flag, Shield, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RISK_COLORS = { critical: '#ef4444', high: '#f97316', moderate: '#f59e0b', low: '#10b981' };

function HealthGauge({ score, riskLevel }) {
    const color = RISK_COLORS[riskLevel] || '#10b981';
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score / 100) * circumference;
    return (
        <div className="gauge-container">
            <div className="gauge-ring">
                <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-secondary)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <div className="gauge-value">
                    <span className="gauge-number" style={{ color }}>{parseFloat(score).toFixed(0)}</span>
                    <span className="gauge-label">Health %</span>
                </div>
            </div>
            <span className={`risk-badge ${riskLevel}`} style={{ marginTop: 6 }}>{riskLevel} risk</span>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Year +{label}</div>
            <div style={{ fontWeight: 600, color: payload[0]?.value >= 7 ? '#10b981' : payload[0]?.value >= 4 ? '#f59e0b' : '#ef4444' }}>
                Condition: {payload[0]?.value}
            </div>
        </div>
    );
};

export default function InfrastructureDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [infra, setInfra] = useState(null);
    const [loading, setLoading] = useState(true);
    const [predicting, setPredicting] = useState(false);
    const [sensorData, setSensorData] = useState([]);
    const [sensorLoading, setSensorLoading] = useState(false);
    const [inspections, setInspections] = useState([]);
    const [activeTab, setActiveTab] = useState('details');
    const [showQR, setShowQR] = useState(false);
    const sensorInterval = useRef(null);

    const loadInfra = () => {
        setLoading(true);
        getInfrastructure(id).then(res => setInfra(res.data)).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadInfra();
        getInspectionHistory(id).then(r => setInspections(r.data || [])).catch(() => { });
        return () => clearInterval(sensorInterval.current);
    }, [id]);

    const runPrediction = async () => {
        setPredicting(true);
        try {
            await triggerPrediction(id);
            toast.success('ML prediction complete!');
            loadInfra();
        } catch (err) {
            toast.error('Prediction failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setPredicting(false);
        }
    };

    const startSensorSim = () => {
        if (sensorInterval.current) { clearInterval(sensorInterval.current); sensorInterval.current = null; return; }
        const sensorTypes = [
            { type: 'vibration', unit: 'mm/s', range: [0.1, 5.0] },
            { type: 'crack_width', unit: 'mm', range: [0.01, 3.0] },
            { type: 'load', unit: 'kN', range: [50, 500] },
            { type: 'deflection', unit: 'mm', range: [0.5, 20.0] },
        ];
        const simulate = async () => {
            const s = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
            const val = parseFloat((Math.random() * (s.range[1] - s.range[0]) + s.range[0]).toFixed(3));
            try {
                const res = await postSensorReading({ infrastructure_id: parseInt(id), sensor_type: s.type, value: val, unit: s.unit });
                setSensorData(prev => [res.data, ...prev.slice(0, 14)]);
            } catch (e) { }
        };
        simulate();
        sensorInterval.current = setInterval(simulate, 2000);
    };

    const downloadPDF = () => {
        if (!infra) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text('Infrastructure Health Report', 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 14, 28);

        autoTable(doc, {
            startY: 36,
            head: [['Parameter', 'Value']],
            body: [
                ['Name', infra.name],
                ['Type', infra.type],
                ['Area', infra.area],
                ['Age (years)', infra.age_years],
                ['Material', infra.material],
                ['Traffic Load', infra.traffic_load],
                ['Env. Exposure', infra.env_exposure],
                ['Structural Condition', `${infra.structural_condition}/10`],
                ['Risk Score', `${parseFloat(infra.risk_score || 0).toFixed(1)}/100`],
                ['Health Score', `${parseFloat(infra.health_score || 0).toFixed(1)}%`],
                ['Risk Level', infra.risk_level?.toUpperCase()],
                ['Predicted Maintenance Year', infra.predicted_maintenance_year || 'Not predicted'],
                ['Deterioration Rate', infra.deterioration_rate ? `${infra.deterioration_rate} cond/yr` : '—'],
                ['Estimated Budget', infra.estimated_cost_usd ? `$${parseFloat(infra.estimated_cost_usd).toLocaleString()}` : '—'],
                ['Last Inspection', infra.last_inspection_date || '—'],
            ],
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 247, 255] },
        });

        doc.save(`${infra.name.replace(/\s+/g, '_')}_health_report.pdf`);
        toast.success('PDF report downloaded!');
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /><span>Loading structure data...</span></div>;
    if (!infra) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Structure not found</div>;

    const riskColor = RISK_COLORS[infra.risk_level] || '#10b981';
    const predictionData = infra.prediction_data ? (typeof infra.prediction_data === 'string' ? JSON.parse(infra.prediction_data) : infra.prediction_data) : null;
    const deteriorationCurve = predictionData?.deterioration_curve || [];

    const factorData = [
        { label: 'Age Factor', value: ((parseFloat(infra.age_factor) || 0) * 100).toFixed(0), pct: parseFloat(infra.age_factor) || 0, color: '#8b5cf6' },
        { label: 'Load Factor', value: ((parseFloat(infra.load_factor) || 0) * 100).toFixed(0), pct: parseFloat(infra.load_factor) || 0, color: '#f59e0b' },
        { label: 'Material Factor', value: ((parseFloat(infra.material_factor) || 0) * 100).toFixed(0), pct: parseFloat(infra.material_factor) || 0, color: '#3b82f6' },
        { label: 'Env. Factor', value: ((parseFloat(infra.env_factor) || 0) * 100).toFixed(0), pct: parseFloat(infra.env_factor) || 0, color: '#06b6d4' },
    ];

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/infrastructures')}><ArrowLeft size={14} /></button>
                    <div>
                        <div className="page-title">{infra.name}</div>
                        <div className="page-subtitle">{infra.area} · {infra.type} · Built {infra.construction_year}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline btn-sm" title="Generate QR Code for field inspectors"
                        onClick={() => setShowQR(v => !v)}
                        style={{ color: showQR ? '#3b82f6' : undefined }}>
                        <QrCode size={14} /> QR Code
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={startSensorSim}>
                        <Activity size={14} /> {sensorInterval.current ? 'Stop Sensor' : 'Simulate Sensors'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={runPrediction} disabled={predicting}>
                        <Zap size={14} /> {predicting ? 'Running ML...' : 'Run ML Prediction'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={downloadPDF}>
                        <Download size={14} /> PDF Report
                    </button>
                </div>
            </div>

            {/* QR Code Panel */}
            {showQR && (
                <div className="card animate-in" style={{
                    marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24,
                    border: '1px solid rgba(59,130,246,0.25)',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 60%)',
                }}>
                    <div style={{
                        background: '#ffffff', padding: 12, borderRadius: 12, flexShrink: 0,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}>
                        <QRCodeSVG
                            value={window.location.href}
                            size={130}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                            📱 Field Inspector QR Code
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                            Scan this QR code with any smartphone to instantly open the
                            full health report for <strong>{infra.name}</strong> on-site.
                            No login needed on mobile if public access is enabled.
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', color: '#60a5fa' }}>
                                🏗️ {infra.type}
                            </span>
                            <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', color: '#60a5fa' }}>
                                📍 {infra.area}
                            </span>
                            <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', color: '#60a5fa' }}>
                                🆔 ID #{infra.id}
                            </span>
                        </div>
                        <div style={{ marginTop: 10, fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                            {window.location.href}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
                {[['details', '📊 Analysis'], ['inspections', `📋 Inspection History (${inspections.length})`]].map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                        background: 'transparent', borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                        color: activeTab === tab ? '#3b82f6' : 'var(--text-muted)', transition: 'all 0.2s'
                    }}>{label}</button>
                ))}
            </div>

            {activeTab === 'details' && (<>
                <div className="grid-2" style={{ marginBottom: 20 }}>
                    {/* Health Gauge + Risk Scores */}
                    <div className="card" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
                        <HealthGauge score={parseFloat(infra.health_score || 50)} riskLevel={infra.risk_level || 'moderate'} />
                        <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>RISK INDEX SCORE</div>
                                <div style={{ fontFamily: 'Outfit', fontSize: '2.5rem', fontWeight: 800, color: riskColor, lineHeight: 1 }}>
                                    {parseFloat(infra.risk_score || 0).toFixed(1)}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>out of 100</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {factorData.map(f => (
                                    <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 100, fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{f.label}</div>
                                        <div className="progress-bar" style={{ flex: 1 }}>
                                            <div className="progress-fill" style={{ width: `${parseFloat(f.value)}%`, background: f.color }} />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: f.color, width: 28, textAlign: 'right' }}>{f.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Structure Info */}
                    <div className="card">
                        <div className="section-title">Structure Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                            {[
                                ['City / State', `${infra.city || '—'} / ${infra.state || '—'}`, ''],
                                ['Route Type', infra.route_type?.replace(/_/g, ' ') || '—', 'capitalize'],
                                ['Economic Importance', infra.economic_importance || '—', 'capitalize'],
                                ['Climate Zone', infra.climate_zone || '—', 'capitalize'],
                                ['Seismic Zone', infra.seismic_zone ? `Zone ${infra.seismic_zone}` : '—', ''],
                                ['Flood Risk', infra.flood_risk?.replace(/_/g, ' ') || '—', 'capitalize'],
                                ['Nearest Hospital', infra.nearest_hospital_km ? `${infra.nearest_hospital_km} km` : '—', ''],
                                ['Annual Rainfall', infra.annual_rainfall_mm ? `${infra.annual_rainfall_mm} mm` : '—', ''],
                                ['Material', infra.material, 'capitalize'],
                                ['Traffic Load', infra.traffic_load, 'capitalize'],
                                ['Env. Exposure', infra.env_exposure, 'capitalize'],
                                ['Condition Rating', `${infra.structural_condition}/10`, ''],
                                ['Length', infra.length_meters ? `${infra.length_meters}m` : '—', ''],
                                ['Width', infra.width_meters ? `${infra.width_meters}m` : '—', ''],
                                ['Daily Traffic', infra.daily_traffic_count ? `${parseInt(infra.daily_traffic_count).toLocaleString()}` : '—', ''],
                                ['Last Inspection', infra.last_inspection_date || '—', ''],
                            ].map(([k, v, cap]) => (
                                <div key={k} className="stat-row">
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{k}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: cap }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ML Prediction Card */}
                <div className="grid-2" style={{ marginBottom: 20 }}>
                    <div className="prediction-card">
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ML Prediction</div>
                        {infra.predicted_maintenance_year ? (
                            <>
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Maintenance Year</div>
                                        <div className="prediction-year-display">{infra.predicted_maintenance_year}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Deterioration Rate</div>
                                        <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>
                                            {parseFloat(infra.deterioration_rate || 0).toFixed(4)}<span style={{ fontSize: '0.9rem' }}> /yr</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Predicted Condition</div>
                                        <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 700, color: '#06b6d4' }}>
                                            {parseFloat(infra.predicted_condition_rating || 0).toFixed(1)}<span style={{ fontSize: '0.9rem' }}>/10</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Years to Critical</div>
                                        <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 700, color: '#a855f7' }}>
                                            {infra.years_to_critical || '—'}
                                        </div>
                                    </div>
                                </div>
                                {/* Confidence Interval */}
                                {infra.confidence_pct != null && (
                                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Model Confidence</span>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: infra.confidence_pct >= 80 ? '#10b981' : infra.confidence_pct >= 60 ? '#f59e0b' : '#ef4444' }}>
                                                {infra.confidence_pct}%
                                            </span>
                                        </div>
                                        <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                                            <div style={{ width: `${infra.confidence_pct}%`, height: '100%', borderRadius: 4, background: infra.confidence_pct >= 80 ? '#10b981' : infra.confidence_pct >= 60 ? '#f59e0b' : '#ef4444', transition: 'width 0.8s' }} />
                                        </div>
                                        {infra.confidence_low != null && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 5 }}>
                                                95% CI: condition {infra.confidence_low} – {infra.confidence_high}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Model: <span style={{ color: 'var(--accent-blue)' }}>{infra.model_used || 'random_forest'}</span></div>
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                No prediction yet. Click <strong style={{ color: 'var(--accent-blue)' }}>Run ML Prediction</strong> above.
                            </div>
                        )}
                    </div>

                    {/* Budget */}
                    <div className="card">
                        <div className="section-title">Budget Estimate</div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Estimated Cost</div>
                                <div style={{ fontFamily: 'Outfit', fontSize: '2rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                                    ${infra.estimated_cost_usd ? parseFloat(infra.estimated_cost_usd).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Maintenance Type</div>
                                <div style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)', marginBottom: 8 }}>
                                    {infra.maintenance_type?.replace('_', ' ') || '—'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Planned Year</div>
                                <div style={{ fontWeight: 600 }}>{infra.planned_year || '—'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deterioration Chart */}
                {deteriorationCurve.length > 0 && (
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="section-title">Structural Deterioration Forecast (20 Years)</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={deteriorationCurve.map(p => ({ ...p, condition: parseFloat(p.condition.toFixed(2)) }))} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="year_offset" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Years from now', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 11, dy: 15 }} />
                                <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Condition (0-10)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
                                <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Critical Threshold', fill: '#ef4444', fontSize: 10 }} />
                                <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Maintenance Trigger', fill: '#f59e0b', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="condition" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Sensor Readings */}
                {sensorData.length > 0 && (
                    <div className="card">
                        <div className="section-header">
                            <div className="section-title">Live Sensor Readings</div>
                            <span className="sensor-dot" />
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Sensor Type</th>
                                        <th>Value</th>
                                        <th>Unit</th>
                                        <th>Status</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sensorData.map((s, i) => (
                                        <tr key={i}>
                                            <td style={{ textTransform: 'capitalize', fontWeight: 500 }}>{s.sensor_type?.replace('_', ' ')}</td>
                                            <td style={{ fontFamily: 'Outfit', fontWeight: 700 }}>{parseFloat(s.value).toFixed(3)}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{s.unit}</td>
                                            <td>
                                                {s.is_anomaly ? (
                                                    <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <AlertTriangle size={13} /> Anomaly
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>Normal</span>
                                                )}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{new Date(s.timestamp).toLocaleTimeString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </>)}

            {/* ── Inspection History Tab ───────────────────── */}
            {activeTab === 'inspections' && (
                <div className="card animate-in">
                    <div className="section-header" style={{ marginBottom: 16 }}>
                        <div className="section-title">
                            <ClipboardList size={15} color="#3b82f6" style={{ marginRight: 6 }} />
                            Inspection History — Accountability Log
                        </div>
                    </div>
                    {inspections.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                            <ClipboardList size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <div>No inspections logged yet.</div>
                            <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Admins can log inspections via the Admin Panel.</div>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead><tr>
                                    <th>Date</th><th>Inspector</th><th>Type</th>
                                    <th>Condition</th><th>Risk Level</th><th>Findings</th>
                                </tr></thead>
                                <tbody>
                                    {inspections.map(ins => {
                                        const condColor = ins.observed_condition >= 7 ? '#10b981' : ins.observed_condition >= 4 ? '#f59e0b' : '#ef4444';
                                        return (
                                            <tr key={ins.id}>
                                                <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                                    {new Date(ins.inspection_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{ins.inspector_name || 'Unknown'}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ins.inspector_dept}</div>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', textTransform: 'capitalize' }}>
                                                        {ins.inspection_type}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 800, color: condColor }}>{ins.observed_condition}</span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>/10</span>
                                                </td>
                                                <td><span className={`risk-badge ${ins.observed_risk_level || 'low'}`}>{ins.observed_risk_level || '—'}</span></td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 220 }}>{ins.findings || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

