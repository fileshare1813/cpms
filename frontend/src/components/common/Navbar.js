import React from 'react';
import { Navbar, Nav, NavDropdown, Badge } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

const TopNavbar = ({ toggleSidebar, sidebarCollapsed }) => {
  const { user, logout } = useAuth();

  return (
    <Navbar bg="white" className="content-header justify-content-between">
      <div className="d-flex align-items-center">
        <button
          className="btn btn-link text-dark p-0 me-3"
          onClick={toggleSidebar}
        >
          <i className={`fas ${sidebarCollapsed ? 'fa-bars' : 'fa-times'} fa-lg`}></i>
        </button>
        <h4 className="mb-0 fw-bold text-dark">
          {user?.role === 'admin' ? 'Admin Dashboard' : 'Client Portal'}
        </h4>
      </div>

      <Nav className="d-flex align-items-center">
        <Nav.Link href="#" className="position-relative me-3">
          <i className="fas fa-bell fa-lg text-muted"></i>
          <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
            0
          </Badge>
        </Nav.Link>
        
        <NavDropdown
          title={
            <span className='text-success'>
              <i className="fas fa-user-circle fa-lg me-2 text-success"></i>
              {user?.name}
            </span>
          }
          id="user-dropdown"
        >
          <NavDropdown.Item href="#profile">
            <i className="fas fa-user me-2"></i>
            Profile
          </NavDropdown.Item>
          <NavDropdown.Item href="#settings">
            <i className="fas fa-cog me-2"></i>
            Settings
          </NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item onClick={logout}>
            <i className="fas fa-sign-out-alt me-2"></i>
            Logout
          </NavDropdown.Item>
        </NavDropdown>
      </Nav>
    </Navbar>
  );
};

export default TopNavbar;
