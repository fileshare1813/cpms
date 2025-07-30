import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { projectAPI, messageAPI } from '../../services/api';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.employeeInfo) {
      fetchEmployeeData();
    }
  }, [user]);

  const fetchEmployeeData = async () => {
    try {
      const projectsRes = await projectAPI.getAll({ employeeId: user.employeeInfo._id });
      setAssignedProjects(projectsRes.data.projects || []);

      const messagesRes = await messageAPI.getAll({ employeeId: user.employeeInfo._id });
      setMessages(messagesRes.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-portal">
      <Container fluid className="py-4 px-3 px-md-5">
        {/* Dashboard Header */}
        <Row className="align-items-center mb-4">
          <Col xs={12} md={8}>
            <h2 className="fw-bold text-primary mb-2">
              <i className="fas fa-user-tie me-2"></i>
              Employee Dashboard
            </h2>
            <div className="text-muted small">
              Welcome, <strong>{user?.employeeInfo?.name}</strong> <br className="d-md-none" />
              Department: {user?.employeeInfo?.deparment} <br className="d-md-none" />
              Designation: {user?.employeeInfo?.designation}
            </div>
          </Col>
          <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0">
            <Button variant="outline-danger" onClick={logout}>
              <i className="fas fa-sign-out-alt me-2"></i>
              Logout
            </Button>
          </Col>
        </Row>

        {/* Projects Card */}
        <Card className="custom-table shadow-sm">
          <Card.Header className="bg-white">
            <h5 className="mb-0 d-flex align-items-center">
              <i className="fas fa-tasks me-2 text-primary"></i>
              My Assigned Projects
              <Badge bg="secondary" className="ms-2">{assignedProjects.length}</Badge>
            </h5>
          </Card.Header>
          <Card.Body>
            {assignedProjects.length === 0 ? (
              <div className="text-center py-4">
                <i className="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                <h5>No Projects Assigned</h5>
                <p className="text-muted">You don't have any projects assigned at the moment.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Service Type</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedProjects.map((project) => (
                      <tr key={project._id}>
                        <td>
                          <div className="fw-semibold">{project.projectName}</div>
                          <small className="text-muted">ID: {project.projectId}</small>
                        </td>
                        <td>{project.client?.companyName}</td>
                        <td>{project.serviceType}</td>
                        <td>
                          <Badge bg={
                            project.status === 'completed' ? 'success' :
                            project.status === 'in-progress' ? 'primary' :
                            project.status === 'delayed' ? 'danger' : 'warning'
                          }>
                            {project.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="progress" style={{ height: '6px' }}>
                            <div
                              className="progress-bar bg-primary"
                              style={{ width: `${project.progress || 0}%` }}
                            ></div>
                          </div>
                          <small>{project.progress || 0}%</small>
                        </td>
                        <td>{project.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default EmployeeDashboard;
