import { useState, useMemo } from 'react';
import { createInfrastructure } from '../services/api';
import toast from 'react-hot-toast';

// ─── Type selector config ────────────────────────────────────
const TYPES = [
    { key: 'bridge', icon: '🌉', label: 'Bridge', sub: 'PSC / Steel Truss / Box Girder' },
    { key: 'road', icon: '🛣️', label: 'Road', sub: 'NH / SH / MDR / City' },
    { key: 'flyover', icon: '🏗️', label: 'Flyover / ROB', sub: 'Urban Overpass' },
    { key: 'tunnel', icon: '🚇', label: 'Tunnel', sub: 'Highway / Rail Tunnel' },
];

const ROUTE_TYPES = [
    { v: 'national_highway', l: 'NH — National Highway' },
    { v: 'state_highway', l: 'SH — State Highway' },
    { v: 'district_road', l: 'MDR — District Road' },
    { v: 'expressway', l: 'Expressway' },
    { v: 'city', l: 'Urban / City Road' },
];
const MATERIALS = ['concrete', 'steel', 'composite', 'masonry', 'asphalt'];
const ENV = ['low', 'medium', 'high', 'severe'];
const LOADS = ['light', 'medium', 'heavy', 'extreme'];
const FLOOD = ['negligible', 'low', 'medium', 'high', 'very_high'];
const SEISMIC = ['II', 'III', 'IV', 'V'];
const AGENCIES = ['NHAI', 'NHIDCL', 'PWD', 'BRO', 'MCGM', 'BBMP', 'HMDA', 'BMRCL', 'Other'];
const FUNDING = ['Central Govt', 'State Govt', 'PPP', 'JNNURM', 'Smart Cities', 'ADB Loan', 'World Bank', 'Other'];
const IRC_LOAD = ['IRC Class AA', 'IRC 70R', 'IRC Class A', 'Other'];
const SPAN_TYPES = ['PSC Girder', 'Steel Truss', 'Box Girder', 'RCC Slab', 'Steel Arch', 'Cable Stayed', 'Suspension', 'Other'];
const FOUNDATION = ['Well Foundation', 'Pile Foundation', 'Open Foundation', 'Raft', 'Other'];
const SUBSTRUCTURE = ['Pier', 'Abutment', 'Pier + Abutment', 'Trestle', 'Other'];
const INSP_TYPES = ['Routine', 'Detailed', 'Special Cause', 'Principal'];
const PAVEMENT = ['Flexible (Bituminous)', 'Rigid (Concrete)', 'Composite', 'Gravel'];
const LINING = ['Shotcrete (NATM)', 'Precast Concrete', 'Cast in-situ', 'Masonry', 'Steel Liner'];
const VENTILATION = ['Natural', 'Mechanical Longitudinal', 'Transverse', 'Semi-Transverse'];
const ROCK_TYPES = ['Granite', 'Limestone', 'Sandstone', 'Schist', 'Basalt', 'Alluvial'];
const CONGESTION = ['Low', 'Moderate', 'High', 'Severe'];
const DEFECTS = ['Cracks', 'Corrosion', 'Settlement', 'Scour', 'Spalling', 'Delamination', 'Leakage', 'Bearing Failure', 'None visible'];
const ECON_IMP = ['critical', 'high', 'medium', 'low'];
const STRATEGIC = ['Port Connectivity', 'Border Road', 'Industrial Corridor', 'Airport Access', 'None'];

// ─── Shared section header ───────────────────────────────────
const Sec = ({ letter, title, color = '#3b82f6' }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 20,
        paddingBottom: 8, borderBottom: `1px solid rgba(255,255,255,0.07)`
    }}>
        <span style={{
            width: 26, height: 26, borderRadius: 6, background: color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.75rem', flexShrink: 0
        }}>{letter}</span>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{title}</span>
    </div>
);

