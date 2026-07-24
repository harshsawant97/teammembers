import React from 'react'
import { Box } from '@mui/material'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sidebar } from './components/Sidebar'
import { FacultyDashboard } from './components/FacultyDashboard'
import { LandingPage } from './components/LandingPage'
import { StudentRegistration } from './components/StudentRegistration'
import { ClassHistory } from './components/ClassHistory'
import { MyClasses } from './components/MyClasses'
import { Settings } from './components/Settings'
import { StudentDashboard } from './components/StudentDashboard'
import { StudentSidebar } from './components/StudentSidebar'
import { StudentProfile } from './components/StudentProfile'
import { StudentClassHistory } from './components/StudentClassHistory'
import { ResetPassword } from './components/ResetPassword'
import { Queries } from './components/Queries'
import { StudentQueries } from './components/StudentQueries'
import { ManualAttendance } from './components/ManualAttendance'
import { AuthProvider, useAuth } from './context/AuthContext'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function AppContent() {
  const location = useLocation();
  const { user } = useAuth();
  
  // Dashboard routes mapped to Sidebar
  const isAdminDashboard = location.pathname.includes('/dashboard') || location.pathname.includes('/students') || location.pathname.includes('/history') || location.pathname.includes('/classes') || location.pathname.includes('/settings') || location.pathname.includes('/queries') || location.pathname.includes('/manual-attendance');
  
  // Student routes mapped to StudentSidebar
  const isStudentDashboard = location.pathname.includes('/student/');

  return (
    <Box sx={{ display: 'flex' }} className="w-full min-h-screen">
      {isAdminDashboard && user?.role !== 'STUDENT' && <Sidebar />}
      {isStudentDashboard && user?.role === 'STUDENT' && <StudentSidebar />}
      <Box component="main" sx={{ flexGrow: 1 }} className="overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={user ? <Navigate to={user.role === 'STUDENT' ? "/student/dashboard" : "/dashboard"} /> : <LandingPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Admin Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  {user?.role === 'STUDENT' ? <Navigate to="/student/dashboard" /> : <FacultyDashboard />}
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/students" 
              element={
                <ProtectedRoute>
                  <StudentRegistration />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <ProtectedRoute>
                  <ClassHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/classes" 
              element={
                <ProtectedRoute>
                  <MyClasses />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manual-attendance" 
              element={
                <ProtectedRoute>
                  <ManualAttendance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/queries" 
              element={
                <ProtectedRoute>
                  <Queries />
                </ProtectedRoute>
              } 
            />

            {/* Student Routes */}
            <Route 
              path="/student/dashboard" 
              element={
                <ProtectedRoute>
                  {user?.role === 'STUDENT' ? <StudentDashboard /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/classes" 
              element={
                <ProtectedRoute>
                  {user?.role === 'STUDENT' ? <StudentClassHistory /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/profile" 
              element={
                <ProtectedRoute>
                  {user?.role === 'STUDENT' ? <StudentProfile /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/queries" 
              element={
                <ProtectedRoute>
                  {user?.role === 'STUDENT' ? <StudentQueries /> : <Navigate to="/dashboard" />}
                </ProtectedRoute>
              } 
            />
          </Routes>
        </AnimatePresence>
      </Box>
    </Box>
  )
}

function App() {
  React.useEffect(() => {
    const applyTheme = () => {
      const isDark = localStorage.getItem('setting_darkMode') !== 'false';
      if (isDark) {
        document.body.classList.remove('light-mode');
      } else {
        document.body.classList.add('light-mode');
      }
    };
    
    applyTheme();
    // Listen for storage changes from Settings component
    window.addEventListener('storage', applyTheme);
    // Custom event for same-tab updates
    window.addEventListener('theme-changed', applyTheme);
    
    return () => {
      window.removeEventListener('storage', applyTheme);
      window.removeEventListener('theme-changed', applyTheme);
    };
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
