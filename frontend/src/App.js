import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import EmployeeDashboard from './components/employee/EmployeeDashboard';

// Components
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from './components/admin/Dashboard';
import ClientDashboard from './components/client/ClientDashboard';
import ClientList from './components/admin/ClientList';
import EmployeeList from './components/admin/EmployeeList';
import ProjectList from './components/admin/ProjectList';
import PaymentList from './components/admin/PaymentList';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  console.log('🚀 App component loaded');
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            {/* Employee Routes - NEW */}
            <Route path="/employee" element={
              <ProtectedRoute requiredRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/clients" element={
              <ProtectedRoute requiredRole="admin">
                <ClientList />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/employees" element={
              <ProtectedRoute requiredRole="admin">
                <EmployeeList />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/projects" element={
              <ProtectedRoute requiredRole="admin">
                <ProjectList />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/payments" element={
              <ProtectedRoute requiredRole="admin">
                <PaymentList />
              </ProtectedRoute>
            } />
            
            {/* Client Routes */}
            <Route path="/client" element={
              <ProtectedRoute requiredRole="client">
                <ClientDashboard />
              </ProtectedRoute>
            } />
            
            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
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

