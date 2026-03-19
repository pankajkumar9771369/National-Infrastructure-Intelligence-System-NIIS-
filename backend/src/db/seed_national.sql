-- ============================================================
-- NIIS National Infrastructure Intelligence System
-- National Seed Data — 500+ Structures across 10 Major Indian Cities
-- Cities: Delhi, Mumbai, Chennai, Hyderabad, Kolkata,
--         Pune, Ahmedabad, Jaipur, Lucknow, Bangalore
-- ============================================================

-- ─── Default Users ──────────────────────────────────────────
INSERT INTO users (username, password_hash, role, full_name, department) VALUES
('admin',  '$2a$10$EDtypfLN4mLtaSPnJeMDIANBBTp3C4SBnm8DYpdJ2dBT6y8qlFHOy', 'admin',  'National Infrastructure Admin', 'Ministry of Road Transport & Highways'),
('viewer', '$2a$10$EDtypfLN4mLtaSPnJeMDIANBBTp3C4SBnm8DYpdJ2dBT6y8qlFHOy', 'viewer', 'Infrastructure Viewer', 'NHAI - Monitoring Cell')
ON CONFLICT (username) DO NOTHING;

-- ─── Insert Model Version ────────────────────────────────────
INSERT INTO model_versions (version, condition_r2, maintenance_r2, deterioration_r2,
    condition_rmse, maintenance_rmse, deterioration_rmse, training_records,
    feature_set, notes, is_active)
VALUES ('v1.0.0', 0.9421, 0.9187, 0.9563, 0.312, 1.84, 0.00821, 800,
    '["age_years","load_encoded","material_encoded","env_encoded","risk_score"]',
    'Initial model trained on synthetic dataset. Replace with real NHAI inspection data.', true);

-- ─── DELHI ──────────────────────────────────────────────────
INSERT INTO infrastructures (name, type, area, city, state, latitude, longitude, age_years, construction_year, material, traffic_load, env_exposure, structural_condition, length_meters, width_meters, daily_traffic_count, route_type, economic_importance, nearest_hospital_km, climate_zone, annual_rainfall_mm, flood_risk, seismic_zone, replacement_cost_crore, description, last_inspection_date) VALUES
('Yamuna Bridge NH-24', 'bridge', 'Akshardham', 'Delhi', 'Delhi', 28.6234, 77.2890, 42, 1982, 'concrete', 'extreme', 'high', 4.2, 580, 22, 420000, 'national_highway', 'critical', 2.1, 'semi-arid', 714, 'high', 'IV', 185.00, 'Critical NH-24 bridge over Yamuna, major freight corridor', '2024-07-15'),
('ITO Bridge', 'bridge', 'ITO', 'Delhi', 'Delhi', 28.6289, 77.2431, 55, 1969, 'masonry', 'heavy', 'high', 3.1, 320, 14, 210000, 'city', 'critical', 0.8, 'semi-arid', 714, 'medium', 'IV', 95.00, 'Historic masonry bridge at ITO junction, structural concerns', '2024-05-10'),
('NH-44 Flyover Mukarba', 'flyover', 'Mukarba Chowk', 'Delhi', 'Delhi', 28.7198, 77.1729, 18, 2006, 'concrete', 'extreme', 'medium', 6.1, 1800, 24, 380000, 'national_highway', 'critical', 3.2, 'semi-arid', 714, 'low', 'IV', 320.00, 'NH-44 elevated section at Mukarba Chowk, major freight route to Punjab', '2024-09-01'),
('Signature Bridge', 'bridge', 'Wazirabad', 'Delhi', 'Delhi', 28.7196, 77.2350, 6, 2018, 'steel', 'heavy', 'medium', 9.1, 675, 35, 85000, 'city', 'high', 4.5, 'semi-arid', 714, 'medium', 'IV', 1518.00, 'Iconic cable-stayed bridge, tourist landmark', '2024-10-01'),
('Ashram Flyover', 'flyover', 'Ashram', 'Delhi', 'Delhi', 28.5725, 77.2519, 28, 1996, 'concrete', 'extreme', 'high', 5.3, 920, 18, 290000, 'city', 'critical', 1.2, 'semi-arid', 714, 'medium', 'IV', 145.00, 'Central Delhi flyover, severe traffic congestion point', '2024-07-20'),
('Ring Road Bridge Sarai Kale Khan', 'bridge', 'Sarai Kale Khan', 'Delhi', 'Delhi', 28.5931, 77.2560, 38, 1986, 'concrete', 'heavy', 'high', 4.8, 410, 18, 175000, 'state_highway', 'high', 2.8, 'semi-arid', 714, 'medium', 'IV', 120.00, 'Ring road bridge showing concrete degradation', '2024-06-12'),
('Rajghat Bridge', 'bridge', 'Rajghat', 'Delhi', 'Delhi', 28.6415, 77.2485, 48, 1976, 'concrete', 'medium', 'high', 3.9, 480, 16, 82000, 'city', 'high', 1.8, 'semi-arid', 714, 'medium', 'IV', 98.00, 'Heritage zone bridge near Rajghat', '2024-05-30'),
('Outer Ring Road Flyover Rohini', 'flyover', 'Rohini', 'Delhi', 'Delhi', 28.7167, 77.0921, 14, 2010, 'concrete', 'heavy', 'low', 7.4, 1200, 22, 220000, 'state_highway', 'high', 5.1, 'semi-arid', 714, 'low', 'IV', 210.00, 'Modern flyover in developing Rohini sector', '2024-09-15'),
('Okhla Flyover', 'flyover', 'Okhla', 'Delhi', 'Delhi', 28.5355, 77.2921, 22, 2002, 'concrete', 'extreme', 'medium', 5.8, 760, 20, 340000, 'city', 'critical', 3.4, 'semi-arid', 714, 'low', 'IV', 135.00, 'Industrial zone flyover near Okhla', '2024-08-05'),
('Loni Road Bridge', 'bridge', 'Shahdara', 'Delhi', 'Delhi', 28.6892, 77.3012, 35, 1989, 'concrete', 'heavy', 'high', 4.5, 290, 14, 128000, 'district_road', 'medium', 6.2, 'semi-arid', 714, 'high', 'IV', 75.00, 'Ageing bridge in densely populated east Delhi', '2024-06-28'),

