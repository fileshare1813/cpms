import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, ProgressBar, Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { projectAPI } from '../../services/api';
import moment from 'moment';

const ClientProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.clientInfo) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getByClient(user.clientInfo._id);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'planning': 'info',
      'in-progress': 'primary',
      'completed': 'success',
      'delayed': 'danger',
      'cancelled': 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      'low': 'success',
      'medium': 'warning',
      'high': 'danger',
      'urgent': 'danger'
    };
    return <Badge bg={variants[priority] || 'secondary'}>{priority}</Badge>;
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
    <div>
      <h4 className="mb-4">
        <i className="fas fa-project-diagram me-2"></i>
        My Projects ({projects.length})
      </h4>

      {projects.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle fa-2x mb-3"></i>
          <h5>No Projects Found</h5>
          <p className="mb-0">You don't have any projects assigned at the moment.</p>
        </Alert>
      ) : (
        projects.map((project) => (
          <Card key={project._id} className="mb-4 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-folder me-2"></i>
                  {project.projectName}
                </h5>
                <div>
                  {getStatusBadge(project.status)}
                  <span className="ms-2">{getPriorityBadge(project.priority)}</span>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Project ID:</strong> {project.projectId}
                </div>
                <div className="col-md-6">
                  <strong>Service Type:</strong> {project.serviceType}
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Start Date:</strong> {moment(project.startDate).format('DD MMM YYYY')}
                </div>
                <div className="col-md-6">
                  <strong>Expected End:</strong> {project.estimatedEndDate ? moment(project.estimatedEndDate).format('DD MMM YYYY') : 'TBD'}
                </div>
              </div>

              {project.description && (
                <div className="mb-3">
                  <strong>Description:</strong>
                  <p className="mt-1">{project.description}</p>
                </div>
              )}

              <div className="mb-3">
                <strong>Progress:</strong>
                <ProgressBar 
                  now={project.progress || 0} 
                  variant="primary" 
                  className="mt-2"
                  style={{ height: '10px' }}
                />
                <small className="text-muted">{project.progress || 0}% completed</small>
              </div>

              {project.assignedEmployees && project.assignedEmployees.length > 0 && (
                <div className="mb-3">
                  <strong>Assigned Team:</strong>
                  <div className="mt-2">
                    {project.assignedEmployees.map((assignment, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="me-2 mb-1 p-2">
                        <i className="fas fa-user me-1"></i>
                        {assignment.employee?.name}
                        {assignment.role && ` (${assignment.role})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {project.tasks && project.tasks.length > 0 && (
                <div>
                  <strong>Recent Tasks:</strong>
                  <Table size="sm" className="mt-2">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.tasks.slice(0, 3).map((task, idx) => (
                        <tr key={idx}>
                          <td>{task.taskName}</td>
                          <td>
                            <Badge bg={task.status === 'completed' ? 'success' : task.status === 'in-progress' ? 'primary' : 'secondary'}>
                              {task.status}
                            </Badge>
                          </td>
                          <td>{task.dueDate ? moment(task.dueDate).format('DD MMM') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  );
};

export default ClientProjects;
