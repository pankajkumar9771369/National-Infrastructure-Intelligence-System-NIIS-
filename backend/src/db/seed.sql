-- Smart City Infrastructure Risk Dashboard - Seed Data
-- Bangalore City Infrastructure Records

-- Default users
-- Passwords: admin=admin123, viewer=viewer123
-- Hashes generated with: bcrypt.hash('password', 10)
INSERT INTO users (username, password_hash, role, full_name) VALUES
('admin', '$2a$10$EDtypfLN4mLtaSPnJeMDIANBBTp3C4SBnm8DYpdJ2dBT6y8qlFHOy', 'admin', 'City Infrastructure Admin'),
('viewer', '$2a$10$EDtypfLN4mLtaSPnJeMDIANBBTp3C4SBnm8DYpdJ2dBT6y8qlFHOy', 'viewer', 'Infrastructure Viewer');

-- Bridges and Roads across Bangalore (lat: ~12.97, lng: ~77.59)
INSERT INTO infrastructures (name, type, area, latitude, longitude, age_years, construction_year, material, traffic_load, env_exposure, structural_condition, length_meters, width_meters, daily_traffic_count, description, last_inspection_date) VALUES
('Hebbal Flyover', 'flyover', 'Hebbal', 12.9855, 77.5966, 18, 2006, 'concrete', 'heavy', 'high', 6.2, 1200, 14, 2250000, 'Major flyover at Hebbal junction connecting NH-44', '2024-08-15'),
('Silk Board Bridge', 'bridge', 'Silk Board', 12.9176, 77.6216, 22, 2002, 'concrete', 'extreme', 'high', 5.1, 450, 18, 320000, 'Heavily congested bridge at Silk Board junction', '2024-07-20'),
('Mekhri Circle Overpass', 'overpass', 'Mekhri', 12.9938, 77.5857, 12, 2012, 'composite', 'heavy', 'medium', 7.4, 680, 16, 180000, 'Modern composite overpass at Mekhri Circle', '2024-09-01'),
('KR Puram Bridge', 'bridge', 'KR Puram', 12.9975, 77.6985, 45, 1979, 'masonry', 'medium', 'high', 3.8, 320, 10, 85000, 'Old masonry bridge over Bellandur Lake outlet', '2024-06-10'),
('Marathahalli Bridge', 'bridge', 'Marathahalli', 12.9591, 77.6974, 28, 1996, 'steel', 'heavy', 'medium', 5.8, 520, 20, 210000, 'Steel bridge over Varthur Kodi', '2024-08-30'),
('Electronic City Flyover', 'flyover', 'Electronic City', 12.8452, 77.6602, 9, 2015, 'concrete', 'heavy', 'low', 8.1, 1800, 22, 195000, 'Elevated expressway connecting Electronic City', '2024-09-15'),
('Sarjapur Road Stretch', 'road', 'Sarjapur', 12.9107, 77.6854, 15, 2009, 'asphalt', 'extreme', 'medium', 4.9, 12000, 30, 450000, '12km stretch of Sarjapur road with heavy IT traffic', '2024-07-05'),
('Whitefield Main Road', 'road', 'Whitefield', 12.9698, 77.7499, 20, 2004, 'asphalt', 'heavy', 'medium', 5.5, 8000, 28, 380000, 'Primary road through Whitefield IT corridor', '2024-08-01'),
('Yelahanka Overpass', 'overpass', 'Yelahanka', 13.1002, 77.5962, 7, 2017, 'concrete', 'medium', 'low', 8.8, 420, 14, 95000, 'New overpass at Yelahanka junction', '2024-09-20'),
('Hosur Road Bridge', 'bridge', 'Hosur Road', 12.8945, 77.6412, 35, 1989, 'concrete', 'heavy', 'high', 4.5, 280, 12, 165000, 'Aging concrete bridge on Hosur Road', '2024-05-22'),
('Bannerghatta Road Stretch', 'road', 'Bannerghatta', 12.8704, 77.5956, 25, 1999, 'asphalt', 'heavy', 'medium', 5.2, 15000, 32, 320000, 'Major arterial road to Bannerghatta National Park', '2024-07-18'),
('Chellaghatta Bridge', 'bridge', 'Chellaghatta', 12.8628, 77.6208, 55, 1969, 'masonry', 'light', 'severe', 2.9, 180, 8, 42000, 'Very old masonry bridge, structurally at risk', '2024-04-10'),
('Kempegowda Flyover', 'flyover', 'Shivajinagar', 12.9837, 77.5952, 14, 2010, 'concrete', 'heavy', 'medium', 6.8, 950, 18, 225000, 'Double-decker flyover near Shivajinagar', '2024-08-25'),
('Indiranagar 100ft Road', 'road', 'Indiranagar', 12.9783, 77.6408, 32, 1992, 'asphalt', 'medium', 'medium', 5.9, 5000, 24, 185000, 'Iconic 100-feet road in Indiranagar', '2024-07-30'),
('HSR Layout Overpass', 'overpass', 'HSR Layout', 12.9081, 77.6476, 10, 2014, 'composite', 'heavy', 'medium', 7.6, 560, 16, 142000, 'Composite overpass serving HSR Layout', '2024-09-05'),
('Tumkur Road Flyover', 'flyover', 'Tumkur Road', 13.0123, 77.5396, 16, 2008, 'concrete', 'extreme', 'high', 5.7, 1400, 20, 310000, 'High-traffic flyover on NH-4 Tumkur highway', '2024-08-10'),
('Mysore Road Bridge', 'bridge', 'Mysore Road', 12.9523, 77.5142, 40, 1984, 'concrete', 'heavy', 'high', 4.1, 380, 14, 195000, 'Aging bridge on busy Mysore Road', '2024-06-15'),
('JP Nagar 11th Phase Road', 'road', 'JP Nagar', 12.8978, 77.5855, 18, 2006, 'asphalt', 'medium', 'low', 6.4, 7000, 26, 120000, 'Residential stretch in JP Nagar', '2024-08-20'),
('Bellandur Road Stretch', 'road', 'Bellandur', 12.9258, 77.6762, 12, 2012, 'asphalt', 'heavy', 'medium', 6.9, 9000, 28, 265000, 'Key road connecting Bellandur to Marathahalli', '2024-09-10'),
('Jalahalli Overpass', 'overpass', 'Jalahalli', 13.0348, 77.5551, 8, 2016, 'concrete', 'medium', 'low', 8.3, 490, 14, 88000, 'Modern overpass at Jalahalli cross', '2024-09-18'),
('Old Airport Road Bridge', 'bridge', 'Old Airport Road', 12.9716, 77.6412, 38, 1986, 'steel', 'heavy', 'high', 4.3, 350, 16, 178000, 'Aging steel bridge on Old Airport Road', '2024-05-30'),
('Hennur Road Stretch', 'road', 'Hennur', 13.0312, 77.6284, 10, 2014, 'asphalt', 'medium', 'low', 7.5, 6500, 22, 98000, 'Developing corridor in North Bangalore', '2024-09-08'),
('Varthur Lake Bridge', 'bridge', 'Varthur', 12.9369, 77.7237, 62, 1962, 'masonry', 'light', 'severe', 2.1, 145, 7, 28000, 'Critically aged masonry bridge over Varthur Lake', '2024-03-15'),
('Nagawara Flyover', 'flyover', 'Nagawara', 13.0358, 77.6275, 6, 2018, 'concrete', 'medium', 'low', 9.0, 780, 16, 105000, 'Recently built flyover at Nagawara junction', '2024-10-01'),
('Domlur Flyover', 'flyover', 'Domlur', 12.9598, 77.6455, 24, 2000, 'steel', 'heavy', 'high', 5.4, 860, 18, 198000, 'Steel flyover at Domlur, showing corrosion signs', '2024-07-12'),
('Kanakapura Road Stretch', 'road', 'Kanakapura', 12.8531, 77.5694, 22, 2002, 'asphalt', 'medium', 'medium', 5.6, 18000, 30, 145000, 'Long arterial road towards Kanakapura town', '2024-07-25'),
('Rajajinagar Overpass', 'overpass', 'Rajajinagar', 12.9944, 77.5448, 19, 2005, 'concrete', 'heavy', 'medium', 6.1, 620, 16, 175000, 'Busy overpass in west Bangalore', '2024-08-05'),
('Koramangala 80ft Road', 'road', 'Koramangala', 12.9352, 77.6245, 28, 1996, 'asphalt', 'heavy', 'medium', 5.3, 4500, 26, 285000, 'Busy road in one of Bangalores most active areas', '2024-07-22'),
('Ullal Bridge', 'bridge', 'Ullal', 12.9054, 77.5149, 50, 1974, 'masonry', 'light', 'high', 3.4, 210, 9, 35000, 'Old masonry bridge showing significant deterioration', '2024-05-05'),
('Tumkur Road Stretch', 'road', 'Tumkur Road', 13.0258, 77.5314, 14, 2010, 'asphalt', 'extreme', 'medium', 5.8, 22000, 34, 520000, 'Industrial corridor with extreme vehicle loads', '2024-08-28'),
('Yelahanka Satellite Town Bridge', 'bridge', 'Yelahanka', 13.0947, 77.6002, 30, 1994, 'concrete', 'medium', 'medium', 5.5, 290, 11, 72000, 'Aging concrete bridge in Yelahanka', '2024-06-28'),
('Sarjapura Overpass', 'overpass', 'Sarjapur', 12.9001, 77.7123, 4, 2020, 'composite', 'heavy', 'low', 9.2, 430, 15, 118000, 'Brand new composite overpass on Sarjapura Road', '2024-10-10'),
('Mysore Road Stretch', 'road', 'Mysore Road', 12.9312, 77.5031, 30, 1994, 'asphalt', 'heavy', 'high', 4.8, 25000, 32, 435000, 'Major highway to Mysore, high wear', '2024-07-08'),
('Richmond Road Bridge', 'bridge', 'Richmond Town', 12.9620, 77.6002, 65, 1959, 'masonry', 'medium', 'medium', 3.0, 190, 9, 55000, 'Heritage masonry bridge in central Bangalore', '2024-04-20'),
('Banashankari Flyover', 'flyover', 'Banashankari', 12.9254, 77.5618, 11, 2013, 'concrete', 'heavy', 'medium', 7.2, 920, 18, 205000, 'Concrete flyover serving south Bangalore suburb', '2024-09-02'),
('Outer Ring Road Bridge', 'bridge', 'ORR Hebbal', 13.0012, 77.6275, 17, 2007, 'steel', 'extreme', 'high', 5.9, 480, 22, 395000, 'Steel bridge on heavily trafficked ORR', '2024-08-18'),
('Devanahalli Road Stretch', 'road', 'Devanahalli', 13.2486, 77.7145, 8, 2016, 'concrete', 'heavy', 'low', 7.8, 35000, 36, 280000, 'Airport access road, better condition', '2024-09-22'),
('Kengeri Overpass', 'overpass', 'Kengeri', 12.9144, 77.4838, 13, 2011, 'concrete', 'medium', 'medium', 6.7, 510, 14, 92000, 'Overpass at Kengeri bus terminal area', '2024-08-22'),
('Bellandur Bridge', 'bridge', 'Bellandur', 12.9288, 77.6847, 42, 1982, 'concrete', 'heavy', 'severe', 3.6, 260, 12, 128000, 'Lake-adjacent bridge with severe environmental exposure', '2024-05-18'),
('Peenya Industrial Road', 'road', 'Peenya', 13.0287, 77.5202, 35, 1989, 'asphalt', 'extreme', 'high', 3.9, 14000, 28, 385000, 'Heavy industrial vehicle corridor in Peenya', '2024-06-02'),
('Nagarbhavi Overpass', 'overpass', 'Nagarbhavi', 12.9552, 77.5245, 9, 2015, 'composite', 'medium', 'low', 8.0, 470, 15, 102000, 'Composite overpass in west Bangalore', '2024-09-12'),
('CV Raman Nagar Bridge', 'bridge', 'CV Raman Nagar', 12.9865, 77.6632, 25, 1999, 'steel', 'medium', 'medium', 6.3, 310, 13, 88000, 'Steel bridge in east Bangalore', '2024-08-08'),
('Namma Metro Bridge', 'bridge', 'Cubbon Park', 12.9783, 77.5947, 14, 2010, 'concrete', 'medium', 'low', 8.5, 520, 10, 45000, 'Metro viaduct section in central Bangalore', '2024-09-25'),
('Krishnarajapuram Bridge', 'bridge', 'KR Puram', 13.0058, 77.6932, 48, 1976, 'masonry', 'medium', 'high', 3.2, 240, 10, 68000, 'Old bridge over Dakshina Pinakini river', '2024-04-30'),
('HAL Bridge', 'bridge', 'HAL', 12.9623, 77.6546, 55, 1969, 'masonry', 'heavy', 'high', 2.8, 195, 9, 102000, 'Oldest listed bridge near HAL airport area', '2024-03-28'),
('Bannerghatta Road Flyover', 'flyover', 'Bannerghatta', 12.8812, 77.5977, 7, 2017, 'concrete', 'heavy', 'medium', 8.4, 1050, 20, 215000, 'Recent flyover easing Bannerghatta corridor', '2024-09-28'),
('Attibele Road Stretch', 'road', 'Attibele', 12.7784, 77.7559, 12, 2012, 'asphalt', 'heavy', 'medium', 6.2, 28000, 30, 198000, 'Approaching Karnataka-TN border, industrial traffic', '2024-08-12'),
('Lalbagh Road Stretch', 'road', 'Lalbagh', 12.9484, 77.5858, 40, 1984, 'asphalt', 'medium', 'medium', 4.7, 3500, 22, 115000, 'Historic road around Lalbagh Botanical Gardens', '2024-06-20'),
('Bagmane Tech Park Bridge', 'bridge', 'CV Raman Nagar', 12.9742, 77.6691, 15, 2009, 'steel', 'heavy', 'medium', 6.9, 380, 15, 156000, 'Bridge serving major tech park access route', '2024-08-26'),
('Hebbal Lake Road', 'road', 'Hebbal', 13.0421, 77.5894, 22, 2002, 'asphalt', 'medium', 'medium', 5.7, 5500, 20, 135000, 'Lake-side road in North Bangalore', '2024-07-15');