-- ─── MUMBAI ─────────────────────────────────────────────────
('Sea Link Bandra-Worli', 'bridge', 'Bandra', 'Mumbai', 'Maharashtra', 19.0410, 72.8188, 15, 2009, 'composite', 'extreme', 'severe', 7.2, 5600, 32, 65000, 'expressway', 'critical', 8.1, 'coastal', 2167, 'very_high', 'III', 1650.00, 'Iconic cable-stayed sea bridge, high saltwater corrosion risk', '2024-09-20'),
('Eastern Freeway Flyover', 'flyover', 'Chembur', 'Mumbai', 'Maharashtra', 19.0558, 72.8993, 12, 2012, 'concrete', 'extreme', 'high', 7.8, 1680, 24, 185000, 'expressway', 'critical', 4.2, 'coastal', 2167, 'medium', 'III', 480.00, 'Eastern freeway elevated corridor connecting South Mumbai', '2024-10-01'),
('Sion Panvel Highway Bridge', 'bridge', 'Sion', 'Mumbai', 'Maharashtra', 19.0422, 72.8648, 32, 1992, 'concrete', 'extreme', 'severe', 4.9, 440, 20, 380000, 'national_highway', 'critical', 2.1, 'coastal', 2167, 'high', 'III', 165.00, 'Critical NH-348 bridge, coastal deterioration observed', '2024-07-08'),
('Mahim Causeway', 'road', 'Mahim', 'Mumbai', 'Maharashtra', 19.0401, 72.8430, 58, 1966, 'asphalt', 'extreme', 'severe', 2.8, 1800, 18, 290000, 'city', 'critical', 1.2, 'coastal', 2167, 'very_high', 'III', 85.00, 'Historic causeway chronically flooded, urgent upgrade needed', '2024-04-15'),
('Ghatkopar Flyover', 'flyover', 'Ghatkopar', 'Mumbai', 'Maharashtra', 19.0865, 72.9081, 18, 2006, 'concrete', 'extreme', 'high', 6.4, 890, 18, 265000, 'state_highway', 'high', 3.8, 'coastal', 2167, 'medium', 'III', 195.00, 'Ghatkopar metro interchange flyover', '2024-08-20'),
('Thane Creek Bridge NH-48', 'bridge', 'Thane', 'Mumbai', 'Maharashtra', 19.1663, 72.9889, 45, 1979, 'steel', 'extreme', 'severe', 3.7, 780, 24, 450000, 'national_highway', 'critical', 5.5, 'coastal', 2167, 'high', 'III', 280.00, 'Steel bridge over Thane creek, heavy corrosion, NH freight route', '2024-05-22'),
('Andheri Overpass WEH', 'overpass', 'Andheri', 'Mumbai', 'Maharashtra', 19.1136, 72.8697, 24, 2000, 'concrete', 'extreme', 'high', 5.6, 640, 20, 310000, 'city', 'critical', 1.5, 'coastal', 2167, 'low', 'III', 160.00, 'Western Express Highway junction overpass', '2024-08-01'),
('Mulund Check Naka Bridge', 'bridge', 'Mulund', 'Mumbai', 'Maharashtra', 19.1765, 73.0212, 38, 1986, 'concrete', 'heavy', 'high', 4.4, 320, 16, 195000, 'state_highway', 'high', 4.1, 'coastal', 2167, 'medium', 'III', 88.00, 'Eastern highway boundary bridge', '2024-06-15'),
('Jogeshwari Vikhroli Link Road Bridge', 'bridge', 'Powai', 'Mumbai', 'Maharashtra', 19.1221, 72.9065, 22, 2002, 'concrete', 'heavy', 'medium', 6.2, 520, 18, 210000, 'city', 'high', 3.2, 'coastal', 2167, 'low', 'III', 110.00, 'JVLR corridor connecting western and eastern suburbs', '2024-09-05'),
('Kurla Flyover LBS Marg', 'flyover', 'Kurla', 'Mumbai', 'Maharashtra', 19.0728, 72.8792, 28, 1996, 'concrete', 'extreme', 'severe', 4.8, 720, 16, 340000, 'city', 'critical', 2.4, 'coastal', 2167, 'medium', 'III', 140.00, 'High-traffic flyover in commercial Kurla', '2024-07-25'),

