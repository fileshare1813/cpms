import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';

// Components
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/Dashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import ClientDashboard from './components/client/ClientDashboard';
import ClientList from './components/admin/ClientList';
import EmployeeList from './components/admin/EmployeeList';
import ProjectList from './components/admin/ProjectList';
import PaymentList from './components/admin/PaymentList';
import PageLoader from './components/common/PageLoader';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== requiredRole) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/clients" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ClientList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/employees" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <EmployeeList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/projects" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ProjectList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/payments" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <PaymentList />
                </ProtectedRoute>
              } 
            />

            {/* Employee Routes */}
            <Route 
              path="/employee" 
              element={
                <ProtectedRoute requiredRole="employee">
                  <EmployeeDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Client Routes */}
            <Route 
              path="/client" 
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Default Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 404 Handling - Redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
