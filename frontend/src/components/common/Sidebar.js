import React from 'react';
import { Nav } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ collapsed, activeTab, setActiveTab }) => {
  const { user } = useAuth();

  const adminMenuItems = [
    { key: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { key: 'clients', icon: 'fas fa-users', label: 'Clients' },
    { key: 'employees', icon: 'fas fa-user-tie', label: 'Employees' },
    { key: 'projects', icon: 'fas fa-project-diagram', label: 'Projects' },
    { key: 'payments', icon: 'fas fa-credit-card', label: 'Payments' },
    { key: 'messages', icon: 'fas fa-envelope', label: 'Messages' },
    { key: 'reports', icon: 'fas fa-chart-bar', label: 'Reports' },
  ];

  const clientMenuItems = [
    { key: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { key: 'projects', icon: 'fas fa-project-diagram', label: 'My Projects' },
    { key: 'payments', icon: 'fas fa-receipt', label: 'Payments' },
    { key: 'messages', icon: 'fas fa-envelope', label: 'Messages' },
    { key: 'support', icon: 'fas fa-headset', label: 'Support' },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : clientMenuItems;

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="d-flex align-items-center">
          <i className="fas fa-project-diagram fa-2x text-white me-3"></i>
          {!collapsed && (
            <div>
              <h5 className="mb-0 text-white fw-bold">CPMS</h5>
              <small className="text-light opacity-75">Management System</small>
            </div>
          )}
        </div>
      </div>

      <Nav className="sidebar-nav flex-column">
        {menuItems.map((item) => (
          <Nav.Item key={item.key} className="nav-item">
            <Nav.Link
              className={`nav-link ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <i className={`${item.icon} ${collapsed ? 'fa-lg' : ''}`}></i>
              {!collapsed && <span className="ms-3">{item.label}</span>}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {!collapsed && (
        <div className="sidebar-footer mt-auto p-3">
          <div className="text-center">
            <img
              src={`https://ui-avatars.com/api/?name=${user?.name}&background=667eea&color=fff&rounded=true`}
              alt={user?.name}
              className="rounded-circle mb-2"
              width="50"
              height="50"
            />
            <div className="text-white">
              <div className="fw-semibold">{user?.name}</div>
              <small className="text-light opacity-75">
                {user?.role === 'admin' ? 'Administrator' : 'Client'}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
