import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout
import MainLayout from './components/layout/MainLayout';

// Auth Pages
import LoginPage from './Pages/auth/LoginPage';
import RegisterPage from './Pages/auth/RegisterPage';

// Organization Pages
import OrganizationDashboardPage from './Pages/Organization/DashboardPage';
import EvaluationsPage from './Pages/Organization/EvaluationsPage';
import NewEvaluationPage from './Pages/Organization/NewEvaluationPage';
import EvaluationFormPage from './Pages/Organization/EvaluationFormPage';
import ResultsPage from './Pages/Organization/ResultsPage';
import RecommendationsPage from './Pages/Organization/RecommendationsPage';
import OrganizationProfilePage from './Pages/Organization/OrganizationProfilePage';
import OrganizationSettingsPage from './Pages/Organization/SettingsPage';

// Evaluator Pages
import EvaluatorDashboardPage from './Pages/Evaluator/DashboardPage';
import QueuePage from './Pages/Evaluator/QueuePage';
import ReviewPage from './Pages/Evaluator/ReviewPage';
import EvaluatorSettingsPage from './Pages/Evaluator/SettingsPage';

// Admin Pages
import AdminDashboardPage from './Pages/Admin/DashboardPage';
import UsersPage from './Pages/Admin/UsersPage';
import AdminEvaluationsPage from './Pages/Admin/EvaluationsPage';
import GovernancePage from './Pages/Admin/GovernancePage';
import AdminSettingsPage from './Pages/Admin/SettingsPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>⏳</div>
      <div>Loading...</div>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Organization profile — standalone page, no sidebar */}
          <Route path="/organization/profile"
            element={
              <ProtectedRoute allowedRoles={["ORGANIZATION"]}>
                <OrganizationProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Organization routes with layout */}
          <Route path="/organization"
            element={
              <ProtectedRoute allowedRoles={["ORGANIZATION"]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<OrganizationDashboardPage />} />
            <Route path="evaluations" element={<EvaluationsPage />} />
            <Route path="evaluations/new" element={<NewEvaluationPage />} />
            <Route path="evaluations/edit/:id" element={<EvaluationFormPage />} />
            <Route path="evaluations/:id" element={<EvaluationFormPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="recommendations/:id" element={<RecommendationsPage />} />
            <Route path="settings" element={<OrganizationSettingsPage />} />
          </Route>

          {/* Evaluator */}
          <Route path="/evaluator"
            element={
              <ProtectedRoute allowedRoles={["EVALUATOR", "ADMIN"]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<EvaluatorDashboardPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="review/:id" element={<ReviewPage />} />
            <Route path="settings" element={<EvaluatorSettingsPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="evaluations" element={<AdminEvaluationsPage />} />
            <Route path="governance" element={<GovernancePage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;