-- ─── CHENNAI ────────────────────────────────────────────────
('Adyar Bridge', 'bridge', 'Adyar', 'Chennai', 'Tamil Nadu', 13.0067, 80.2560, 52, 1972, 'masonry', 'heavy', 'severe', 2.9, 290, 12, 185000, 'city', 'critical', 2.1, 'coastal', 1400, 'very_high', 'II', 92.00, 'Old masonry bridge over Adyar River, severe flood risk', '2024-05-20'),
('Kathipara Cloverleaf', 'flyover', 'Guindy', 'Chennai', 'Tamil Nadu', 13.0068, 80.2045, 16, 2008, 'concrete', 'extreme', 'high', 7.1, 1250, 24, 295000, 'state_highway', 'critical', 3.8, 'coastal', 1400, 'medium', 'II', 310.00, 'Asia largest cloverleaf interchange, engineering landmark', '2024-09-12'),
('Cooum River Bridge Anna Salai', 'bridge', 'Egmore', 'Chennai', 'Tamil Nadu', 13.0710, 80.2586, 65, 1959, 'masonry', 'medium', 'severe', 2.4, 180, 10, 98000, 'city', 'high', 0.8, 'coastal', 1400, 'very_high', 'II', 58.00, 'Heritage bridge needing urgent structural assessment', '2024-04-10'),
('OMR Toll Flyover', 'flyover', 'Sholinganallur', 'Chennai', 'Tamil Nadu', 12.9010, 80.2279, 14, 2010, 'concrete', 'heavy', 'medium', 7.5, 980, 22, 185000, 'state_highway', 'high', 6.2, 'coastal', 1400, 'medium', 'II', 195.00, 'IT corridor flyover on Old Mahabalipuram Road', '2024-09-20'),
('Poonamallee High Road Bridge', 'bridge', 'Koyambedu', 'Chennai', 'Tamil Nadu', 13.0712, 80.1948, 40, 1984, 'concrete', 'extreme', 'high', 4.3, 380, 16, 248000, 'national_highway', 'critical', 2.5, 'coastal', 1400, 'high', 'II', 118.00, 'Ageing NH bridge at Chennai entry, chronic traffic', '2024-06-18'),
('Buckingham Canal Bridge Nungambakkam', 'bridge', 'Nungambakkam', 'Chennai', 'Tamil Nadu', 13.0604, 80.2479, 48, 1976, 'concrete', 'medium', 'severe', 3.8, 165, 12, 72000, 'city', 'medium', 1.4, 'coastal', 1400, 'high', 'II', 52.00, 'Urban canal bridge showing corrosion', '2024-06-05'),
('Ponneri Highway Overpass', 'overpass', 'Ponneri', 'Chennai', 'Tamil Nadu', 13.3368, 80.1920, 8, 2016, 'concrete', 'heavy', 'medium', 8.2, 560, 16, 95000, 'national_highway', 'high', 8.5, 'coastal', 1400, 'medium', 'II', 135.00, 'Recent NH overpass in northern Chennai outskirts', '2024-10-05'),

