import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, ProgressBar, Button } from 'react-bootstrap';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../../context/AuthContext';
import ClientList from './ClientList';
import EmployeeList from './EmployeeList';
import ProjectList from './ProjectList';
import PaymentList from './PaymentList';
import MessageList from './MessageList';
import Reports from './Reports';
import { clientAPI, projectAPI, paymentAPI, employeeAPI, messageAPI } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    totalClients: 0,
    totalEmployees: 0,
    totalProjects: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    totalMessages: 0,
    unreadMessages: 0,
    recentProjects: [],
    upcomingExpiries: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching admin dashboard data...');
      
      const [clientsRes, employeesRes, projectsRes, paymentsRes, messagesRes] = await Promise.all([
        clientAPI.getAll({ limit: 100 }).catch(() => ({ data: { total: 0, clients: [] } })),
        employeeAPI.getAll({ limit: 100 }).catch(() => ({ data: { total: 0, employees: [] } })),
        projectAPI.getAll({ limit: 100 }).catch(() => ({ data: { total: 0, projects: [] } })),
        paymentAPI.getAll({ limit: 100 }).catch(() => ({ data: { total: 0, payments: [] } })),
        messageAPI.getStats().catch(() => ({ data: { stats: { total: 0, unread: 0 } } }))
      ]);

      const totalRevenue = paymentsRes.data.payments?.reduce((sum, payment) => sum + (payment.totalAmount || 0), 0) || 0;
      const pendingAmount = paymentsRes.data.payments?.reduce((sum, payment) => sum + (payment.dueAmount || 0), 0) || 0;

      setDashboardData({
        totalClients: clientsRes.data.total || clientsRes.data.clients?.length || 0,
        totalEmployees: employeesRes.data.total || employeesRes.data.employees?.length || 0,
        totalProjects: projectsRes.data.total || projectsRes.data.projects?.length || 0,
        totalRevenue,
        pendingPayments: pendingAmount,
        totalMessages: messagesRes.data.stats?.total || 0,
        unreadMessages: messagesRes.data.stats?.unread || 0,
        recentProjects: projectsRes.data.projects?.slice(0, 5) || [],
        upcomingExpiries: []
      });

      console.log('✅ Admin dashboard data fetched successfully');
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    console.log('🎯 Rendering admin content for tab:', activeTab);
    
    switch (activeTab) {
      case 'clients':
        return <ClientList />;
      case 'employees':
        return <EmployeeList />;
      case 'projects':
        return <ProjectList />;
      case 'payments':
        return <PaymentList />;
      case 'messages':
        return <MessageList />;
      case 'reports':
        return <Reports />;
      case 'dashboard':
      default:
        return renderDashboardOverview();
    }
  };

  const renderDashboardOverview = () => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-4" style={{ width: '4rem', height: '4rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="fw-bold text-primary">Loading dashboard...</h5>
            <p className="text-muted">Fetching your latest data</p>
          </div>
        </div>
      );
    }

    const chartData = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June'],
      datasets: [
        {
          label: 'Revenue (₹)',
          data: [65000, 59000, 80000, 81000, 56000, 95000],
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };

    const projectStatusData = {
      labels: ['In Progress', 'Completed', 'Delayed', 'Planning'],
      datasets: [
        {
          data: [45, 25, 15, 15],
          backgroundColor: [
            'rgba(102, 126, 234, 0.9)',
            'rgba(40, 167, 69, 0.9)',
            'rgba(255, 107, 107, 0.9)',
            'rgba(255, 193, 7, 0.9)',
          ],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        title: {
          display: true,
          text: 'Monthly Revenue Trends',
          font: {
            size: 16,
            weight: 'bold'
          },
          color: '#495057'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.1)'
          },
          ticks: {
            font: {
              size: 11
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            }
          }
        }
      }
    };

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 11,
              weight: '500'
            }
          }
        }
      }
    };

    return (
      <div className="dashboard-content">
        {/* Page Title */}
        <div className="page-header mb-4">
          <div className="d-flex align-items-center">
            <div className="icon-wrapper me-3" style={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
            }}>
              <i className="fas fa-tachometer-alt text-white fa-xl"></i>
            </div>
            <div>
              <h2 className="page-title mb-1 fw-bold">Dashboard Overview</h2>
              <p className="page-subtitle text-muted mb-0">Welcome back, manage your business efficiently</p>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <Row className="g-4 mb-5">
          <Col xxl={2} xl={4} lg={4} md={6} sm={6}>
            <Card className="stats-card border-0 shadow-sm h-100 position-relative overflow-hidden">
              <div className="stats-gradient" style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                opacity: 0.1,
                borderRadius: '0 0 0 100px'
              }}></div>
              <Card.Body className="text-center position-relative">
                <div className="stats-icon mx-auto mb-3" style={{
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  width: '70px',
                  height: '70px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                }}>
                  <i className="fas fa-users text-white fa-xl"></i>
                </div>
                <h2 className="stats-number fw-bold text-primary mb-2" style={{ fontSize: '2.5rem' }}>
                  {dashboardData.totalClients}
                </h2>
                <p className="stats-label text-muted mb-0 fw-semibold">Clients</p>
                <div className="stats-trend mt-2">
                  <small className="text-success">
                    <i className="fas fa-arrow-up me-1"></i>
                    Active
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xxl={2} xl={4} lg={4} md={6} sm={6}>
            <Card className="stats-card border-0 shadow-sm h-100 position-relative overflow-hidden">
              <div className="stats-gradient" style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
                opacity: 0.1,
                borderRadius: '0 0 0 100px'
              }}></div>
              <Card.Body className="text-center position-relative">
                <div className="stats-icon mx-auto mb-3" style={{
                  background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
                  width: '70px',
                  height: '70px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(86, 171, 47, 0.3)'
                }}>
                  <i className="fas fa-user-tie text-white fa-xl"></i>
                </div>
                <h2 className="stats-number fw-bold text-success mb-2" style={{ fontSize: '2.5rem' }}>
                  {dashboardData.totalEmployees}
                </h2>
                <p className="stats-label text-muted mb-0 fw-semibold">Employees</p>
                <div className="stats-trend mt-2">
                  <small className="text-info">
                    <i className="fas fa-users me-1"></i>
                    Team
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xxl={2} xl={4} lg={4} md={6} sm={6}>
            <Card className="stats-card border-0 shadow-sm h-100 position-relative overflow-hidden">
              <div className="stats-gradient" style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'linear-gradient(45deg, #f093fb, #f5576c)',
                opacity: 0.1,
                borderRadius: '0 0 0 100px'
              }}></div>
              <Card.Body className="text-center position-relative">
                <div className="stats-icon mx-auto mb-3" style={{
                  background: 'linear-gradient(45deg, #f093fb, #f5576c)',
                  width: '70px',
                  height: '70px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)'
                }}>
                  <i className="fas fa-project-diagram text-white fa-xl"></i>
                </div>
                <h2 className="stats-number fw-bold text-warning mb-2" style={{ fontSize: '2.5rem' }}>
                  {dashboardData.totalProjects}
                </h2>
                <p className="stats-label text-muted mb-0 fw-semibold">Projects</p>
                <div className="stats-trend mt-2">
                  <small className="text-primary">
                    <i className="fas fa-tasks me-1"></i>
                    Active
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xxl={2} xl={4} lg={4} md={6} sm={6}>
            <Card className="stats-card border-0 shadow-sm h-100 position-relative overflow-hidden">
              <div className="stats-gradient" style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                opacity: 0.1,
                borderRadius: '0 0 0 100px'
              }}></div>
              <Card.Body className="text-center position-relative">
                <div className="stats-icon mx-auto mb-3" style={{
                  background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                  width: '70px',
                  height: '70px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)'
                }}>
                  <i className="fas fa-rupee-sign text-white fa-xl"></i>
                </div>
                <h2 className="stats-number fw-bold text-danger mb-2" style={{ fontSize: '2.5rem' }}>
                  ₹{(dashboardData.totalRevenue / 1000).toFixed(0)}K
                </h2>
                <p className="stats-label text-muted mb-0 fw-semibold">Revenue</p>
                <div className="stats-trend mt-2">
                  <small className="text-success">
                    <i className="fas fa-chart-line me-1"></i>
                    Growth
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xxl={2} xl={4} lg={4} md={6} sm={6}>
            <Card className="stats-card border-0 shadow-sm h-100 position-relative overflow-hidden">
              <div className="stats-gradient" style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
                opacity: 0.1,
                borderRadius: '0 0 0 100px'
              }}></div>
              <Card.Body className="text-center position-relative">
                <div className="stats-icon mx-auto mb-3" style={{
                  background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
                  width: '70px',
                  height: '70px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(78, 205, 196, 0.3)'
                }}>
                  <i className="fas fa-envelope text-white fa-xl"></i>
                </div>
                <h2 className="stats-number fw-bold text-info mb-2" style={{ fontSize: '2.5rem' }}>
                  {dashboardData.totalMessages}
                </h2>
                <p className="stats-label text-muted mb-0 fw-semibold">Messages</p>
                <div className="stats-trend mt-2">
                  <small className="text-warning">
                    <i className="fas fa-comment me-1"></i>
                    Total
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xxl={2} xl={4} lg={4} md={6} sm={6}>
            <Card className="stats-card border-0 shadow-sm h-100 position-relative overflow-hidden">
              <div className="stats-gradient" style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'linear-gradient(45deg, #ff9a9e, #fecfef)',
                opacity: 0.1,
                borderRadius: '0 0 0 100px'
              }}></div>
              <Card.Body className="text-center position-relative">
                <div className="stats-icon mx-auto mb-3" style={{
                  background: 'linear-gradient(45deg, #ff9a9e, #fecfef)',
                  width: '70px',
                  height: '70px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)'
                }}>
                  <i className="fas fa-bell text-white fa-xl"></i>
                </div>
                <h2 className="stats-number fw-bold text-danger mb-2" style={{ fontSize: '2.5rem' }}>
                  {dashboardData.unreadMessages}
                </h2>
                <p className="stats-label text-muted mb-0 fw-semibold">Unread</p>
                <div className="stats-trend mt-2">
                  <small className="text-danger">
                    <i className="fas fa-exclamation me-1"></i>
                    Urgent
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Charts Section */}
        <Row className="g-4 mb-5">
          <Col xxl={8} xl={8} lg={7}>
            <Card className="chart-card border-0 shadow-sm h-100">
              <Card.Header className="bg-transparent border-0 pb-0">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className="chart-icon me-3" style={{
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      width: '50px',
                      height: '50px',
                      borderRadius: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-chart-bar text-white fa-lg"></i>
                    </div>
                    <div>
                      <h5 className="card-title mb-0 fw-bold">Revenue Analytics</h5>
                      <small className="text-muted">Monthly performance overview</small>
                    </div>
                  </div>
                  <Button variant="outline-primary" size="sm">
                    <i className="fas fa-expand me-1"></i>
                    Full View
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '350px' }}>
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xxl={4} xl={4} lg={5}>
            <Card className="chart-card border-0 shadow-sm h-100">
              <Card.Header className="bg-transparent border-0 pb-0">
                <div className="d-flex align-items-center">
                  <div className="chart-icon me-3" style={{
                    background: 'linear-gradient(45deg, #f093fb, #f5576c)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-chart-pie text-white fa-lg"></i>
                  </div>
                  <div>
                    <h5 className="card-title mb-0 fw-bold">Project Status</h5>
                    <small className="text-muted">Current distribution</small>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '350px' }}>
                  <Doughnut data={projectStatusData} options={doughnutOptions} />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Content Grid */}
        <Row className="g-4">
          {/* Recent Projects */}
          <Col xxl={8} xl={7} lg={12}>
            <Card className="content-card border-0 shadow-sm h-100">
              <Card.Header className="bg-transparent border-0 pb-0">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className="content-icon me-3" style={{
                      background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
                      width: '50px',
                      height: '50px',
                      borderRadius: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-clock text-white fa-lg"></i>
                    </div>
                    <div>
                      <h5 className="card-title mb-0 fw-bold">Recent Projects</h5>
                      <small className="text-muted">Latest project activities</small>
                    </div>
                  </div>
                  <Button variant="outline-primary" size="sm" onClick={() => setActiveTab('projects')}>
                    <i className="fas fa-eye me-1"></i>
                    View All
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {dashboardData.recentProjects.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="empty-state-icon mx-auto mb-4" style={{
                      width: '100px',
                      height: '100px',
                      background: 'linear-gradient(45deg, #f8f9fa, #e9ecef)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-project-diagram fa-2x text-muted"></i>
                    </div>
                    <h6 className="fw-semibold text-muted">No Recent Projects</h6>
                    <p className="text-muted small">Projects will appear here once created.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="border-0 fw-semibold">Project</th>
                          <th className="border-0 fw-semibold d-none d-md-table-cell">Client</th>
                          <th className="border-0 fw-semibold">Status</th>
                          <th className="border-0 fw-semibold d-none d-lg-table-cell">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recentProjects.map((project, index) => (
                          <tr key={project._id || index} className="project-row">
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="project-avatar me-3" style={{
                                  width: '45px',
                                  height: '45px',
                                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                                  borderRadius: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  color: 'white'
                                }}>
                                  {(project.projectName || 'P').charAt(0)}
                                </div>
                                <div>
                                  <div className="fw-semibold text-dark">{project.projectName || 'N/A'}</div>
                                  <small className="text-muted">{project.serviceType || 'N/A'}</small>
                                </div>
                              </div>
                            </td>
                            <td className="d-none d-md-table-cell">
                              <div className="fw-semibold">{project.client?.companyName || 'N/A'}</div>
                            </td>
                            <td>
                              <Badge 
                                bg={
                                  project.status === 'completed' ? 'success' :
                                  project.status === 'in-progress' ? 'primary' :
                                  project.status === 'delayed' ? 'danger' : 'warning'
                                }
                                className="px-3 py-2"
                              >
                                {project.status || 'planning'}
                              </Badge>
                            </td>
                            <td className="d-none d-lg-table-cell">
                              <div className="progress-container">
                                <ProgressBar 
                                  now={project.progress || 0} 
                                  variant="primary" 
                                  style={{ height: '8px', borderRadius: '4px' }}
                                  className="mb-1"
                                />
                                <small className="text-muted fw-semibold">{project.progress || 0}%</small>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          {/* Quick Stats */}
          <Col xxl={4} xl={5} lg={12}>
            <Card className="content-card border-0 shadow-sm h-100">
              <Card.Header className="bg-transparent border-0 pb-0">
                <div className="d-flex align-items-center">
                  <div className="content-icon me-3" style={{
                    background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-chart-line text-white fa-lg"></i>
                  </div>
                  <div>
                    <h5 className="card-title mb-0 fw-bold">Quick Insights</h5>
                    <small className="text-muted">Key business metrics</small>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="insights-list">
                  <div className="insight-item d-flex justify-content-between align-items-center p-3 mb-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="d-flex align-items-center">
                      <div className="insight-icon me-3" style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-exclamation-triangle text-white"></i>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-semibold">Pending Payments</h6>
                        <small className="text-muted">Outstanding amount</small>
                      </div>
                    </div>
                    <div className="text-danger fw-bold fs-5">
                      ₹{(dashboardData.pendingPayments / 1000).toFixed(0)}K
                    </div>
                  </div>
                  
                  <div className="insight-item d-flex justify-content-between align-items-center p-3 mb-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="d-flex align-items-center">
                      <div className="insight-icon me-3" style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(45deg, #667eea, #764ba2)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-tasks text-white"></i>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-semibold">Active Projects</h6>
                        <small className="text-muted">Currently running</small>
                      </div>
                    </div>
                    <div className="text-primary fw-bold fs-5">
                      {dashboardData.recentProjects.filter(p => p.status === 'in-progress').length}
                    </div>
                  </div>
                  
                  <div className="insight-item d-flex justify-content-between align-items-center p-3 mb-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="d-flex align-items-center">
                      <div className="insight-icon me-3" style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-check-circle text-white"></i>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-semibold">Completed Projects</h6>
                        <small className="text-muted">Successfully finished</small>
                      </div>
                    </div>
                    <div className="text-success fw-bold fs-5">
                      {dashboardData.recentProjects.filter(p => p.status === 'completed').length}
                    </div>
                  </div>
                  
                  <div className="insight-item d-flex justify-content-between align-items-center p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="d-flex align-items-center">
                      <div className="insight-icon me-3" style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-chart-line text-white"></i>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-semibold">Total Revenue</h6>
                        <small className="text-muted">All time earnings</small>
                      </div>
                    </div>
                    <div className="text-info fw-bold fs-5">
                      ₹{(dashboardData.totalRevenue / 100000).toFixed(1)}L
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="admin-dashboard min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Enhanced Header */}
      <div className="admin-header shadow-sm" style={{ backgroundColor: 'white' }}>
        <Container fluid className="py-4">
          <Row className="align-items-center">
            <Col lg={8} md={6}>
              <div className="d-flex align-items-center">
                <div className="admin-avatar me-4" style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'white',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                }}>
                  <i className="fas fa-user-shield"></i>
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-primary d-flex align-items-center">
                    {/* <i className="fas fa-tachometer-alt me-3"></i> */}
                    Admin Dashboard
                  </h2>
                  <div className="d-flex flex-wrap gap-3 text-muted small">
                    <span>
                      <i className="fas fa-user me-1"></i>
                      Welcome back, <strong>{user?.name}</strong>
                    </span>
                    <span>
                      <i className="fas fa-clock me-1"></i>
                      {new Date().toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={4} md={6} className="text-end">
              <Button 
                variant="outline-danger" 
                onClick={logout}
                className="rounded-pill px-4"
                style={{ borderWidth: '2px' }}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Enhanced Navigation */}
      <div className="admin-nav" style={{ backgroundColor: 'white', borderTop: '1px solid #e9ecef' }}>
        <Container fluid>
          <nav className="nav nav-pills justify-content-start py-3">
            {[
              { key: 'dashboard', icon: 'chart-line', label: 'Overview' },
              { key: 'clients', icon: 'users', label: 'Clients' },
              { key: 'employees', icon: 'user-tie', label: 'Employees' },
              { key: 'projects', icon: 'project-diagram', label: 'Projects' },
              { key: 'payments', icon: 'credit-card', label: 'Payments' },
              { key: 'messages', icon: 'envelope', label: 'Messages', badge: dashboardData.unreadMessages },
              { key: 'reports', icon: 'chart-bar', label: 'Reports' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`mx-1 px-4 py-2 rounded-pill d-flex align-items-center ${
                  activeTab === tab.key ? 'active' : ''
                }`}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  border: 'none',
                  background: activeTab === tab.key 
                    ? 'linear-gradient(45deg, #667eea, #764ba2)' 
                    : 'transparent',
                  color: activeTab === tab.key ? 'white' : '#6c757d',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                <i className={`fas fa-${tab.icon} me-2`}></i>
                <span className="d-none d-lg-inline">{tab.label}</span>
                {tab.badge > 0 && (
                  <Badge bg="danger" className="ms-2">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </Container>
      </div>

      {/* Main Content */}
      <Container fluid className="py-4">
        {renderContent()}
      </Container>

      {/* Custom Styles */}
      <style jsx>{`
        .stats-card {
          transition: all 0.3s ease;
          border-radius: 20px !important;
        }
        
        .stats-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
        }
        
        .chart-card,
        .content-card {
          transition: all 0.3s ease;
          border-radius: 20px !important;
        }
        
        .chart-card:hover,
        .content-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
        }
        
        .project-row:hover {
          background-color: rgba(102, 126, 234, 0.05) !important;
        }
        
        .nav-link:hover {
          background-color: rgba(102, 126, 234, 0.1) !important;
          color: #667eea !important;
        }
        
        .table th {
          background-color: #f8f9fa !important;
          font-weight: 600 !important;
          color: #495057 !important;
          border-bottom: 2px solid #dee2e6 !important;
        }
        
        .empty-state-icon {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @media (max-width: 768px) {
          .stats-card {
            margin-bottom: 1rem;
          }
          
          .admin-header {
            padding: 1rem 0 !important;
          }
          
          .admin-avatar {
            width: 50px !important;
            height: 50px !important;
            font-size: 20px !important;
          }
          
          .stats-icon {
            width: 60px !important;
            height: 60px !important;
          }
          
          .stats-number {
            font-size: 2rem !important;
          }
          
          .nav-link {
            padding: 0.5rem 1rem !important;
            margin: 0.25rem !important;
          }
          
          .page-header {
            margin-bottom: 2rem !important;
          }
          
          .page-title {
            font-size: 1.5rem !important;
          }
        }
        
        @media (max-width: 576px) {
          .stats-number {
            font-size: 1.8rem !important;
          }
          
          .insight-item {
            padding: 1rem !important;
          }
          
          .chart-icon,
          .content-icon {
            width: 40px !important;
            height: 40px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
