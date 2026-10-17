import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './layouts/RootLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

import { LandingPage } from './pages/LandingPage';
import { StudentLoginPage } from './pages/auth/StudentLoginPage';
import { StudentSignupPage } from './pages/auth/StudentSignupPage';
import { RecruiterLoginPage } from './pages/auth/RecruiterLoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
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
              path="student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student', 'admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboardPage />} />
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