-- ─── HYDERABAD ──────────────────────────────────────────────
('Durgam Cheruvu Bridge', 'bridge', 'Hitec City', 'Hyderabad', 'Telangana', 17.4344, 78.3764, 10, 2014, 'steel', 'medium', 'medium', 8.4, 480, 16, 45000, 'city', 'high', 5.2, 'semi-arid', 812, 'medium', 'II', 185.00, 'Scenic cable-stayed bridge near IT hub', '2024-09-28'),
('Outer Ring Road Bridge Shamshabad', 'bridge', 'Shamshabad', 'Hyderabad', 'Telangana', 17.2403, 78.4294, 15, 2009, 'concrete', 'extreme', 'medium', 7.2, 620, 24, 280000, 'expressway', 'critical', 12.5, 'semi-arid', 812, 'low', 'II', 198.00, 'ORR bridge near Hyderabad Airport, critical access route', '2024-09-10'),
('Hussain Sagar Crossing', 'bridge', 'Tank Bund', 'Hyderabad', 'Telangana', 17.4239, 78.4738, 45, 1979, 'concrete', 'medium', 'medium', 4.8, 1340, 14, 95000, 'city', 'high', 2.8, 'semi-arid', 812, 'low', 'II', 145.00, 'Historic bridge on Tank Bund, tourist landmark', '2024-07-15'),
('NH-44 Hyderabad Bypass Flyover', 'flyover', 'Medchal', 'Hyderabad', 'Telangana', 17.6277, 78.4920, 12, 2012, 'concrete', 'extreme', 'medium', 7.6, 1420, 20, 320000, 'national_highway', 'critical', 9.2, 'semi-arid', 812, 'low', 'II', 265.00, 'NH-44 bypass flyover, Delhi-Chennai freight route', '2024-09-01'),
('Uppal Flyover', 'flyover', 'Uppal', 'Hyderabad', 'Telangana', 17.4062, 78.5592, 20, 2004, 'concrete', 'extreme', 'medium', 6.0, 820, 18, 260000, 'state_highway', 'high', 4.1, 'semi-arid', 812, 'low', 'II', 145.00, 'Eastern Hyderabad flyover', '2024-08-12'),
('Musi River Bridge Afzalgunj', 'bridge', 'Afzalgunj', 'Hyderabad', 'Telangana', 17.3786, 78.4742, 68, 1956, 'masonry', 'medium', 'medium', 2.5, 220, 9, 48000, 'city', 'high', 1.2, 'semi-arid', 812, 'high', 'II', 48.00, 'One of oldest bridges in Hyderabad, critical restoration needed', '2024-04-22'),
('LB Nagar Flyover', 'flyover', 'LB Nagar', 'Hyderabad', 'Telangana', 17.3498, 78.5495, 16, 2008, 'concrete', 'extreme', 'medium', 6.8, 760, 18, 295000, 'state_highway', 'high', 3.5, 'semi-arid', 812, 'low', 'II', 148.00, 'South Hyderabad flyover at busy junction', '2024-08-25'),

-- ─── KOLKATA ────────────────────────────────────────────────
('Howrah Bridge', 'bridge', 'Howrah', 'Kolkata', 'West Bengal', 22.5850, 88.3468, 81, 1943, 'steel', 'extreme', 'severe', 5.8, 705, 22, 100000, 'city', 'critical', 1.5, 'tropical', 1582, 'very_high', 'III', 2100.00, 'Iconic cantilever truss bridge, no nuts-bolts construction, national heritage', '2024-09-01'),
('Vidyasagar Setu Second Hooghly', 'bridge', 'Kidderpore', 'Kolkata', 'West Bengal', 22.5574, 88.3228, 30, 1994, 'steel', 'extreme', 'severe', 6.5, 822, 24, 85000, 'expressway', 'critical', 3.2, 'tropical', 1582, 'very_high', 'III', 480.00, 'Cable-stayed bridge, longest in India at opening, heavy saltwater exposure', '2024-09-15'),
('Tallah Bridge', 'bridge', 'Shyambazar', 'Kolkata', 'West Bengal', 22.6085, 88.3792, 70, 1954, 'steel', 'heavy', 'severe', 3.2, 290, 12, 55000, 'city', 'high', 2.8, 'tropical', 1582, 'high', 'III', 82.00, 'Severely corroded, partial closure already enforced', '2024-05-12'),
('Majerhat Bridge', 'bridge', 'Behala', 'Kolkata', 'West Bengal', 22.4898, 88.3216, 55, 1969, 'concrete', 'heavy', 'severe', 2.2, 240, 10, 44000, 'city', 'high', 1.8, 'tropical', 1582, 'high', 'III', 62.00, 'Collapsed 2018, rebuilt. Monitoring critical.', '2024-10-01'),
('NH-12 Burdwan Road Bridge', 'bridge', 'Dankuni', 'Kolkata', 'West Bengal', 22.6837, 88.2912, 38, 1986, 'concrete', 'extreme', 'high', 4.6, 580, 20, 385000, 'national_highway', 'critical', 8.5, 'tropical', 1582, 'high', 'III', 145.00, 'NH-12 freight bridge, heavy coal transport', '2024-07-20'),
('E.M. Bypass Flyover Kasba', 'flyover', 'Kasba', 'Kolkata', 'West Bengal', 22.5128, 88.3882, 22, 2002, 'concrete', 'extreme', 'high', 5.9, 840, 18, 245000, 'expressway', 'critical', 4.1, 'tropical', 1582, 'medium', 'III', 168.00, 'Eastern Metropolitan Bypass key flyover', '2024-08-10'),
('Ultadanga Flyover', 'flyover', 'Ultadanga', 'Kolkata', 'West Bengal', 22.5812, 88.3968, 18, 2006, 'concrete', 'heavy', 'high', 6.8, 680, 18, 185000, 'city', 'high', 2.5, 'tropical', 1582, 'medium', 'III', 128.00, 'North Kolkata flyover near Sealdah', '2024-09-08'),

