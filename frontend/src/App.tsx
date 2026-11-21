import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PdfUploadPage } from './pages/pdf/PdfUploadPage';
import { StudentList } from './pages/students/StudentList';
import { StudentDetail } from './pages/students/StudentDetail';
import { StudentForm } from './pages/students/StudentForm';
import { PredictionPage } from './pages/prediction/PredictionPage';
import { FollowUpList } from './pages/followup/FollowUpList';
import { WelfareList } from './pages/welfare/WelfareList';
import { EmergencyContacts } from './pages/EmergencyContacts';
import { ReportPage } from './pages/reports/ReportPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pdf-reports" element={<PdfUploadPage />} />
            <Route path="students" element={<StudentList />} />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="students/:id/edit" element={<StudentForm />} />
            <Route path="predictions" element={<PredictionPage />} />
            <Route path="follow-up" element={<FollowUpList />} />
            <Route path="welfare" element={<WelfareList />} />
            <Route path="emergency-contacts" element={<EmergencyContacts />} />
            <Route path="reports-settings" element={<ReportPage />} />
            <Route path="reports" element={<Navigate to="/reports-settings" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
