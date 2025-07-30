import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Button, Alert } from 'react-bootstrap';
import { clientAPI, employeeAPI, projectAPI, paymentAPI, messageAPI } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    clients: [],
    employees: [],
    projects: [],
    payments: [],
    messages: []
  });
  const [stats, setStats] = useState({
    totalClients: 0,
    totalEmployees: 0,
    totalProjects: 0,
    totalPayments: 0,
    totalMessages: 0,
    unreadMessages: 0
  });
  const [dateRange, setDateRange] = useState({
    startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD')
  });

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      console.log('🔄 Generating comprehensive report...');

      const [
        clientsResponse,
        employeesResponse,
        projectsResponse,
        paymentsResponse,
        messagesResponse
      ] = await Promise.all([
        clientAPI.getAll({ limit: 100 }),
        employeeAPI.getAll({ limit: 100 }),
        projectAPI.getAll({ limit: 100 }),
        paymentAPI.getAll({ limit: 100 }),
        messageAPI.getAll({ limit: 100 })
      ]);

      const clients = clientsResponse.data.clients || [];
      const employees = employeesResponse.data.employees || [];
      const projects = projectsResponse.data.projects || [];
      const payments = paymentsResponse.data.payments || [];
      const messages = messagesResponse.data.messages || [];

      setReportData({
        clients,
        employees,
        projects,
        payments,
        messages
      });

      setStats({
        totalClients: clients.length,
        totalEmployees: employees.length,
        totalProjects: projects.length,
        totalPayments: payments.length,
        totalMessages: messages.length,
        unreadMessages: messages.filter(m => m.status === 'unread').length
      });

      console.log('✅ Report generated successfully');
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const reportContent = `
      CLIENT & PROJECT MANAGEMENT SYSTEM - REPORT
      Generated on: ${moment().format('DD MMM YYYY, HH:mm')}
      
      SUMMARY STATISTICS:
      - Total Clients: ${stats.totalClients}
      - Total Employees: ${stats.totalEmployees}
      - Total Projects: ${stats.totalProjects}
      - Total Payments: ${stats.totalPayments}
      - Total Messages: ${stats.totalMessages}
      - Unread Messages: ${stats.unreadMessages}
      
      CLIENT DETAILS:
      ${reportData.clients.map(client => 
        `- ${client.companyName} (${client.clientId}) - ${client.status}`
      ).join('\n')}
      
      EMPLOYEE DETAILS:
      ${reportData.employees.map(employee => 
        `- ${employee.name} (${employee.employeeId}) - ${employee.department} - ${employee.status}`
      ).join('\n')}
      
      PROJECT DETAILS:
      ${reportData.projects.map(project => 
        `- ${project.projectName} (${project.projectId}) - ${project.status}`
      ).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CPMS_Report_${moment().format('YYYY-MM-DD')}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status, type = 'default') => {
    const variants = {
      active: 'success',
      inactive: 'secondary',
      suspended: 'danger',
      completed: 'success',
      'in-progress': 'primary',
      planning: 'info',
      delayed: 'warning',
      cancelled: 'danger',
      paid: 'success',
      pending: 'warning',
      overdue: 'danger',
      unread: 'danger',
      read: 'primary',
      replied: 'success'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <Container fluid>
      <div className="page-title">
        <i className="fas fa-chart-bar me-2"></i>
        Reports & Analytics
      </div>

      {/* Report Controls */}
      <Row className="mb-4">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>End Date</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </Form.Group>
        </Col>
        <Col md={6} className="d-flex align-items-end">
          <Button 
            variant="primary" 
            onClick={generateReport} 
            disabled={loading}
            className="me-2"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-sync me-2"></i>
                Generate Report
              </>
            )}
          </Button>
          <Button variant="outline-success" onClick={exportReport}>
            <i className="fas fa-download me-2"></i>
            Export
          </Button>
        </Col>
      </Row>

      {/* Summary Statistics */}
      <Row className="mb-4">
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <div className="stat-icon mx-auto mb-2" style={{ background: 'linear-gradient(45deg, #667eea, #764ba2)' }}>
                <i className="fas fa-users text-white"></i>
              </div>
              <h4 className="fw-bold text-primary">{stats.totalClients}</h4>
              <small className="text-muted">Total Clients</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <div className="stat-icon mx-auto mb-2" style={{ background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)' }}>
                <i className="fas fa-user-tie text-white"></i>
              </div>
              <h4 className="fw-bold text-success">{stats.totalEmployees}</h4>
              <small className="text-muted">Total Employees</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <div className="stat-icon mx-auto mb-2" style={{ background: 'linear-gradient(45deg, #f093fb, #f5576c)' }}>
                <i className="fas fa-project-diagram text-white"></i>
              </div>
              <h4 className="fw-bold text-info">{stats.totalProjects}</h4>
              <small className="text-muted">Total Projects</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <div className="stat-icon mx-auto mb-2" style={{ background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)' }}>
                <i className="fas fa-credit-card text-white"></i>
              </div>
              <h4 className="fw-bold text-warning">{stats.totalPayments}</h4>
              <small className="text-muted">Total Payments</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <div className="stat-icon mx-auto mb-2" style={{ background: 'linear-gradient(45deg, #4ecdc4, #44a08d)' }}>
                <i className="fas fa-envelope text-white"></i>
              </div>
              <h4 className="fw-bold text-primary">{stats.totalMessages}</h4>
              <small className="text-muted">Total Messages</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <div className="stat-icon mx-auto mb-2" style={{ background: 'linear-gradient(45deg, #ff9a9e, #fecfef)' }}>
                <i className="fas fa-bell text-white"></i>
              </div>
              <h4 className="fw-bold text-danger">{stats.unreadMessages}</h4>
              <small className="text-muted">Unread Messages</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Tables */}
      <Row>
        {/* Clients Summary */}
        <Col lg={6} className="mb-4">
          <Card className="custom-table">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-users me-2"></i>
                Clients Summary
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Projects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.clients.slice(0, 10).map((client) => (
                      <tr key={client._id}>
                        <td>
                          <div className="fw-semibold">{client.companyName}</div>
                          <small className="text-muted">{client.clientId}</small>
                        </td>
                        <td>{client.contactPerson}</td>
                        <td>{getStatusBadge(client.status)}</td>
                        <td>{client.projectCount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {reportData.clients.length > 10 && (
                <div className="text-center">
                  <small className="text-muted">
                    Showing 10 of {reportData.clients.length} clients
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Employees Summary */}
        <Col lg={6} className="mb-4">
          <Card className="custom-table">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-user-tie me-2"></i>
                Employees Summary
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.employees.slice(0, 10).map((employee) => (
                      <tr key={employee._id}>
                        <td>
                          <div className="fw-semibold">{employee.name}</div>
                          <small className="text-muted">{employee.employeeId}</small>
                        </td>
                        <td>{employee.department}</td>
                        <td>{employee.designation}</td>
                        <td>{getStatusBadge(employee.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {reportData.employees.length > 10 && (
                <div className="text-center">
                  <small className="text-muted">
                    Showing 10 of {reportData.employees.length} employees
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Projects Summary */}
        <Col lg={6} className="mb-4">
          <Card className="custom-table">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-project-diagram me-2"></i>
                Projects Summary
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Status</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.projects.slice(0, 10).map((project) => (
                      <tr key={project._id}>
                        <td>
                          <div className="fw-semibold">{project.projectName}</div>
                          <small className="text-muted">{project.projectId}</small>
                        </td>
                        <td>{project.client?.companyName}</td>
                        <td>{getStatusBadge(project.status)}</td>
                        <td>{project.progress || 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {reportData.projects.length > 10 && (
                <div className="text-center">
                  <small className="text-muted">
                    Showing 10 of {reportData.projects.length} projects
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Messages */}
        <Col lg={6} className="mb-4">
          <Card className="custom-table">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-envelope me-2"></i>
                Recent Messages
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>From</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.messages.slice(0, 10).map((message) => (
                      <tr key={message._id}>
                        <td>
                          <div className="fw-semibold">{message.subject}</div>
                          <small className="text-muted">{message.messageType}</small>
                        </td>
                        <td>{message.sender?.name}</td>
                        <td>{getStatusBadge(message.status)}</td>
                        <td>{moment(message.createdAt).format('DD MMM')}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {reportData.messages.length > 10 && (
                <div className="text-center">
                  <small className="text-muted">
                    Showing 10 of {reportData.messages.length} messages
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Report Footer */}
      <Row>
        <Col>
          <Alert variant="light" className="text-center">
            <small className="text-muted">
              Report generated on {moment().format('DD MMM YYYY, HH:mm')} | 
              Data range: {moment(dateRange.startDate).format('DD MMM YYYY')} to {moment(dateRange.endDate).format('DD MMM YYYY')}
            </small>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;