-- Now calculate and insert risk scores for each infrastructure
-- Risk formula: Risk = (0.35*AgeFactor + 0.25*LoadFactor + 0.20*MaterialFactor + 0.20*EnvFactor) * 100
-- We use a function-like INSERT approach via a CTE

WITH infra_factors AS (
  SELECT
    id,
    LEAST(age_years::decimal / 80.0, 1.0) AS age_factor,
    CASE traffic_load
      WHEN 'light' THEN 0.2
      WHEN 'medium' THEN 0.5
      WHEN 'heavy' THEN 0.8
      WHEN 'extreme' THEN 1.0
    END AS load_factor,
    CASE material
      WHEN 'steel' THEN 0.3
      WHEN 'composite' THEN 0.5
      WHEN 'concrete' THEN 0.7
      WHEN 'asphalt' THEN 0.65
      WHEN 'masonry' THEN 0.9
    END AS material_factor,
    CASE env_exposure
      WHEN 'low' THEN 0.1
      WHEN 'medium' THEN 0.3
      WHEN 'high' THEN 0.6
      WHEN 'severe' THEN 1.0
    END AS env_factor
  FROM infrastructures
),
risk_calcs AS (
  SELECT
    id AS infrastructure_id,
    age_factor,
    load_factor,
    material_factor,
    env_factor,
    LEAST(ROUND(CAST((0.35 * age_factor + 0.25 * load_factor + 0.20 * material_factor + 0.20 * env_factor) * 100 AS numeric), 2), 100.0) AS risk_score
  FROM infra_factors
)
INSERT INTO risk_scores (infrastructure_id, risk_score, health_score, risk_level, age_factor, load_factor, material_factor, env_factor)
SELECT
  infrastructure_id,
  risk_score,
  ROUND(100.0 - risk_score, 2) AS health_score,
  CASE
    WHEN risk_score >= 75 THEN 'critical'
    WHEN risk_score >= 55 THEN 'high'
    WHEN risk_score >= 35 THEN 'moderate'
    ELSE 'low'
  END AS risk_level,
  age_factor,
  load_factor,
  material_factor,
  env_factor
