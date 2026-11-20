import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { StudentList } from './pages/students/StudentList';
import { StudentDetail } from './pages/students/StudentDetail';
import { StudentForm } from './pages/students/StudentForm';
import { ResidenceCategories } from './pages/residence/ResidenceCategories';
import { EventList } from './pages/events/EventList';
import { EventForm } from './pages/events/EventForm';
import { AttendanceRules } from './pages/attendance/AttendanceRules';
import { QRScanner } from './pages/attendance/QRScanner';
import { AttendanceList } from './pages/attendance/AttendanceList';
import { ViolationList } from './pages/violation/ViolationList';
import { PredictionPage } from './pages/prediction/PredictionPage';
import { WelfareList } from './pages/welfare/WelfareList';
import { FollowUpList } from './pages/followup/FollowUpList';
import { EmergencyContacts } from './pages/EmergencyContacts';
import { ReportPage } from './pages/reports/ReportPage';
import { UserManagement } from './pages/users/UserManagement';
import { Settings } from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Authenticated Layout */}
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

            {/* Students */}
            <Route path="students" element={<StudentList />} />
            <Route path="students/new" element={<StudentForm />} />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="students/:id/edit" element={<StudentForm />} />

            {/* Residence Categories */}
            <Route
              path="residence-categories"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ResidenceCategories />
                </ProtectedRoute>
              }
            />

            {/* Worship Events */}
            <Route path="events" element={<EventList />} />
            <Route path="events/new" element={<EventForm />} />

            {/* Attendance & QR */}
            <Route path="attendance/scan" element={<QRScanner />} />
            <Route path="attendance" element={<AttendanceList />} />
            <Route
              path="attendance-rules"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AttendanceRules />
                </ProtectedRoute>
              }
            />

            {/* Violations */}
            <Route path="violations" element={<ViolationList />} />

            {/* ML Predictions */}
            <Route
              path="predictions"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'VILLAGE_DEAN']}>
                  <PredictionPage />
                </ProtectedRoute>
              }
            />

            {/* Welfare & Assistance */}
            <Route path="welfare" element={<WelfareList />} />

            {/* Follow-up Management */}
            <Route
              path="follow-up"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'VILLAGE_DEAN']}>
                  <FollowUpList />
                </ProtectedRoute>
              }
            />

            {/* Emergency Contacts */}
            <Route
              path="emergency-contacts"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'VILLAGE_DEAN']}>
                  <EmergencyContacts />
                </ProtectedRoute>
              }
            />

            {/* Reports */}
            <Route path="reports" element={<ReportPage />} />

            {/* User Management */}
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            {/* Settings */}
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'VILLAGE_DEAN']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