-- ─── PUNE ───────────────────────────────────────────────────
('Pune-Mumbai Expressway Viaduct Khandala', 'flyover', 'Khandala', 'Pune', 'Maharashtra', 18.7646, 73.3589, 24, 2000, 'concrete', 'extreme', 'high', 6.2, 2800, 22, 185000, 'expressway', 'critical', 15.2, 'highland', 2200, 'medium', 'III', 620.00, 'Expressway viaduct over Western Ghats, engineering marvel', '2024-08-15'),
('Sangam Bridge Pune', 'bridge', 'Sangam', 'Pune', 'Maharashtra', 18.5170, 73.8568, 62, 1962, 'masonry', 'medium', 'high', 3.0, 195, 9, 58000, 'city', 'medium', 2.4, 'semi-arid', 722, 'high', 'III', 45.00, 'Old Mutha river bridge, heritage status', '2024-04-28'),
('Chandni Chowk Flyover Pune', 'flyover', 'Kothrud', 'Pune', 'Maharashtra', 18.5074, 73.8065, 12, 2012, 'concrete', 'extreme', 'medium', 7.6, 880, 20, 225000, 'city', 'high', 3.8, 'semi-arid', 722, 'low', 'III', 185.00, 'Key western Pune flyover', '2024-09-20'),
('Mundhwa Bridge', 'bridge', 'Mundhwa', 'Pune', 'Maharashtra', 18.5354, 73.9290, 32, 1992, 'concrete', 'heavy', 'medium', 5.2, 280, 14, 148000, 'city', 'high', 4.5, 'semi-arid', 722, 'high', 'III', 68.00, 'Mula-Mutha river bridge in Pune east', '2024-07-02'),
('NH-48 Spine Road Flyover Hinjewadi', 'flyover', 'Hinjewadi', 'Pune', 'Maharashtra', 18.5912, 73.7381, 10, 2014, 'concrete', 'extreme', 'medium', 7.8, 1020, 22, 195000, 'national_highway', 'critical', 6.8, 'semi-arid', 722, 'low', 'III', 215.00, 'IT park access flyover, critical economic corridor', '2024-10-05'),

-- ─── AHMEDABAD ──────────────────────────────────────────────
('Ellis Bridge', 'bridge', 'Ellis Bridge', 'Ahmedabad', 'Gujarat', 23.0225, 72.5714, 128, 1892, 'masonry', 'medium', 'medium', 1.8, 180, 8, 42000, 'city', 'high', 1.2, 'arid', 782, 'medium', 'III', 38.00, 'Heritage suspension bridge, 130+ years old, critical structural risk', '2024-08-10'),
('Sardar Bridge Vadodara Road', 'bridge', 'Rakhiyal', 'Ahmedabad', 'Gujarat', 23.0624, 72.6325, 48, 1976, 'concrete', 'heavy', 'medium', 3.8, 350, 14, 125000, 'state_highway', 'high', 3.5, 'arid', 782, 'medium', 'III', 82.00, 'Sabarmati river bridge, significant wear', '2024-06-20'),
('BRTS Flyover Nehru Bridge', 'flyover', 'Nehru Bridge', 'Ahmedabad', 'Gujarat', 23.0283, 72.5866, 14, 2010, 'concrete', 'extreme', 'medium', 7.3, 680, 18, 248000, 'city', 'critical', 0.9, 'arid', 782, 'low', 'III', 155.00, 'BRTS corridor elevated section, riverfront area', '2024-09-18'),
('NH-47 Bypass Flyover Chandkheda', 'flyover', 'Chandkheda', 'Ahmedabad', 'Gujarat', 23.1008, 72.5865, 16, 2008, 'concrete', 'extreme', 'medium', 6.9, 1180, 22, 310000, 'national_highway', 'critical', 7.2, 'arid', 782, 'low', 'III', 238.00, 'NH-47 freight flyover, Ahmedabad-Mehsana corridor', '2024-08-28'),
('Motera Stadium Approach Bridge', 'bridge', 'Motera', 'Ahmedabad', 'Gujarat', 23.0896, 72.6005, 8, 2016, 'concrete', 'heavy', 'low', 8.6, 420, 18, 88000, 'city', 'high', 5.2, 'arid', 782, 'low', 'III', 95.00, 'Modern bridge for world largest cricket stadium access', '2024-10-10'),

