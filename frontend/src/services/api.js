import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_URL });
const mlApi = axios.create({ baseURL: ML_URL });

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ─── Auth ─────────────────────────────────────────────────
export const login = (username, password) =>
    api.post('/api/auth/login', { username, password }).then(r => r.data);

export const register = (username, password, full_name) =>
    api.post('/api/auth/register', { username, password, full_name }).then(r => r.data);

// ─── Budget Optimizer ─────────────────────────────────────
export const runBudgetOptimizer = (payload) =>
    api.post('/api/optimize/budget', payload).then(r => r.data);

export const getOptimizationHistory = () =>
    api.get('/api/optimize/history').then(r => r.data);

// ─── Inspections ──────────────────────────────────────────
export const getInspections = () =>
    api.get('/api/inspections').then(r => r.data);

export const getInspectionHistory = (infraId) =>
    api.get(`/api/inspections/${infraId}`).then(r => r.data);

export const createInspection = (data) =>
    api.post('/api/inspections', data).then(r => r.data);


// ─── Infrastructure ───────────────────────────────────────
export const getInfrastructures = (params = {}) =>
    api.get('/api/infrastructures', { params }).then(r => r.data);

export const getInfrastructure = (id) =>
    api.get(`/api/infrastructures/${id}`).then(r => r.data);

export const createInfrastructure = (data) =>
    api.post('/api/infrastructures', data).then(r => r.data);

export const updateInfrastructure = (id, data) =>
    api.put(`/api/infrastructures/${id}`, data).then(r => r.data);

export const triggerPrediction = (id, model_type = 'random_forest') =>
    api.post(`/api/infrastructures/${id}/predict`, { model_type }).then(r => r.data);

export const deleteInfrastructure = (id) =>
    api.delete(`/api/infrastructures/${id}`).then(r => r.data);

// ─── Risk Scores ──────────────────────────────────────────
export const getRiskScores = () =>
    api.get('/api/risk-scores').then(r => r.data);

export const getHeatmapData = () =>
    api.get('/api/risk-scores/heatmap').then(r => r.data);

// ─── Predictions ──────────────────────────────────────────
export const getPredictions = () =>
    api.get('/api/predictions').then(r => r.data);

export const getPrediction = (infraId) =>
    api.get(`/api/predictions/${infraId}`).then(r => r.data);

// ─── Budget ───────────────────────────────────────────────
export const getBudgets = (params = {}) =>
    api.get('/api/budgets', { params }).then(r => r.data);

export const getBudgetSummary = () =>
    api.get('/api/budgets/summary').then(r => r.data);

// ─── Stats ────────────────────────────────────────────────
export const getDashboardStats = () =>
    api.get('/api/stats/summary').then(r => r.data);

// ─── Sensors ──────────────────────────────────────────────
export const getSensorReadings = (infraId) =>
    api.get(`/api/sensors/${infraId}`).then(r => r.data);

export const postSensorReading = (data) =>
    api.post('/api/sensors/simulate', data).then(r => r.data);

// ─── ML Direct ───────────────────────────────────────────
export const mlPredict = (data) =>
    mlApi.post('/predict', data).then(r => r.data);

export const mlHealth = () =>
    mlApi.get('/health').then(r => r.data);

// ─── Model Versions & Retraining ─────────────────────────
export const getModelVersions = () =>
    api.get('/api/model-versions').then(r => r.data);

export const getLatestModelVersion = () =>
    api.get('/api/model-versions/latest').then(r => r.data);

export const triggerRetrain = (payload = {}) =>
    api.post('/api/model-versions/retrain', payload).then(r => r.data);

export const getDriftReport = () =>
    api.post('/api/model-versions/drift', {}).then(r => r.data);

// ─── Real Data Ingestion ──────────────────────────────────
export const ingestNHAIData = (records, dry_run = false) =>
    api.post('/api/data/ingest', { records, dry_run }).then(r => r.data);

// ─── Notifications ─────────────────────────────────────────
export const getNotifications = () =>
    api.get('/api/notifications').then(r => r.data);

export const getAllNotifications = () =>
    api.get('/api/notifications/all').then(r => r.data);

export const createNotification = (data) =>
    api.post('/api/notifications', data).then(r => r.data);

export const dismissNotification = (id) =>
    api.patch(`/api/notifications/${id}/dismiss`).then(r => r.data);

export const deleteNotification = (id) =>
    api.delete(`/api/notifications/${id}`).then(r => r.data);
