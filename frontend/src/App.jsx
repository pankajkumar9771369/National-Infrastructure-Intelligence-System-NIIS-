import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import RiskTicker from './components/RiskTicker';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InfrastructurePage from './pages/InfrastructurePage';
import InfrastructureDetail from './pages/InfrastructureDetail';
import HeatmapPage from './pages/HeatmapPage';
import BudgetPage from './pages/BudgetPage';
import AdminPage from './pages/AdminPage';
import BudgetOptimizerPage from './pages/BudgetOptimizerPage';
import RiskSimulatorPage from './pages/RiskSimulatorPage';

function ProtectedRoute({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <RiskTicker />
                <Topbar />
                <div className="page-container animate-in">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />

            <Route path="/dashboard" element={
                <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/infrastructures" element={
                <ProtectedRoute><AppLayout><InfrastructurePage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/infrastructures/:id" element={
                <ProtectedRoute><AppLayout><InfrastructureDetail /></AppLayout></ProtectedRoute>
            } />
            <Route path="/heatmap" element={
                <ProtectedRoute><AppLayout><HeatmapPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/budget" element={
                <ProtectedRoute><AppLayout><BudgetPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/admin" element={
                <ProtectedRoute><AppLayout><AdminPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/optimizer" element={
                <ProtectedRoute><AppLayout><BudgetOptimizerPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/simulator" element={
                <ProtectedRoute><AppLayout><RiskSimulatorPage /></AppLayout></ProtectedRoute>
            } />
        </Routes>
    );
}