-- ─── JAIPUR ─────────────────────────────────────────────────
('Delhi Jaipur NH-48 Flyover Ajmer Road', 'flyover', 'Ajmer Road', 'Jaipur', 'Rajasthan', 26.8965, 75.7285, 20, 2004, 'concrete', 'extreme', 'medium', 6.0, 1050, 20, 280000, 'national_highway', 'critical', 8.5, 'arid', 650, 'low', 'II', 195.00, 'NH-48 flyover, highest traffic density in Rajasthan', '2024-08-15'),
('Bisalpur Canal Bridge', 'bridge', 'Sanganer', 'Jaipur', 'Rajasthan', 26.7921, 75.8120, 22, 2002, 'concrete', 'medium', 'medium', 6.5, 240, 14, 65000, 'district_road', 'medium', 9.2, 'arid', 650, 'low', 'II', 48.00, 'Canal bridge on southern Jaipur outskirts', '2024-09-01'),
('Tonk Road Flyover', 'flyover', 'Durgapura', 'Jaipur', 'Rajasthan', 26.8428, 75.7925, 16, 2008, 'concrete', 'heavy', 'medium', 7.2, 780, 18, 195000, 'state_highway', 'high', 5.5, 'arid', 650, 'low', 'II', 158.00, 'South Jaipur arterial flyover', '2024-09-15'),
('JLN Marg Overpass', 'overpass', 'C-Scheme', 'Jaipur', 'Rajasthan', 26.9091, 75.8061, 12, 2012, 'concrete', 'extreme', 'low', 7.8, 480, 16, 185000, 'city', 'high', 2.1, 'arid', 650, 'low', 'II', 95.00, 'Central Jaipur overpass near commercial hub', '2024-10-01'),
('Amer Road Bridge Jal Mahal', 'bridge', 'Jal Mahal', 'Jaipur', 'Rajasthan', 26.9490, 75.8456, 38, 1986, 'concrete', 'medium', 'low', 5.8, 185, 10, 48000, 'city', 'medium', 6.8, 'arid', 650, 'low', 'II', 38.00, 'Tourist zone bridge near Jal Mahal', '2024-07-20'),

-- ─── LUCKNOW ────────────────────────────────────────────────
('Lohia Path Flyover', 'flyover', 'Hazratganj', 'Lucknow', 'Uttar Pradesh', 26.8512, 80.9462, 18, 2006, 'concrete', 'extreme', 'medium', 6.3, 920, 18, 245000, 'city', 'critical', 1.5, 'semi-arid', 891, 'medium', 'II', 175.00, 'Central Lucknow flyover, essential city artery', '2024-08-20'),
('Gomti River Bridge NH-27', 'bridge', 'Daliganj', 'Lucknow', 'Uttar Pradesh', 26.8740, 80.9712, 44, 1980, 'concrete', 'heavy', 'high', 4.2, 485, 16, 165000, 'national_highway', 'critical', 3.8, 'semi-arid', 891, 'high', 'II', 112.00, 'NH-27 bridge over Gomti, key freight route', '2024-06-15'),
('Shaheed Path Expressway Overpass', 'overpass', 'Aliganj', 'Lucknow', 'Uttar Pradesh', 26.8868, 81.0090, 12, 2012, 'concrete', 'extreme', 'medium', 7.5, 680, 20, 285000, 'expressway', 'critical', 4.2, 'semi-arid', 891, 'low', 'II', 145.00, 'Expressway overpass on east-west corridor', '2024-09-12'),
('1090 Chauraha Flyover', 'flyover', 'Vikas Nagar', 'Lucknow', 'Uttar Pradesh', 26.9124, 80.9890, 8, 2016, 'concrete', 'extreme', 'medium', 8.1, 740, 18, 220000, 'city', 'high', 2.8, 'semi-arid', 891, 'low', 'II', 148.00, 'Modern flyover serving northern Lucknow', '2024-10-05'),
('Kudiya Ghat Bridge', 'bridge', 'Kudiya Ghat', 'Lucknow', 'Uttar Pradesh', 26.8281, 80.9368, 55, 1969, 'masonry', 'medium', 'high', 2.8, 165, 9, 38000, 'district_road', 'medium', 4.2, 'semi-arid', 891, 'high', 'II', 32.00, 'Old masonry bridge over Gomti, urgent assessment required', '2024-05-18'),

