const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const infrastructureRoutes = require('./routes/infrastructures');
const riskRoutes = require('./routes/risk');
const predictionRoutes = require('./routes/predictions');
const budgetRoutes = require('./routes/budgets');
const authRoutes = require('./routes/auth');
const statsRoutes = require('./routes/stats');
const sensorRoutes = require('./routes/sensors');
const optimizerRoutes = require('./routes/optimizer');
const inspectionRoutes = require('./routes/inspections');
const modelVersionRoutes = require('./routes/modelVersions');
const notificationRoutes = require('./routes/notifications');


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/infrastructures', infrastructureRoutes);
app.use('/api/risk-scores', riskRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/optimize', optimizerRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/model-versions', modelVersionRoutes);
app.use('/api/data', modelVersionRoutes);  // /api/data/ingest
app.use('/api/notifications', notificationRoutes);


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'NIIS Backend v2.0 — National Infrastructure Intelligence System', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`✅  Smart City Backend running on http://localhost:${PORT}`);
});

module.exports = app;