FROM risk_calcs;

-- Insert budget plans based on risk levels
INSERT INTO budget_plans (infrastructure_id, maintenance_type, estimated_cost_usd, priority, planned_year, cost_breakdown, notes)
SELECT
  rs.infrastructure_id,
  CASE
    WHEN rs.risk_level = 'critical' THEN 'replacement'
    WHEN rs.risk_level = 'high' THEN 'major_repair'
    WHEN rs.risk_level = 'moderate' THEN 'preventive'
    ELSE 'routine'
  END AS maintenance_type,
  CASE
    WHEN rs.risk_level = 'critical' THEN ROUND((1500000 + RANDOM() * 4000000)::numeric, 2)
    WHEN rs.risk_level = 'high' THEN ROUND((400000 + RANDOM() * 1000000)::numeric, 2)
    WHEN rs.risk_level = 'moderate' THEN ROUND((80000 + RANDOM() * 300000)::numeric, 2)
    ELSE ROUND((15000 + RANDOM() * 50000)::numeric, 2)
  END AS estimated_cost_usd,
  CASE
    WHEN rs.risk_level = 'critical' THEN 'urgent'
    WHEN rs.risk_level = 'high' THEN 'high'
    WHEN rs.risk_level = 'moderate' THEN 'medium'
    ELSE 'low'
  END AS priority,
  CASE
    WHEN rs.risk_level = 'critical' THEN 2025
    WHEN rs.risk_level = 'high' THEN 2026
    WHEN rs.risk_level = 'moderate' THEN 2027
    ELSE 2028
  END AS planned_year,
  '{}'::jsonb AS cost_breakdown,
  CONCAT('Budget plan auto-generated based on risk assessment for structure #', rs.infrastructure_id) AS notes
FROM risk_scores rs;