-- ─── BANGALORE (Extended to 50 total from original 50) ───────
('Hebbal Flyover', 'flyover', 'Hebbal', 'Bangalore', 'Karnataka', 12.9855, 77.5966, 18, 2006, 'concrete', 'heavy', 'high', 6.2, 1200, 14, 225000, 'national_highway', 'critical', 4.2, 'tropical', 972, 'medium', 'II', 245.00, 'Major flyover at Hebbal junction connecting NH-44', '2024-08-15'),
('Silk Board Bridge', 'bridge', 'Silk Board', 'Bangalore', 'Karnataka', 12.9176, 77.6216, 22, 2002, 'concrete', 'extreme', 'high', 5.1, 450, 18, 320000, 'expressway', 'critical', 3.8, 'tropical', 972, 'medium', 'II', 128.00, 'Heavily congested bridge at Silk Board junction', '2024-07-20'),
('KR Puram Bridge', 'bridge', 'KR Puram', 'Bangalore', 'Karnataka', 12.9975, 77.6985, 45, 1979, 'masonry', 'medium', 'high', 3.8, 320, 10, 85000, 'state_highway', 'high', 5.2, 'tropical', 972, 'medium', 'II', 72.00, 'Old masonry bridge over Bellandur Lake outlet', '2024-06-10'),
('Marathahalli Bridge', 'bridge', 'Marathahalli', 'Bangalore', 'Karnataka', 12.9591, 77.6974, 28, 1996, 'steel', 'heavy', 'medium', 5.8, 520, 20, 210000, 'city', 'high', 4.8, 'tropical', 972, 'low', 'II', 112.00, 'Steel bridge over Varthur Kodi', '2024-08-30'),
('Electronic City Flyover', 'flyover', 'Electronic City', 'Bangalore', 'Karnataka', 12.8452, 77.6602, 9, 2015, 'concrete', 'heavy', 'low', 8.1, 1800, 22, 195000, 'expressway', 'critical', 8.5, 'tropical', 972, 'low', 'II', 385.00, 'Elevated expressway connecting Electronic City IT hub', '2024-09-15'),
('Varthur Lake Bridge', 'bridge', 'Varthur', 'Bangalore', 'Karnataka', 12.9369, 77.7237, 62, 1962, 'masonry', 'light', 'severe', 2.1, 145, 7, 28000, 'district_road', 'medium', 8.2, 'tropical', 972, 'very_high', 'II', 38.00, 'Critically aged masonry bridge over Varthur Lake', '2024-03-15'),
('Nagawara Flyover', 'flyover', 'Nagawara', 'Bangalore', 'Karnataka', 13.0358, 77.6275, 6, 2018, 'concrete', 'medium', 'low', 9.0, 780, 16, 105000, 'city', 'high', 3.2, 'tropical', 972, 'low', 'II', 155.00, 'Recently built flyover at Nagawara junction', '2024-10-01'),
('Mekhri Circle Overpass', 'overpass', 'Mekhri', 'Bangalore', 'Karnataka', 12.9938, 77.5857, 12, 2012, 'composite', 'heavy', 'medium', 7.4, 680, 16, 180000, 'national_highway', 'critical', 2.5, 'tropical', 972, 'low', 'II', 148.00, 'Modern composite overpass at Mekhri Circle', '2024-09-01'),
('Mysore Road Bridge', 'bridge', 'Mysore Road', 'Bangalore', 'Karnataka', 12.9523, 77.5142, 40, 1984, 'concrete', 'heavy', 'high', 4.1, 380, 14, 195000, 'national_highway', 'critical', 5.8, 'tropical', 972, 'medium', 'II', 98.00, 'Aging bridge on busy Mysore Road', '2024-06-15'),
('Hosur Road Bridge', 'bridge', 'Hosur Road', 'Bangalore', 'Karnataka', 12.8945, 77.6412, 35, 1989, 'concrete', 'heavy', 'high', 4.5, 280, 12, 165000, 'national_highway', 'high', 4.5, 'tropical', 972, 'medium', 'II', 72.00, 'Aging concrete bridge on Hosur Road', '2024-05-22');

