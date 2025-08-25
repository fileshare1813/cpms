import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Container, Row, Col, Card, Form, Button, Nav, Alert } from 'react-bootstrap';

const Login = () => {
  const [activeTab, setActiveTab] = useState('admin');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Debug useEffect
  useEffect(() => {
    console.log('🚀 Login component loaded successfully!');
    console.log('📋 Initial active tab:', activeTab);
  }, []);

  useEffect(() => {
    console.log('🔄 Active tab changed to:', activeTab);
  }, [activeTab]);

  const handleChange = (e) => {
    console.log(`📝 Form field changed: ${e.target.name} = ${e.target.value}`);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔐 Login attempt:', { email: formData.email, role: activeTab });
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password, activeTab);
    
    if (result.success) {
      console.log('✅ Login successful, redirecting to:', activeTab);
      if (activeTab === 'admin') {
        navigate('/admin');
      } else if (activeTab === 'client') {
        navigate('/client');
      } else if (activeTab === 'employee') {
        navigate('/employee');
      }
    } else {
      console.log('❌ Login failed:', result.message);
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleTabChange = (tab) => {
    console.log('🔄 Tab changing from', activeTab, 'to', tab);
    setActiveTab(tab);
    setFormData({ email: '', password: '' });
    setError('');
  };

  return (
    <div className="login-container">
      <Container>
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            <Card className="login-card border-0">
              <Row className="g-0">
                {/* Left Side */}
                <Col md={6} className="login-left">
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="text-center mb-4">
                      <i className="fas fa-project-diagram fa-4x mb-3" style={{ opacity: 0.9 }}></i>
                      <h2 className="fw-bold">Welcome Back!</h2>
                      <p className="lead">Professional Client & Project Management System</p>
                    </div>
                    
                    <div className="mt-5">
                      <div className="d-flex align-items-center mb-3">
                        <i className="fas fa-users me-3"></i>
                        <div>
                          <h6 className="mb-0">Multi-User Access</h6>
                          <small>Admin, Employee & Client portals</small>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-center mb-3">
                        <i className="fas fa-tasks me-3"></i>
                        <div>
                          <h6 className="mb-0">Project Tracking</h6>
                          <small>Real-time progress monitoring</small>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-center">
                        <i className="fas fa-bell me-3"></i>
                        <div>
                          <h6 className="mb-0">Smart Notifications</h6>
                          <small>Never miss important updates</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
                
                {/* Right Side - Login Form */}
                <Col md={6}>
                  <div className="login-form">
                    <div className="text-center mb-4">
                      <h1 className="brand-logo">
                        <i className="fas fa-project-diagram me-2"></i>
                        CPMS
                      </h1><sup>V3.o</sup>
                      <p className="text-muted">Choose your role and sign in</p>
                    </div>

                    {error && (
                      <Alert variant="danger" className="mb-4">
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {error}
                      </Alert>
                    )}

                    {/* Debug Info */}
                    <div className="debug-info mb-3">
                      Active Tab = <span className="">{activeTab} ✅</span>
                    </div>

                    {/* CUSTOM TABS */}
                    <Nav className="custom-login-tabs">
                      <Nav.Item>
                        <Nav.Link
                          active={activeTab === 'admin'}
                          onClick={() => handleTabChange('admin')}
                          className={activeTab === 'admin' ? 'active' : ''}
                        >
                          <i className="fas fa-user-shield"></i>
                          Admin
                        </Nav.Link>
                      </Nav.Item>
                      
                      <Nav.Item>
                        <Nav.Link
                          active={activeTab === 'employee'}
                          onClick={() => handleTabChange('employee')}
                          className={activeTab === 'employee' ? 'active' : ''}
                        >
                          <i className="fas fa-user-tie"></i>
                          Employee
                        </Nav.Link>
                      </Nav.Item>
                      
                      <Nav.Item>
                        <Nav.Link
                          active={activeTab === 'client'}
                          onClick={() => handleTabChange('client')}
                          className={activeTab === 'client' ? 'active' : ''}
                        >
                          <i className="fas fa-user"></i>
                          Client
                        </Nav.Link>
                      </Nav.Item>
                    </Nav>

                    {/* TAB CONTENT */}
                    <div className="tab-content-area">
                      {/* ADMIN LOGIN */}
                      {activeTab === 'admin' && (
                        <div>
                          <div className="tab-header">
                            <h4 className="text-primary">
                              <i className="fas fa-user-shield"></i>
                              Administrator Login
                            </h4>
                          </div>
                          
                          <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <i className="fas fa-envelope me-2 text-muted"></i>
                                Admin Email Address
                              </Form.Label>
                              <Form.Control
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="admin@company.com"
                              />
                            </Form.Group>

                            <Form.Group className="mb-4">
                              <Form.Label>
                                <i className="fas fa-lock me-2 text-muted"></i>
                                Password
                              </Form.Label>
                              <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter admin password"
                              />
                            </Form.Group>

                            <Button
                              type="submit"
                              className="btn-login btn-admin"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2 btn-loading"></span>
                                  Signing In...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-sign-in-alt me-2"></i>
                                  Sign In as Admin
                                </>
                              )}
                            </Button>
                          </Form>
                          
                          <div className="help-text success">
                            <i className="fas fa-info-circle me-1"></i>
                            <strong>Default:</strong> admin@company.com / admin123
                          </div>
                        </div>
                      )}

                      {/* EMPLOYEE LOGIN */}
                      {activeTab === 'employee' && (
                        <div>
                          <div className="tab-header">
                            <h4 className="text-success">
                              <i className="fas fa-user-tie"></i>
                              Employee Login
                            </h4>
                          </div>
                          
                          <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <i className="fas fa-envelope me-2 text-muted"></i>
                                Employee Email Address
                              </Form.Label>
                              <Form.Control
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="employee@company.com"
                              />
                            </Form.Group>

                            <Form.Group className="mb-4">
                              <Form.Label>
                                <i className="fas fa-lock me-2 text-muted"></i>
                                Password
                              </Form.Label>
                              <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter employee password"
                              />
                            </Form.Group>

                            <Button
                              type="submit"
                              className="btn-login btn-employee"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2 btn-loading"></span>
                                  Signing In...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-sign-in-alt me-2"></i>
                                  Sign In as Employee
                                </>
                              )}
                            </Button>
                          </Form>
                          
                          <div className="help-text warning">
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            Contact admin to create employee account
                          </div>
                        </div>
                      )}

                      {/* CLIENT LOGIN */}
                      {activeTab === 'client' && (
                        <div>
                          <div className="tab-header">
                            <h4 className="text-danger">
                              <i className="fas fa-user"></i>
                              Client Login
                            </h4>
                          </div>
                          
                          <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <i className="fas fa-envelope me-2 text-muted"></i>
                                Client Email Address
                              </Form.Label>
                              <Form.Control
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="client@company.com"
                              />
                            </Form.Group>

                            <Form.Group className="mb-4">
                              <Form.Label>
                                <i className="fas fa-lock me-2 text-muted"></i>
                                Password
                              </Form.Label>
                              <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter client password"
                              />
                            </Form.Group>

                            <Button
                              type="submit"
                              className="btn-login btn-client"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2 btn-loading"></span>
                                  Signing In...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-sign-in-alt me-2"></i>
                                  Sign In as Client
                                </>
                              )}
                            </Button>
                          </Form>
                          
                          <div className="help-text info">
                            <i className="fas fa-info-circle me-1"></i>
                            Contact admin to create client account
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-center mt-4">
                      <small className="text-muted">
                        © 2025 CPMS. All rights reserved.
                      </small>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;