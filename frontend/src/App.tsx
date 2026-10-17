import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './layouts/RootLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { StudentPortalLayout } from './layouts/StudentPortalLayout';

import { LandingPage } from './pages/LandingPage';
import { StudentLoginPage } from './pages/auth/StudentLoginPage';
import { StudentSignupPage } from './pages/auth/StudentSignupPage';
import { RecruiterLoginPage } from './pages/auth/RecruiterLoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { JobDiscoveryPage } from './pages/student/JobDiscoveryPage';
import { JobDetailPage } from './pages/student/JobDetailPage';
import { StudentApplicationsPage } from './pages/student/StudentApplicationsPage';
import { StudentApplicationDetailPage } from './pages/student/StudentApplicationDetailPage';
import { StudentInterviewsPage } from './pages/student/StudentInterviewsPage';
import { StudentNotificationsPage } from './pages/student/StudentNotificationsPage';
import { RecruiterDashboardPage } from './pages/recruiter/RecruiterDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            {/* Public Routes */}
            <Route index element={<LandingPage />} />
            <Route path="student/login" element={<StudentLoginPage />} />
            <Route path="student/signup" element={<StudentSignupPage />} />
            <Route path="recruiter/login" element={<RecruiterLoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Student Route Group */}
            <Route
              path="student"
              element={
                <ProtectedRoute allowedRoles={['student', 'admin']}>
                  <StudentPortalLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<StudentDashboardPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
              <Route path="jobs" element={<JobDiscoveryPage />} />
              <Route path="jobs/:id" element={<JobDetailPage />} />
              <Route path="applications" element={<StudentApplicationsPage />} />
              <Route path="applications/:id" element={<StudentApplicationDetailPage />} />
              <Route path="interviews" element={<StudentInterviewsPage />} />
              <Route path="notifications" element={<StudentNotificationsPage />} />
            </Route>

            {/* Protected Recruiter Route Group */}
            <Route
              path="recruiter/dashboard"
              element={
                <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RecruiterDashboardPage />} />
            </Route>

            {/* 404 Route */}
            <Route path="404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
