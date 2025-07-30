import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import { projectAPI, clientAPI, employeeAPI } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [formData, setFormData] = useState({
    projectName: '',
    client: '',
    serviceType: 'Website Development',
    description: '',
    status: 'planning',
    priority: 'medium',
    budget: '',
    startDate: '',
    estimatedEndDate: '',
    progress: 0,
    assignedEmployees: [],
    technologies: [],
    notes: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchEmployees();
  }, [pagination.page, searchTerm, statusFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching projects...');
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter
      };

      const response = await projectAPI.getAll(params);
      console.log('✅ Projects API Response:', response.data);

      if (response.data.success) {
        setProjects(response.data.projects || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      } else {
        toast.error('Failed to fetch projects');
      }
    } catch (error) {
      console.error('❌ Failed to fetch projects:', error);
      toast.error(`Failed to fetch projects: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientAPI.getAll({ limit: 100 });
      if (response.data.success) {
        setClients(response.data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAll({ limit: 100 });
      if (response.data.success) {
        setEmployees(response.data.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleModalShow = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        projectName: project.projectName || '',
        client: project.client?._id || '',
        serviceType: project.serviceType || 'Website Development',
        description: project.description || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium',
        budget: project.budget || '',
        startDate: project.startDate ? moment(project.startDate).format('YYYY-MM-DD') : '',
        estimatedEndDate: project.estimatedEndDate ? moment(project.estimatedEndDate).format('YYYY-MM-DD') : '',
        progress: project.progress || 0,
        assignedEmployees: project.assignedEmployees?.map(emp => ({
          employee: emp.employee._id,
          role: emp.role
        })) || [],
        technologies: project.technologies || [],
        notes: project.notes || ''
      });
    } else {
      setEditingProject(null);
      setFormData({
        projectName: '',
        client: '',
        serviceType: 'Website Development',
        description: '',
        status: 'planning',
        priority: 'medium',
        budget: '',
        startDate: '',
        estimatedEndDate: '',
        progress: 0,
        assignedEmployees: [],
        technologies: [],
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProject(null);
    setSaving(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!formData.projectName.trim() || !formData.client || !formData.description.trim() || 
        !formData.budget || !formData.startDate || !formData.estimatedEndDate) {
      toast.error('Please fill all required fields');
      setSaving(false);
      return;
    }

    if (new Date(formData.estimatedEndDate) <= new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      setSaving(false);
      return;
    }

    try {
      console.log('💾 Saving project:', formData);

      const projectData = {
        ...formData,
        projectName: formData.projectName.trim(),
        description: formData.description.trim(),
        budget: Number(formData.budget),
        progress: Number(formData.progress),
        technologies: typeof formData.technologies === 'string' ? 
                     formData.technologies.split(',').map(t => t.trim()).filter(t => t) : 
                     formData.technologies,
        notes: formData.notes.trim()
      };

      console.log('📤 Final project data:', projectData);

      let response;
      if (editingProject) {
        response = await projectAPI.update(editingProject._id, projectData);
      } else {
        response = await projectAPI.create(projectData);
      }

      console.log('✅ Project save response:', response.data);

      if (response.data.success) {
        toast.success(editingProject ? 'Project updated successfully!' : 'Project created successfully!');
        handleModalClose();
        fetchProjects();
      } else {
        toast.error(response.data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('❌ Project save error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save project';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        const response = await projectAPI.delete(id);
        if (response.data.success) {
          toast.success('Project deleted successfully');
          fetchProjects();
        } else {
          toast.error(response.data.message || 'Failed to delete project');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete project');
      }
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'planning': 'info',
      'in-progress': 'primary',
      'completed': 'success',
      'on-hold': 'warning',
      'cancelled': 'secondary',
      'delayed': 'danger'
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

  const addEmployeeAssignment = () => {
    setFormData(prev => ({
      ...prev,
      assignedEmployees: [...prev.assignedEmployees, { employee: '', role: 'Developer' }]
    }));
  };

  const removeEmployeeAssignment = (index) => {
    setFormData(prev => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.filter((_, i) => i !== index)
    }));
  };

  const updateEmployeeAssignment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.map((emp, i) => 
        i === index ? { ...emp, [field]: value } : emp
      )
    }));
  };

  return (
    <Container fluid>
      <div className="page-title">
        <i className="fas fa-project-diagram me-2"></i>
        Project Management
      </div>

      {/* Search and Filter Controls */}
      <Row className="mb-4">
        <Col lg={4}>
          <InputGroup>
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col lg={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="planning">Planning</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
            <option value="delayed">Delayed</option>
          </Form.Select>
        </Col>
        <Col lg={5} className="text-end">
          <Button variant="primary" onClick={() => handleModalShow()}>
            <i className="fas fa-plus me-2"></i>
            Add New Project
          </Button>
        </Col>
      </Row>

      {/* Debug Info */}
      {/* <Row className="mb-3">
        <Col>
          <Alert variant="info">
            <small>
              <strong>Debug Info:</strong> 
              Total Projects: {pagination.total} | 
              Current Page: {pagination.page} | 
              Loading: {loading ? 'Yes' : 'No'} | 
              Clients Available: {clients.length} | 
              Employees Available: {employees.length}
            </small>
          </Alert>
        </Col>
      </Row> */}

      {/* Projects Table */}
      <Card className="custom-table">
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Projects ({pagination.total})
          </h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading projects...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Project ID</th>
                      <th>Name</th>
                      <th>Client</th>
                      <th>Service Type</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Progress</th>
                      <th>Budget</th>
                      <th>Deadline</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          <i className="fas fa-project-diagram fa-2x text-muted mb-3"></i>
                          <h5>No Projects Found</h5>
                          <p className="text-muted">
                            {searchTerm || statusFilter 
                              ? 'No projects match your current filters.' 
                              : 'Click "Add New Project" to create your first project.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      projects.map((project) => (
                        <tr key={project._id}>
                          <td>
                            <strong className="text-primary">{project.projectId}</strong>
                          </td>
                          <td>
                            <div className="fw-semibold">{project.projectName}</div>
                            <small className="text-muted">
                              {project.description?.substring(0, 50)}...
                            </small>
                          </td>
                          <td>
                            <div className="fw-semibold">{project.client?.companyName}</div>
                            <small className="text-muted">{project.client?.clientId}</small>
                          </td>
                          <td>{project.serviceType}</td>
                          <td>{getStatusBadge(project.status)}</td>
                          <td>{getPriorityBadge(project.priority)}</td>
                          <td>
                            <div className="progress mb-1" style={{ height: '6px' }}>
                              <div
                                className="progress-bar bg-primary"
                                style={{ width: `${project.progress || 0}%` }}
                              ></div>
                            </div>
                            <small>{project.progress || 0}%</small>
                          </td>
                          <td>₹{project.budget?.toLocaleString('en-IN')}</td>
                          <td>
                            {project.estimatedEndDate 
                              ? moment(project.estimatedEndDate).format('DD MMM YYYY')
                              : '-'
                            }
                          </td>
                          <td>
                            <div className="btn-group">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-1"
                                onClick={() => handleModalShow(project)}
                                title="Edit Project"
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(project._id)}
                                title="Delete Project"
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <nav className="mt-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {[...Array(pagination.totalPages)].map((_, index) => (
                      <li
                        key={index}
                        className={`page-item ${pagination.page === index + 1 ? 'active' : ''}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setPagination(prev => ({ ...prev, page: index + 1 }))}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    
                    <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Project Modal */}
      <Modal show={showModal} onHide={handleModalClose} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${editingProject ? 'fa-edit' : 'fa-plus'} me-2`}></i>
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Debug Form Data */}
            {/* <Alert variant="light">
              <small>
                <strong>Form Debug : </strong> 
                Project Name: {formData.projectName || 'Empty'} | 
                Client: {formData.client || 'Not Selected'} | 
                Budget: {formData.budget || 'Empty'} | 
                Saving: {saving ? 'Yes' : 'No'}
              </small>
            </Alert> */}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Project Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter project name"
                    className={!formData.projectName ? 'is-invalid' : ''}
                  />
                  {!formData.projectName && <div className="invalid-feedback">Project name is required</div>}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Client <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="client"
                    value={formData.client}
                    onChange={handleInputChange}
                    required
                    className={!formData.client ? 'is-invalid' : ''}
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {client.companyName} ({client.clientId})
                      </option>
                    ))}
                  </Form.Select>
                  {!formData.client && <div className="invalid-feedback">Client selection is required</div>}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Service Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Choose</option>
                    <option value="Website Development">Website Development</option>
                    <option value="SEO">SEO</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Custom Software">Custom Software</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Budget (₹) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    required
                    min="0"
                    placeholder="Enter project budget"
                    className={!formData.budget ? 'is-invalid' : ''}
                  />
                  {!formData.budget && <div className="invalid-feedback">Budget is required</div>}
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="Enter project description"
                className={!formData.description ? 'is-invalid' : ''}
              />
              {!formData.description && <div className="invalid-feedback">Description is required</div>}
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className={!formData.startDate ? 'is-invalid' : ''}
                  />
                  {!formData.startDate && <div className="invalid-feedback">Start date is required</div>}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estimated End Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="estimatedEndDate"
                    value={formData.estimatedEndDate}
                    onChange={handleInputChange}
                    required
                    className={!formData.estimatedEndDate ? 'is-invalid' : ''}
                  />
                  {!formData.estimatedEndDate && <div className="invalid-feedback">End date is required</div>}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="planning">Planning</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="delayed">Delayed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Progress (%)</Form.Label>
                  <Form.Control
                    type="number"
                    name="progress"
                    value={formData.progress}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    placeholder="0-100"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Assigned Employees */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Assigned Employees</Form.Label>
                <Button size="sm" variant="outline-primary" onClick={addEmployeeAssignment}>
                  <i className="fas fa-plus me-1"></i>
                  Add Employee
                </Button>
              </div>
              
              {formData.assignedEmployees.map((assignment, index) => (
                <Row key={index} className="mb-2">
                  <Col md={6}>
                    <Form.Select
                      value={assignment.employee}
                      onChange={(e) => updateEmployeeAssignment(index, 'employee', e.target.value)}
                    >
                      <option value="">Select Employee</option>
                      {employees.map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {employee.name} - {employee.designation}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <Form.Select
                      value={assignment.role}
                      onChange={(e) => updateEmployeeAssignment(index, 'role', e.target.value)}
                    >
                      <option value="Project Manager">Project Manager</option>
                      <option value="Developer">Developer</option>
                      <option value="Designer">Designer</option>
                      <option value="SEO Specialist">SEO Specialist</option>
                      <option value="Content Writer">Content Writer</option>
                      <option value="QA Tester">QA Tester</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => removeEmployeeAssignment(index)}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </Col>
                </Row>
              ))}
            </div>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Technologies (comma separated)</Form.Label>
                  <Form.Control
                    type="text"
                    name="technologies"
                    value={Array.isArray(formData.technologies) ? formData.technologies.join(', ') : formData.technologies}
                    onChange={handleInputChange}
                    placeholder="React, Node.js, MongoDB, etc."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional project notes"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose} disabled={saving}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={saving || !formData.projectName || !formData.client || !formData.description || !formData.budget || !formData.startDate || !formData.estimatedEndDate}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {editingProject ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {editingProject ? 'Update Project' : 'Create Project'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProjectList;