// ─── Field components ────────────────────────────────────────
const F = ({ label, req, children, note }) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">{label}{req && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}</label>
        {children}
        {note && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{note}</div>}
    </div>
);
const Inp = (p) => <input className="form-control" {...p} />;
const Sel = ({ opts, ...p }) => (
    <select className="form-control" {...p}>
        <option value="">— Select —</option>
        {opts.map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
);

// ─── BRIDGE FORM ─────────────────────────────────────────────
function BridgeForm({ f, s }) {
    return (
        <>
            <Sec letter="A" title="Identification" color="#3b82f6" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Asset Code / Bridge ID"><Inp value={f.asset_code} onChange={s('asset_code')} placeholder="NH44-BR-122" /></F>
                <F label="Bridge Name" req><Inp value={f.name} onChange={s('name')} placeholder="Mahatma Gandhi Setu" required /></F>
                <F label="State" req><Inp value={f.state} onChange={s('state')} placeholder="Bihar" required /></F>
                <F label="District"><Inp value={f.meta_district} onChange={s('meta_district')} placeholder="Patna" /></F>
                <F label="Highway Number"><Inp value={f.highway_number} onChange={s('highway_number')} placeholder="NH-19" /></F>
                <F label="Route Type" req><Sel opts={ROUTE_TYPES} value={f.route_type} onChange={s('route_type')} /></F>
                <F label="Chainage"><Inp value={f.chainage} onChange={s('chainage')} placeholder="Km 122.300" /></F>
                <F label="Latitude" req><Inp type="number" step="any" value={f.latitude} onChange={s('latitude')} placeholder="25.6093" required /></F>
                <F label="Longitude" req><Inp type="number" step="any" value={f.longitude} onChange={s('longitude')} placeholder="85.1376" required /></F>
            </div>

            <Sec letter="B" title="Administrative Details" color="#8b5cf6" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Executing Agency"><Sel opts={AGENCIES} value={f.executing_agency} onChange={s('executing_agency')} /></F>
                <F label="Contractor Name"><Inp value={f.meta_contractor} onChange={s('meta_contractor')} placeholder="L&T Construction" /></F>
                <F label="Consultant Name"><Inp value={f.meta_consultant} onChange={s('meta_consultant')} placeholder="STUP Consultants" /></F>
                <F label="Construction Year" req><Inp type="number" value={f.construction_year} onChange={s('construction_year')} placeholder="1982" required /></F>
                <F label="Completion Year"><Inp type="number" value={f.completion_year} onChange={s('completion_year')} placeholder="1985" /></F>
                <F label="Funding Source"><Sel opts={FUNDING} value={f.funding_source} onChange={s('funding_source')} /></F>
                <F label="Original Project Cost (₹ Crore)"><Inp type="number" step="0.01" value={f.replacement_cost_crore} onChange={s('replacement_cost_crore')} placeholder="620.00" /></F>
                <F label="Economic Importance"><Sel opts={ECON_IMP} value={f.economic_importance} onChange={s('economic_importance')} /></F>
                <F label="Area / Locality" req><Inp value={f.area} onChange={s('area')} placeholder="Patna" required /></F>
            </div>

            <Sec letter="C" title="Structural Technical Data" color="#06b6d4" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Total Length (m)" req><Inp type="number" step="0.01" value={f.length_meters} onChange={s('length_meters')} placeholder="5575" required /></F>
                <F label="Carriageway Width (m)" req><Inp type="number" step="0.01" value={f.width_meters} onChange={s('width_meters')} placeholder="7.5" required /></F>
                <F label="No. of Spans"><Inp type="number" value={f.num_spans} onChange={s('num_spans')} placeholder="45" /></F>
                <F label="Superstructure Type"><Sel opts={SPAN_TYPES} value={f.meta_superstructure} onChange={s('meta_superstructure')} /></F>
                <F label="Substructure Type"><Sel opts={SUBSTRUCTURE} value={f.meta_substructure} onChange={s('meta_substructure')} /></F>
                <F label="Foundation Type"><Sel opts={FOUNDATION} value={f.meta_foundation} onChange={s('meta_foundation')} /></F>
                <F label="Primary Material" req><Sel opts={MATERIALS} value={f.material} onChange={s('material')} /></F>
                <F label="Load Class (IRC)"><Sel opts={IRC_LOAD} value={f.meta_load_class} onChange={s('meta_load_class')} /></F>
                <F label="Design Life (years)"><Inp type="number" min="10" max="200" value={f.design_life} onChange={s('design_life')} placeholder="e.g. 75" /></F>

            </div>

            <Sec letter="D" title="Traffic Data" color="#10b981" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="AADT (Vehicles/Day)" note="Average Annual Daily Traffic"><Inp type="number" value={f.daily_traffic_count} onChange={s('daily_traffic_count')} placeholder="45000" /></F>
                <F label="Traffic Load Category" req><Sel opts={LOADS} value={f.traffic_load} onChange={s('traffic_load')} /></F>
                <F label="Strategic Importance"><Sel opts={STRATEGIC} value={f.meta_strategic} onChange={s('meta_strategic')} /></F>
            </div>

            <Sec letter="E" title="Inspection & Condition" color="#f59e0b" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Last Inspection Date"><Inp type="date" value={f.last_inspection_date} onChange={s('last_inspection_date')} /></F>
                <F label="Inspection Type"><Sel opts={INSP_TYPES} value={f.meta_inspection_type} onChange={s('meta_inspection_type')} /></F>
                <F label="Next Inspection Due"><Inp type="date" value={f.next_inspection_due} onChange={s('next_inspection_due')} /></F>
                <F label="Structural Condition Rating (0–10)" req note="0=Failed, 10=New"><Inp type="number" step="0.1" min="0" max="10" value={f.structural_condition} onChange={s('structural_condition')} placeholder="6.5" required /></F>
                <F label="Environmental Exposure" req><Sel opts={ENV} value={f.env_exposure} onChange={s('env_exposure')} /></F>
                <F label="Estimated Repair Cost (₹ Crore)"><Inp type="number" step="0.01" value={f.meta_repair_cost} onChange={s('meta_repair_cost')} placeholder="45.0" /></F>
                <F label="Major Defects Observed"><Sel opts={DEFECTS} value={f.meta_defects} onChange={s('meta_defects')} /></F>
                <F label="Recommended Action"><Inp value={f.meta_action} onChange={s('meta_action')} placeholder="Immediate rehabilitation" /></F>
                <F label="Nearest Hospital (km)" note="Emergency access factor"><Inp type="number" step="0.1" value={f.nearest_hospital_km} onChange={s('nearest_hospital_km')} placeholder="3.5" /></F>
            </div>

            <Sec letter="F" title="Risk & Disaster Parameters" color="#ef4444" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Seismic Zone (IS-1893)" req><Sel opts={SEISMIC} value={f.seismic_zone} onChange={s('seismic_zone')} /></F>
                <F label="Flood Risk Level" req><Sel opts={FLOOD} value={f.flood_risk} onChange={s('flood_risk')} /></F>
                <F label="Climate Zone"><Sel opts={['tropical', 'arid', 'semi-arid', 'coastal', 'highland']} value={f.climate_zone} onChange={s('climate_zone')} /></F>
                <F label="Annual Rainfall (mm)"><Inp type="number" value={f.annual_rainfall_mm} onChange={s('annual_rainfall_mm')} placeholder="1200" /></F>
                <F label="Scour Risk"><Sel opts={['High', 'Medium', 'Low', 'None']} value={f.meta_scour} onChange={s('meta_scour')} /></F>
                <F label="Coastal Exposure"><Sel opts={['Yes — Within 5km', 'Yes — 5-25km', 'No']} value={f.meta_coastal} onChange={s('meta_coastal')} /></F>
            </div>
        </>
    );
}

// ─── ROAD FORM ───────────────────────────────────────────────
function RoadForm({ f, s }) {
    return (
        <>
            <Sec letter="A" title="Identification" color="#3b82f6" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Road ID / Asset Code"><Inp value={f.asset_code} onChange={s('asset_code')} placeholder="NH44-RD-001" /></F>
                <F label="Road Name" req><Inp value={f.name} onChange={s('name')} placeholder="NH-44 Varanasi Bypass" required /></F>
                <F label="Highway Number"><Inp value={f.highway_number} onChange={s('highway_number')} placeholder="NH-44" /></F>
                <F label="Start Chainage"><Inp value={f.chainage} onChange={s('chainage')} placeholder="Km 0+000" /></F>
                <F label="Length (km)" req><Inp type="number" step="0.01" value={f.length_meters} onChange={s('length_meters')} placeholder="28.5" required /></F>
                <F label="Route Type" req><Sel opts={ROUTE_TYPES} value={f.route_type} onChange={s('route_type')} /></F>
                <F label="State" req><Inp value={f.state} onChange={s('state')} placeholder="Uttar Pradesh" required /></F>
                <F label="District"><Inp value={f.meta_district} onChange={s('meta_district')} placeholder="Varanasi" /></F>
                <F label="Area / Locality" req><Inp value={f.area} onChange={s('area')} placeholder="Varanasi" required /></F>
            </div>

            <Sec letter="B" title="Administrative Details" color="#8b5cf6" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Construction Year" req><Inp type="number" value={f.construction_year} onChange={s('construction_year')} placeholder="2005" required /></F>
                <F label="Last Major Rehab Year"><Inp type="number" value={f.completion_year} onChange={s('completion_year')} placeholder="2019" /></F>
                <F label="Executing Agency"><Sel opts={AGENCIES} value={f.executing_agency} onChange={s('executing_agency')} /></F>
                <F label="Funding Scheme"><Sel opts={FUNDING} value={f.funding_source} onChange={s('funding_source')} /></F>
                <F label="Project Cost (₹ Crore)"><Inp type="number" step="0.01" value={f.replacement_cost_crore} onChange={s('replacement_cost_crore')} placeholder="320.00" /></F>
                <F label="Economic Importance"><Sel opts={ECON_IMP} value={f.economic_importance} onChange={s('economic_importance')} /></F>
            </div>

            <Sec letter="C" title="Pavement Technical Details" color="#06b6d4" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Pavement Type"><Sel opts={PAVEMENT} value={f.material} onChange={s('material')} /></F>
                <F label="Carriageway Width (m)" req><Inp type="number" step="0.1" value={f.width_meters} onChange={s('width_meters')} placeholder="7.0" required /></F>
                <F label="No. of Lanes"><Inp type="number" value={f.num_spans} onChange={s('num_spans')} placeholder="2" /></F>
                <F label="Shoulder Type"><Sel opts={['Paved', 'Earthen', 'Kerb', 'None']} value={f.meta_shoulder} onChange={s('meta_shoulder')} /></F>
                <F label="Design Life (years)"><Sel opts={[15, 20, 30, 50]} value={f.design_life} onChange={s('design_life')} /></F>
                <F label="Environmental Exposure" req><Sel opts={ENV} value={f.env_exposure} onChange={s('env_exposure')} /></F>
            </div>

            <Sec letter="D" title="Traffic Data" color="#10b981" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="AADT (Vehicles/Day)"><Inp type="number" value={f.daily_traffic_count} onChange={s('daily_traffic_count')} placeholder="15000" /></F>
                <F label="Traffic Load Category" req><Sel opts={LOADS} value={f.traffic_load} onChange={s('traffic_load')} /></F>
                <F label="Accident Blackspot"><Sel opts={['Yes', 'No']} value={f.meta_blackspot} onChange={s('meta_blackspot')} /></F>
            </div>

            <Sec letter="E" title="Condition & Maintenance" color="#f59e0b" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Pavement Condition Rating (0–10)" req note="PCI equivalent — 0=Failed, 10=New"><Inp type="number" step="0.1" min="0" max="10" value={f.structural_condition} onChange={s('structural_condition')} placeholder="5.5" required /></F>
                <F label="Last Inspection Date"><Inp type="date" value={f.last_inspection_date} onChange={s('last_inspection_date')} /></F>
                <F label="Last Resurfacing Date"><Inp type="date" value={f.meta_last_resurface} onChange={s('meta_last_resurface')} /></F>
                <F label="Major Defects"><Sel opts={['Rutting', 'Cracking', 'Potholing', 'Edge Failures', 'Shoving', 'None visible']} value={f.meta_defects} onChange={s('meta_defects')} /></F>
                <F label="Estimated Maintenance Cost (₹ Cr)"><Inp type="number" step="0.01" value={f.meta_repair_cost} onChange={s('meta_repair_cost')} placeholder="12.5" /></F>
                <F label="Nearest Hospital (km)"><Inp type="number" step="0.1" value={f.nearest_hospital_km} onChange={s('nearest_hospital_km')} placeholder="8.0" /></F>
            </div>

            <Sec letter="F" title="Environmental Risk" color="#ef4444" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Flood Risk" req><Sel opts={FLOOD} value={f.flood_risk} onChange={s('flood_risk')} /></F>
                <F label="Seismic Zone" req><Sel opts={SEISMIC} value={f.seismic_zone} onChange={s('seismic_zone')} /></F>
                <F label="Climate Zone"><Sel opts={['tropical', 'arid', 'semi-arid', 'coastal', 'highland']} value={f.climate_zone} onChange={s('climate_zone')} /></F>
                <F label="Urban Congestion Level"><Sel opts={CONGESTION} value={f.meta_congestion} onChange={s('meta_congestion')} /></F>
                <F label="Landslide Prone"><Sel opts={['Yes', 'No']} value={f.meta_landslide} onChange={s('meta_landslide')} /></F>
                <F label="Annual Rainfall (mm)"><Inp type="number" value={f.annual_rainfall_mm} onChange={s('annual_rainfall_mm')} placeholder="900" /></F>
            </div>
        </>
    );
}

// ─── FLYOVER FORM ─────────────────────────────────────────────
function FlyoverForm({ f, s }) {
    return (
        <>
            <Sec letter="A" title="Identification" color="#3b82f6" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Flyover ID / Asset Code"><Inp value={f.asset_code} onChange={s('asset_code')} placeholder="BLR-FLY-018" /></F>
                <F label="Flyover Name" req><Inp value={f.name} onChange={s('name')} placeholder="Hebbal Flyover" required /></F>
                <F label="City" req><Inp value={f.area} onChange={s('area')} placeholder="Bangalore" required /></F>
                <F label="State" req><Inp value={f.state} onChange={s('state')} placeholder="Karnataka" required /></F>
                <F label="Road Connected"><Inp value={f.highway_number} onChange={s('highway_number')} placeholder="NH-44 / Bellary Road" /></F>
                <F label="Route Type" req><Sel opts={ROUTE_TYPES} value={f.route_type} onChange={s('route_type')} /></F>
                <F label="Latitude" req><Inp type="number" step="any" value={f.latitude} onChange={s('latitude')} placeholder="13.0452" required /></F>
                <F label="Longitude" req><Inp type="number" step="any" value={f.longitude} onChange={s('longitude')} placeholder="77.5210" required /></F>
                <F label="Executing Agency"><Sel opts={AGENCIES} value={f.executing_agency} onChange={s('executing_agency')} /></F>
            </div>

            <Sec letter="B" title="Structural Details" color="#8b5cf6" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Total Length (m)" req><Inp type="number" step="0.01" value={f.length_meters} onChange={s('length_meters')} placeholder="1200" required /></F>
                <F label="Width (m)" req><Inp type="number" step="0.01" value={f.width_meters} onChange={s('width_meters')} placeholder="18.0" required /></F>
                <F label="No. of Lanes"><Inp type="number" value={f.num_spans} onChange={s('num_spans')} placeholder="4" /></F>
                <F label="Span Type"><Sel opts={SPAN_TYPES} value={f.meta_superstructure} onChange={s('meta_superstructure')} /></F>
                <F label="Foundation Type"><Sel opts={FOUNDATION} value={f.meta_foundation} onChange={s('meta_foundation')} /></F>
                <F label="Primary Material" req><Sel opts={MATERIALS} value={f.material} onChange={s('material')} /></F>
                <F label="Construction Year" req><Inp type="number" value={f.construction_year} onChange={s('construction_year')} placeholder="2008" required /></F>
                <F label="Design Life (years)"><Sel opts={[50, 75, 100]} value={f.design_life} onChange={s('design_life')} /></F>
                <F label="Funding Source"><Sel opts={FUNDING} value={f.funding_source} onChange={s('funding_source')} /></F>
            </div>

            <Sec letter="C" title="Traffic Data" color="#10b981" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="AADT (Vehicles/Day)"><Inp type="number" value={f.daily_traffic_count} onChange={s('daily_traffic_count')} placeholder="85000" /></F>
                <F label="Traffic Load Category" req><Sel opts={LOADS} value={f.traffic_load} onChange={s('traffic_load')} /></F>
                <F label="Urban Congestion Level"><Sel opts={CONGESTION} value={f.meta_congestion} onChange={s('meta_congestion')} /></F>
            </div>

            <Sec letter="D" title="Inspection & Condition" color="#f59e0b" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Last Inspection Date"><Inp type="date" value={f.last_inspection_date} onChange={s('last_inspection_date')} /></F>
                <F label="Inspection Type"><Sel opts={INSP_TYPES} value={f.meta_inspection_type} onChange={s('meta_inspection_type')} /></F>
                <F label="Structural Condition (0–10)" req><Inp type="number" step="0.1" min="0" max="10" value={f.structural_condition} onChange={s('structural_condition')} placeholder="7.0" required /></F>
                <F label="Environmental Exposure" req><Sel opts={ENV} value={f.env_exposure} onChange={s('env_exposure')} /></F>
                <F label="Deck Condition"><Sel opts={['Good', 'Fair', 'Poor', 'Critical']} value={f.meta_deck} onChange={s('meta_deck')} /></F>
                <F label="Bearing Condition"><Sel opts={['Good', 'Fair', 'Poor', 'Failed']} value={f.meta_bearing} onChange={s('meta_bearing')} /></F>
                <F label="Drainage Condition"><Sel opts={['Good', 'Blocked', 'Poor']} value={f.meta_drainage} onChange={s('meta_drainage')} /></F>
                <F label="Estimated Repair Cost (₹ Cr)"><Inp type="number" step="0.01" value={f.meta_repair_cost} onChange={s('meta_repair_cost')} placeholder="18.0" /></F>
                <F label="Nearest Hospital (km)"><Inp type="number" step="0.1" value={f.nearest_hospital_km} onChange={s('nearest_hospital_km')} placeholder="2.5" /></F>
            </div>

            <Sec letter="E" title="Financial Details" color="#a855f7" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Original Project Cost (₹ Crore)"><Inp type="number" step="0.01" value={f.replacement_cost_crore} onChange={s('replacement_cost_crore')} placeholder="165.0" /></F>
                <F label="Economic Importance"><Sel opts={ECON_IMP} value={f.economic_importance} onChange={s('economic_importance')} /></F>
                <F label="Seismic Zone" req><Sel opts={SEISMIC} value={f.seismic_zone} onChange={s('seismic_zone')} /></F>
                <F label="Flood Risk" req><Sel opts={FLOOD} value={f.flood_risk} onChange={s('flood_risk')} /></F>
                <F label="Climate Zone"><Sel opts={['tropical', 'arid', 'semi-arid', 'coastal', 'highland']} value={f.climate_zone} onChange={s('climate_zone')} /></F>
                <F label="Annual Rainfall (mm)"><Inp type="number" value={f.annual_rainfall_mm} onChange={s('annual_rainfall_mm')} placeholder="972" /></F>
            </div>
        </>
    );
}

// ─── TUNNEL FORM ─────────────────────────────────────────────
function TunnelForm({ f, s }) {
    return (
        <>
            <Sec letter="A" title="Identification" color="#3b82f6" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Tunnel ID / Asset Code"><Inp value={f.asset_code} onChange={s('asset_code')} placeholder="USBRL-TUN-05" /></F>
                <F label="Tunnel Name" req><Inp value={f.name} onChange={s('name')} placeholder="Chenab Tunnel T-49" required /></F>
                <F label="Highway / Rail Number"><Inp value={f.highway_number} onChange={s('highway_number')} placeholder="NH-44A / USBRL" /></F>
                <F label="Chainage"><Inp value={f.chainage} onChange={s('chainage')} placeholder="Km 12.450" /></F>
                <F label="State" req><Inp value={f.state} onChange={s('state')} placeholder="Jammu & Kashmir" required /></F>
                <F label="Area / Locality" req><Inp value={f.area} onChange={s('area')} placeholder="Reasi" required /></F>
                <F label="Latitude" req><Inp type="number" step="any" value={f.latitude} onChange={s('latitude')} placeholder="33.07" required /></F>
                <F label="Longitude" req><Inp type="number" step="any" value={f.longitude} onChange={s('longitude')} placeholder="74.83" required /></F>
                <F label="Executing Agency"><Sel opts={[...AGENCIES, 'IRCON', 'RVNL', 'Indian Railways']} value={f.executing_agency} onChange={s('executing_agency')} /></F>
            </div>

            <Sec letter="B" title="Structural Details" color="#8b5cf6" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Total Length (m)" req><Inp type="number" step="1" value={f.length_meters} onChange={s('length_meters')} placeholder="1315" required /></F>
                <F label="Width / Diameter (m)" req><Inp type="number" step="0.1" value={f.width_meters} onChange={s('width_meters')} placeholder="9.0" required /></F>
                <F label="Lining Type"><Sel opts={LINING} value={f.meta_lining} onChange={s('meta_lining')} /></F>
                <F label="Ventilation Type"><Sel opts={VENTILATION} value={f.meta_ventilation} onChange={s('meta_ventilation')} /></F>
                <F label="Emergency Exit Count"><Inp type="number" value={f.meta_exits} onChange={s('meta_exits')} placeholder="4" /></F>
                <F label="Primary Material" req><Sel opts={MATERIALS} value={f.material} onChange={s('material')} /></F>
                <F label="Construction Year" req><Inp type="number" value={f.construction_year} onChange={s('construction_year')} placeholder="2022" required /></F>
                <F label="Design Life (years)"><Sel opts={[50, 75, 100, 120]} value={f.design_life} onChange={s('design_life')} /></F>
                <F label="Project Cost (₹ Crore)"><Inp type="number" step="0.01" value={f.replacement_cost_crore} onChange={s('replacement_cost_crore')} placeholder="2800" /></F>
            </div>

            <Sec letter="C" title="Safety Systems" color="#10b981" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Fire Detection System"><Sel opts={['Installed', 'Not Installed', 'Planned']} value={f.meta_fire} onChange={s('meta_fire')} /></F>
                <F label="CCTV Installed"><Sel opts={['Yes', 'No', 'Partial']} value={f.meta_cctv} onChange={s('meta_cctv')} /></F>
                <F label="Lighting System"><Sel opts={['LED Full', 'Partial', 'Inadequate']} value={f.meta_lighting} onChange={s('meta_lighting')} /></F>
                <F label="Emergency Power Backup"><Sel opts={['DG Set', 'UPS', 'None']} value={f.meta_power} onChange={s('meta_power')} /></F>
                <F label="Traffic Load Category" req><Sel opts={LOADS} value={f.traffic_load} onChange={s('traffic_load')} /></F>
                <F label="Environmental Exposure" req><Sel opts={ENV} value={f.env_exposure} onChange={s('env_exposure')} /></F>
            </div>

            <Sec letter="D" title="Risk & Geology" color="#ef4444" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Seismic Zone" req><Sel opts={SEISMIC} value={f.seismic_zone} onChange={s('seismic_zone')} /></F>
                <F label="Rock Type"><Sel opts={ROCK_TYPES} value={f.meta_rock} onChange={s('meta_rock')} /></F>
                <F label="Water Seepage Risk"><Sel opts={['High', 'Medium', 'Low', 'None']} value={f.meta_seepage} onChange={s('meta_seepage')} /></F>
                <F label="Landslide Risk"><Sel opts={['High', 'Medium', 'Low', 'None']} value={f.meta_landslide} onChange={s('meta_landslide')} /></F>
                <F label="Flood Risk" req><Sel opts={FLOOD} value={f.flood_risk} onChange={s('flood_risk')} /></F>
                <F label="Climate Zone"><Sel opts={['tropical', 'arid', 'semi-arid', 'coastal', 'highland']} value={f.climate_zone} onChange={s('climate_zone')} /></F>
            </div>

            <Sec letter="E" title="Inspection & Safety Audit" color="#f59e0b" />
            <div className="grid-3" style={{ gap: 14 }}>
                <F label="Last Safety Audit Date"><Inp type="date" value={f.last_inspection_date} onChange={s('last_inspection_date')} /></F>
                <F label="Structural Condition (0–10)" req><Inp type="number" step="0.1" min="0" max="10" value={f.structural_condition} onChange={s('structural_condition')} placeholder="8.5" required /></F>
                <F label="Safety Compliance Score (0–10)"><Inp type="number" step="0.1" min="0" max="10" value={f.meta_safety_score} onChange={s('meta_safety_score')} placeholder="9.0" /></F>
                <F label="Estimated Repair Cost (₹ Cr)"><Inp type="number" step="0.01" value={f.meta_repair_cost} onChange={s('meta_repair_cost')} placeholder="85.0" /></F>
                <F label="Nearest Hospital (km)"><Inp type="number" step="0.1" value={f.nearest_hospital_km} onChange={s('nearest_hospital_km')} placeholder="35.0" /></F>
                <F label="Economic Importance"><Sel opts={ECON_IMP} value={f.economic_importance} onChange={s('economic_importance')} /></F>
            </div>
        </>
    );
}

// ─── SECTION COLORS ──────────────────────────────────────────
const TYPE_CONFIG = {
    bridge: { label: 'Bridge', icon: '🌉', color: '#3b82f6', badge: 'bg-blue' },
    road: { label: 'Road', icon: '🛣️', color: '#10b981', badge: 'bg-green' },
    flyover: { label: 'Flyover / ROB', icon: '🏗️', color: '#8b5cf6', badge: 'bg-violet' },
    tunnel: { label: 'Tunnel', icon: '🚇', color: '#f59e0b', badge: 'bg-amber' },
};

// ─── INITIAL FORM STATE ───────────────────────────────────────
const INIT = {
    name: '', type: '', asset_code: '', area: '', state: '', latitude: '', longitude: '',
    highway_number: '', chainage: '', route_type: 'national_highway',
    construction_year: '', completion_year: '', design_life: '',
    material: 'concrete', traffic_load: 'medium', env_exposure: 'medium',
    structural_condition: '', length_meters: '', width_meters: '',
    daily_traffic_count: '', last_inspection_date: '', next_inspection_due: '',
    seismic_zone: 'III', flood_risk: 'medium', climate_zone: 'tropical',
    annual_rainfall_mm: '', replacement_cost_crore: '', nearest_hospital_km: '',
    economic_importance: 'medium', executing_agency: '', funding_source: '', num_spans: '',
    // meta fields (stored in description JSON + new columns)
    meta_district: '', meta_contractor: '', meta_consultant: '', meta_superstructure: '',
    meta_substructure: '', meta_foundation: '', meta_load_class: '', meta_strategic: '',
    meta_inspection_type: '', meta_defects: '', meta_action: '', meta_repair_cost: '',
    meta_scour: '', meta_coastal: '', meta_blackspot: '', meta_shoulder: '',
    meta_last_resurface: '', meta_congestion: '', meta_landslide: '', meta_deck: '',
    meta_bearing: '', meta_drainage: '', meta_lining: '', meta_ventilation: '',
    meta_exits: '', meta_fire: '', meta_cctv: '', meta_lighting: '', meta_power: '',
    meta_rock: '', meta_seepage: '', meta_safety_score: '',
};

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function DynamicInfrastructureForm({ onSuccess, onCancel }) {
    const [f, setF] = useState(INIT);
    const [submitting, setSub] = useState(false);

    // Setter factory
    const s = (key) => (e) => setF(prev => ({ ...prev, [key]: e.target.value }));

    // ── Live risk computation (mirrors Python risk_formula.py) ──
    const liveRisk = useMemo(() => {
        const DESIGN_LIFE = { steel: 75, composite: 80, concrete: 70, asphalt: 20, masonry: 100 };
        const LOAD_F = { light: 0.2, medium: 0.5, heavy: 0.8, extreme: 1.0 };
        const MAT_F = { steel: 0.3, composite: 0.5, concrete: 0.7, asphalt: 0.65, masonry: 0.9 };
        const ENV_F = { low: 0.1, medium: 0.3, high: 0.6, severe: 1.0 };
        const FLOOD_F = { negligible: 0.0, low: 0.15, medium: 0.45, high: 0.75, very_high: 1.0 };
        const SEISMIC_F = { II: 0.15, III: 0.45, IV: 0.75, V: 1.0 };
        const ZONE_M = { coastal: 1.30, tropical: 1.20, highland: 1.10, 'semi-arid': 1.05, arid: 1.0 };

        const age = f.construction_year ? new Date().getFullYear() - parseInt(f.construction_year) : 10;
        const mat = f.material || 'concrete';
        const maxAge = DESIGN_LIFE[mat] || 80;
        const ageFactor = Math.min(age / maxAge, 1.0);
        const loadF = LOAD_F[f.traffic_load] || 0.5;
        const matF = MAT_F[mat] || 0.7;
        const envF = ENV_F[f.env_exposure] || 0.3;
        const floodF = FLOOD_F[f.flood_risk] || 0.15;
        const seisF = SEISMIC_F[f.seismic_zone] || 0.15;
        const rainF = Math.min((parseInt(f.annual_rainfall_mm) || 800) / 2500, 1.0);
        const climF = Math.min(0.45 * floodF + 0.35 * seisF + 0.20 * rainF, 1.0);
        const zoneM = ZONE_M[f.climate_zone] || 1.05;
        const base = (0.30 * ageFactor + 0.22 * loadF + 0.18 * matF + 0.15 * envF + 0.15 * climF) * 100;
        const score = Math.min(base * zoneM, 100);
        const level = score >= 75 ? 'critical' : score >= 55 ? 'high' : score >= 35 ? 'moderate' : 'low';

        // Smart data validation warnings
        const warnings = [];
        const cond = parseFloat(f.structural_condition);
        if (cond >= 8.5 && age > 40) warnings.push(`⚠️ Structural condition ${cond}/10 seems too high for a ${age}-year-old structure.`);
        if (cond <= 3 && age < 10) warnings.push(`⚠️ Condition ${cond}/10 is very low for a structure only ${age} years old — verify field data.`);
        if (age > maxAge) warnings.push(`⚠️ Age (${age} yrs) exceeds ${mat} design life (${maxAge} yrs) — this structure is past its service life.`);
        if (age < 0) warnings.push('❌ Construction year is in the future — check the year.');
        const length = parseFloat(f.length_meters);
        const width = parseFloat(f.width_meters);
        if (length && width && length < width) warnings.push(`⚠️ Length (${length}m) is shorter than width (${width}m) — verify dimensions.`);
        if (length > 10000) warnings.push(`⚠️ Length ${length}m is unusually large — please verify.`);
        const traffic = parseInt(f.daily_traffic_count);
        if (traffic > 500000) warnings.push(`⚠️ Daily traffic ${traffic.toLocaleString()} seems very high — verify AADT.`);
        if (f.traffic_load === 'extreme' && traffic && traffic < 5000) warnings.push('⚠️ Extreme load class but low AADT — consider if load classification is correct.');

        const RISK_COLOR = { critical: '#ef4444', high: '#f97316', moderate: '#f59e0b', low: '#10b981' };
        return { score: Math.round(score * 10) / 10, level, age, warnings, color: RISK_COLOR[level] };
    }, [f.construction_year, f.material, f.traffic_load, f.env_exposure,
    f.flood_risk, f.seismic_zone, f.climate_zone, f.annual_rainfall_mm,
    f.structural_condition, f.length_meters, f.width_meters, f.daily_traffic_count]);

    const handleTypeSelect = (type) => {
        setF(prev => ({ ...prev, type }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!f.type) { toast.error('Please select the infrastructure type first'); return; }
        setSub(true);
        try {
            // Build metadata object from meta_ fields
            const meta = {};
            Object.entries(f).forEach(([k, v]) => { if (k.startsWith('meta_') && v) meta[k.slice(5)] = v; });

            const payload = {
                name: f.name,
                type: f.type,
                area: f.area || f.meta_district || f.state,
                city: f.area || f.meta_district || f.state,
                state: f.state,
                latitude: parseFloat(f.latitude),
                longitude: parseFloat(f.longitude),
                age_years: f.construction_year ? new Date().getFullYear() - parseInt(f.construction_year) : 10,
                construction_year: parseInt(f.construction_year),
                material: f.material || 'concrete',
                traffic_load: f.traffic_load,
                env_exposure: f.env_exposure,
                structural_condition: parseFloat(f.structural_condition) || 7,
                length_meters: f.length_meters ? parseFloat(f.length_meters) : null,
                width_meters: f.width_meters ? parseFloat(f.width_meters) : null,
                daily_traffic_count: f.daily_traffic_count ? parseInt(f.daily_traffic_count) : null,
                route_type: f.route_type,
                economic_importance: f.economic_importance,
                seismic_zone: f.seismic_zone,
                flood_risk: f.flood_risk,
                climate_zone: f.climate_zone,
                annual_rainfall_mm: f.annual_rainfall_mm ? parseInt(f.annual_rainfall_mm) : null,
                replacement_cost_crore: f.replacement_cost_crore ? parseFloat(f.replacement_cost_crore) : null,
                nearest_hospital_km: f.nearest_hospital_km ? parseFloat(f.nearest_hospital_km) : null,
                last_inspection_date: f.last_inspection_date || null,
                next_inspection_due: f.next_inspection_due || null,
                // Extra govt fields as structured description
                description: JSON.stringify({
                    asset_code: f.asset_code,
                    highway_number: f.highway_number,
                    chainage: f.chainage,
                    agency: f.executing_agency,
                    funding: f.funding_source,
                    design_life: f.design_life,
                    num_spans: f.num_spans,
                    completion_year: f.completion_year,
                    ...meta,
                }),
            };

            await createInfrastructure(payload);
            toast.success(`${TYPE_CONFIG[f.type]?.icon} ${f.name} added successfully!`);
            onSuccess?.();
            setF(INIT);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create record');
        } finally {
            setSub(false);
        }
    };

    const cfg = f.type ? TYPE_CONFIG[f.type] : null;

    return (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <div className="section-title" style={{ fontSize: '1rem' }}>
                        {cfg ? `${cfg.icon} Add New ${cfg.label}` : '🏛️ Add New Infrastructure Record'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Ministry-grade digital asset register — select type to begin
                    </div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>✕ Cancel</button>
            </div>

            {/* Type Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {TYPES.map(t => (
                    <button key={t.key} type="button" onClick={() => handleTypeSelect(t.key)}
                        style={{
                            padding: '14px 10px', borderRadius: 12, border: `2px solid ${f.type === t.key ? TYPE_CONFIG[t.key].color : 'rgba(255,255,255,0.08)'}`,
                            background: f.type === t.key ? `${TYPE_CONFIG[t.key].color}18` : 'rgba(255,255,255,0.03)',
                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                        }}>
                        <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{t.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: f.type === t.key ? TYPE_CONFIG[t.key].color : 'var(--text-primary)' }}>{t.label}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.sub}</div>
                    </button>
                ))}
            </div>

            {/* Dynamic Form */}
            {f.type && (
                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '2px 0' }}>
                        {f.type === 'bridge' && <BridgeForm f={f} s={s} />}
                        {f.type === 'road' && <RoadForm f={f} s={s} />}
                        {f.type === 'flyover' && <FlyoverForm f={f} s={s} />}
                        {f.type === 'tunnel' && <TunnelForm f={f} s={s} />}
                    </div>

                    {/* ── Live Risk Preview Panel ─────────────────── */}
                    <div style={{
                        marginTop: 24, borderRadius: 12,
                        background: `linear-gradient(135deg, ${liveRisk.color}0a 0%, rgba(0,0,0,0) 60%)`,
                        border: `1px solid ${liveRisk.color}30`,
                        padding: '16px 20px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 62, height: 62, borderRadius: 14, flexShrink: 0,
                                    background: `${liveRisk.color}18`, border: `2px solid ${liveRisk.color}50`,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.4rem', color: liveRisk.color, lineHeight: 1 }}>{liveRisk.score}</span>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>RISK</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Live Risk Estimate</div>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: liveRisk.color, textTransform: 'capitalize' }}>{liveRisk.level} Risk</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Age: {liveRisk.age} yrs · Updates as you type</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['Age factor', 'Load factor', 'Environment', 'Climate'].map((label, i) => (
                                    <div key={label} style={{ textAlign: 'center', padding: '6px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: '0.7rem' }}>
                                        <div style={{ color: 'var(--text-muted)' }}>{label}</div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>✓</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Validation warnings */}
                        {liveRisk.warnings.length > 0 && (
                            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {liveRisk.warnings.map((w, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                                        borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', color: '#f59e0b'
                                    }}>{w}</div>
                                ))}
                            </div>
                        )}

                        {liveRisk.warnings.length === 0 && (
                            <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#10b981' }}>✅ Data looks consistent — no anomalies detected</div>
                        )}
                    </div>

                    <div style={{
                        marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(59,130,246,0.05)',
                        border: '1px solid rgba(59,130,246,0.12)', fontSize: '0.78rem', color: 'var(--text-muted)'
                    }}>
                        <strong style={{ color: 'var(--text-primary)' }}>⚠ Ministry Minimum:</strong> Asset ID, Location, Construction Year,
                        Agency, Condition Rating, Last Inspection, Repair Cost, Budget Status — ensure these 8 fields are filled before submission.
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}
                            style={{ background: cfg?.color, borderColor: cfg?.color, minWidth: 160 }}>
                            {submitting ? 'Submitting…' : `Add ${cfg?.label} to Register`}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