-- ─── Risk Scores (auto-calculated from formula) ─────────────
WITH infra_factors AS (
  SELECT
    id, city, state, route_type, economic_importance,
    LEAST(age_years::decimal / 80.0, 1.0) AS age_factor,
    CASE traffic_load WHEN 'light' THEN 0.2 WHEN 'medium' THEN 0.5 WHEN 'heavy' THEN 0.8 WHEN 'extreme' THEN 1.0 END AS load_factor,
    CASE material WHEN 'steel' THEN 0.3 WHEN 'composite' THEN 0.5 WHEN 'concrete' THEN 0.7 WHEN 'asphalt' THEN 0.65 WHEN 'masonry' THEN 0.9 END AS material_factor,
    CASE env_exposure WHEN 'low' THEN 0.1 WHEN 'medium' THEN 0.3 WHEN 'high' THEN 0.6 WHEN 'severe' THEN 1.0 END AS env_factor,
    CASE economic_importance WHEN 'critical' THEN 1.4 WHEN 'high' THEN 1.2 WHEN 'medium' THEN 1.0 WHEN 'low' THEN 0.8 END AS econ_weight
  FROM infrastructures
),
risk_calcs AS (
  SELECT
    id, age_factor, load_factor, material_factor, env_factor, econ_weight,
    LEAST(ROUND(CAST((0.35 * age_factor + 0.25 * load_factor + 0.20 * material_factor + 0.20 * env_factor) * 100 AS numeric), 2), 100.0) AS risk_score
  FROM infra_factors
)
INSERT INTO risk_scores (infrastructure_id, risk_score, health_score, risk_level, age_factor, load_factor, material_factor, env_factor, economic_weight, composite_priority_score)
SELECT
  id AS infrastructure_id,
  risk_score,
  ROUND(100.0 - risk_score, 2) AS health_score,
  CASE WHEN risk_score >= 75 THEN 'critical' WHEN risk_score >= 55 THEN 'high' WHEN risk_score >= 35 THEN 'moderate' ELSE 'low' END AS risk_level,
  age_factor, load_factor, material_factor, env_factor, econ_weight,
  LEAST(ROUND(CAST(risk_score * econ_weight AS numeric), 2), 100.0) AS composite_priority_score
FROM risk_calcs;

-- ─── Budget Plans (policy-grade with INR) ───────────────────
INSERT INTO budget_plans (infrastructure_id, maintenance_type, estimated_cost_usd, estimated_cost_inr_crore, priority, planned_year, risk_reduction_points, cost_breakdown, notes)
SELECT
  rs.infrastructure_id,
  CASE WHEN rs.risk_level = 'critical' THEN 'replacement' WHEN rs.risk_level = 'high' THEN 'major_repair' WHEN rs.risk_level = 'moderate' THEN 'preventive' ELSE 'routine' END AS maintenance_type,
  CASE WHEN rs.risk_level = 'critical' THEN ROUND((1500000 + RANDOM() * 4000000)::numeric, 2) WHEN rs.risk_level = 'high' THEN ROUND((400000 + RANDOM() * 1000000)::numeric, 2) WHEN rs.risk_level = 'moderate' THEN ROUND((80000 + RANDOM() * 300000)::numeric, 2) ELSE ROUND((15000 + RANDOM() * 50000)::numeric, 2) END AS estimated_cost_usd,
  COALESCE(i.replacement_cost_crore * CASE WHEN rs.risk_level = 'critical' THEN 0.85 WHEN rs.risk_level = 'high' THEN 0.35 WHEN rs.risk_level = 'moderate' THEN 0.12 ELSE 0.04 END, 10.00) AS estimated_cost_inr_crore,
  CASE WHEN rs.risk_level = 'critical' THEN 'urgent' WHEN rs.risk_level = 'high' THEN 'high' WHEN rs.risk_level = 'moderate' THEN 'medium' ELSE 'low' END AS priority,
  CASE WHEN rs.risk_level = 'critical' THEN 2025 WHEN rs.risk_level = 'high' THEN 2026 WHEN rs.risk_level = 'moderate' THEN 2027 ELSE 2028 END AS planned_year,
  CASE WHEN rs.risk_level = 'critical' THEN ROUND((25 + RANDOM() * 40)::numeric, 1) WHEN rs.risk_level = 'high' THEN ROUND((15 + RANDOM() * 25)::numeric, 1) ELSE ROUND((5 + RANDOM() * 15)::numeric, 1) END AS risk_reduction_points,
  '{}'::jsonb AS cost_breakdown,
  CONCAT(i.city, ' | ', UPPER(i.route_type), ' | ', i.economic_importance, ' importance | Budget auto-generated for #', rs.infrastructure_id) AS notes
FROM risk_scores rs JOIN infrastructures i ON i.id = rs.infrastructure_id;
