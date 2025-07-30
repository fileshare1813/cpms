import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, InputGroup, Alert } from 'react-bootstrap';
import { employeeAPI } from '../../services/api';
import { toast } from 'react-toastify';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Account creation states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [accountForm, setAccountForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    designation: '', 
    department: 'Web Development', 
    joiningDate: '', 
    skills: [], 
    salary: 0,
    status: 'active'
  });

  // Fetch employees data
  useEffect(() => { 
    fetchData(); 
  }, [pagination.page, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching employees...');
      const res = await employeeAPI.getAll({ page: pagination.page, search });
      console.log('✅ Employee API Response:', res.data);
      
      if (res.data.success) {
        setEmployees(res.data.employees || []);
        setPagination(prev => ({ 
          ...prev, 
          total: res.data.pagination?.total || 0,
          totalPages: res.data.pagination?.totalPages || 0
        }));
      } else {
        toast.error('Failed to fetch employees');
      }
    } catch (error) {
      console.error('❌ Fetch employees error:', error);
      toast.error(`Failed to fetch employees: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Modal helpers for employee CRUD
  const open = (emp = null) => {
    setEditing(emp);
    if (emp) {
      setForm({
        name: emp.name || '',
        email: emp.email || '',
        phone: emp.phone || '',
        designation: emp.designation || '',
        department: emp.department || 'Web Development',
        joiningDate: emp.joiningDate ? emp.joiningDate.substring(0, 10) : '',
        skills: Array.isArray(emp.skills) ? emp.skills : [],
        salary: emp.salary || 0,
        status: emp.status || 'active'
      });
    } else {
      setForm({ 
        name: '', 
        email: '', 
        phone: '', 
        designation: '', 
        department: 'Web Development', 
        joiningDate: '', 
        skills: [], 
        salary: 0,
        status: 'active'
      });
    }
    setShow(true);
  };

  const close = () => {
    setShow(false);
    setEditing(null);
    setSaving(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('💾 Saving employee data:', form);
      
      // Validate required fields
      if (!form.name || !form.email || !form.phone || !form.designation || !form.joiningDate) {
        toast.error('Please fill all required fields');
        setSaving(false);
        return;
      }

      // Prepare form data
      const formData = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        skills: Array.isArray(form.skills) ? form.skills : 
                typeof form.skills === 'string' ? 
                form.skills.split(',').map(s => s.trim()).filter(s => s) : []
      };

      console.log('📤 Sending employee data:', formData);

      let response;
      if (editing) {
        console.log('🔄 Updating employee with ID:', editing._id);
        response = await employeeAPI.update(editing._id, formData);
      } else {
        console.log('➕ Creating new employee');
        response = await employeeAPI.create(formData);
      }

      console.log('✅ Employee save response:', response.data);

      if (response.data.success) {
        toast.success(editing ? 'Employee updated successfully!' : 'Employee created successfully!');
        close();
        fetchData(); // Refresh employee list
      } else {
        toast.error(response.data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('❌ Employee save error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save employee';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    
    try {
      console.log('🗑️ Deleting employee with ID:', id);
      const response = await employeeAPI.delete(id);
      console.log('✅ Delete response:', response.data);
      
      if (response.data.success) {
        toast.success('Employee deleted successfully');
        fetchData();
      } else {
        toast.error(response.data.message || 'Failed to delete employee');
      }
    } catch (error) {
      console.error('❌ Delete employee error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete employee');
    }
  };

  // Account creation functions
  const handleCreateAccount = (employee) => {
    setSelectedEmployee(employee);
    setAccountForm({
      email: employee.email || `${employee.name.toLowerCase().replace(/\s+/g, '')}@company.com`,
      password: '',
      confirmPassword: ''
    });
    setShowAccountModal(true);
  };

  const createEmployeeAccount = async (e) => {
    e.preventDefault();
    
    if (accountForm.password !== accountForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (accountForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/employee/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          employeeId: selectedEmployee._id,
          email: accountForm.email,
          password: accountForm.password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`✅ Employee login account created successfully!
        📧 Email: ${accountForm.email}
        🔑 Password: ${accountForm.password}
        🌐 Login URL: http://localhost:3000/login`);
        setShowAccountModal(false);
        fetchData(); // Refresh employee list
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Account creation error:', error);
      toast.error('Failed to create employee account');
    }
  };

  const statusBadge = (status) => {
    const map = {
      active: 'success', 
      inactive: 'secondary', 
      'on-leave': 'warning'
    };
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
  };

  const checkHasLoginAccount = (employee) => {
    return employee.hasLoginAccount || false;
  };

  const handleSkillsChange = (e) => {
    const skillsStr = e.target.value;
    const skillsArray = skillsStr.split(',').map(s => s.trim()).filter(s => s);
    setForm({...form, skills: skillsArray});
  };

  return (
    <Container fluid>
      <div className="page-title">
        <i className="fas fa-user-tie me-2"></i>
        Employee Management
      </div>

      {/* Search and Add Employee */}
      <Row className="mb-3">
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text><i className="fas fa-search"></i></InputGroup.Text>
            <Form.Control 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search employees..." 
            />
          </InputGroup>
        </Col>
        <Col className="text-end">
          <Button onClick={() => open()} variant="primary">
            <i className="fas fa-plus me-2"></i>Add Employee
          </Button>
        </Col>
      </Row>

      {/* Debug Info */}
      {/* <Row className="mb-3">
        <Col>
          <Alert variant="info">
            <small>
              <strong>Debug Info:</strong> 
              Total Employees: {pagination.total} | 
              Current Page: {pagination.page} | 
              Loading: {loading ? 'Yes' : 'No'} | 
              API Base: http://localhost:5000/api
            </small>
          </Alert>
        </Col>
      </Row> */}

      {/* Employee Table */}
      <Card className="custom-table">
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Employees ({pagination.total})
          </h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading employees...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Login Account</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4">
                        <i className="fas fa-users fa-2x text-muted mb-3"></i>
                        <h5>No Employees Found</h5>
                        <p className="text-muted">Click "Add Employee" to create your first employee.</p>
                      </td>
                    </tr>
                  ) : (
                    employees.map(emp => (
                      <tr key={emp._id}>
                        <td><strong className="text-primary">{emp.employeeId}</strong></td>
                        <td>
                          <div className="fw-semibold">{emp.name}</div>
                          <small className="text-muted">{emp.phone}</small>
                        </td>
                        <td>{emp.email}</td>
                        <td>{emp.department}</td>
                        <td>{emp.designation}</td>
                        <td>{statusBadge(emp.status)}</td>
                        <td>
                          {checkHasLoginAccount(emp) ? (
                            <Badge bg="success">
                              <i className="fas fa-check-circle me-1"></i>
                              Active
                            </Badge>
                          ) : (
                            <Badge bg="warning">
                              <i className="fas fa-exclamation-circle me-1"></i>
                              Not Created
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div className="btn-group">
                            {/* Create Account Button */}
                            {!checkHasLoginAccount(emp) && (
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleCreateAccount(emp)}
                                title="Create Login Account"
                              >
                                <i className="fas fa-key"></i>
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="me-1"
                              onClick={() => open(emp)}
                              title="Edit Employee"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => del(emp._id)}
                              title="Delete Employee"
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
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </button>
                </li>
                
                {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => (
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
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Employee Modal */}
      <Modal show={show} onHide={close} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${editing ? 'fa-edit' : 'fa-plus'} me-2`}></i>
            {editing ? 'Edit' : 'Add'} Employee
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={save}>
          <Modal.Body>
            {/* Debug Form Data */}
            <Alert variant="light">
              <small>
                <strong>Form Debug : </strong> 
                Name: {form.name || 'Empty'} | 
                Email: {form.email || 'Empty'} | 
                Saving: {saving ? 'Yes' : 'No'}
              </small>
            </Alert>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text"
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    required 
                    placeholder="Enter full name"
                    className={!form.name ? 'is-invalid' : ''}
                  />
                  {!form.name && <div className="invalid-feedback">Name is required</div>}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})} 
                    required
                    placeholder="employee@company.com"
                    className={!form.email ? 'is-invalid' : ''}
                  />
                  {!form.email && <div className="invalid-feedback">Email is required</div>}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="tel"
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})} 
                    required
                    placeholder="+91 9876543210"
                    className={!form.phone ? 'is-invalid' : ''}
                  />
                  {!form.phone && <div className="invalid-feedback">Phone is required</div>}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Designation <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text"
                    value={form.designation} 
                    onChange={e => setForm({...form, designation: e.target.value})} 
                    required
                    placeholder="Software Developer"
                    className={!form.designation ? 'is-invalid' : ''}
                  />
                  {!form.designation && <div className="invalid-feedback">Designation is required</div>}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department *</Form.Label>
                  <Form.Select 
                    value={form.department} 
                    onChange={e => setForm({...form, department: e.target.value})}
                    required
                  >
                    <option>Choose Your Department</option>
                    <option value="Web Development">Web Development</option>
                    <option value="SEO">SEO</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Management">Management</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Joining Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="date" 
                    value={form.joiningDate} 
                    onChange={e => setForm({...form, joiningDate: e.target.value})} 
                    required
                    className={!form.joiningDate ? 'is-invalid' : ''}
                  />
                  {!form.joiningDate && <div className="invalid-feedback">Joining date is required</div>}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Monthly Salary (₹)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={form.salary} 
                    onChange={e => setForm({...form, salary: Number(e.target.value)})} 
                    placeholder="25000"
                    min="0"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select 
                    value={form.status} 
                    onChange={e => setForm({...form, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Skills (comma separated)</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                value={Array.isArray(form.skills) ? form.skills.join(', ') : form.skills}
                onChange={handleSkillsChange}
                placeholder="React, Node.js, JavaScript, MongoDB, etc."
              />
              <Form.Text className="text-muted">
                Enter skills separated by commas
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={saving || !form.name || !form.email || !form.phone || !form.designation || !form.joiningDate}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {editing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {editing ? 'Update Employee' : 'Create Employee'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Create Employee Account Modal */}
      <Modal show={showAccountModal} onHide={() => setShowAccountModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-key me-2 text-success"></i>
            Create Employee Login Account
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={createEmployeeAccount}>
          <Modal.Body>
            {selectedEmployee && (
              <>
                <Alert variant="info">
                  <div className="d-flex align-items-center mb-2">
                    <i className="fas fa-user fa-2x me-3"></i>
                    <div>
                      <strong>Employee:</strong> {selectedEmployee.name}<br/>
                      <strong>Department:</strong> {selectedEmployee.department}<br/>
                      <strong>ID:</strong> {selectedEmployee.employeeId}
                    </div>
                  </div>
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-envelope me-2"></i>
                    Login Email *
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({...accountForm, email: e.target.value})}
                    required
                    placeholder="employee@company.com"
                  />
                  <Form.Text className="text-muted">
                    This email will be used for employee login
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-lock me-2"></i>
                    Password *
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({...accountForm, password: e.target.value})}
                    required
                    minLength={6}
                    placeholder="Enter secure password (min 6 characters)"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-lock me-2"></i>
                    Confirm Password *
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={accountForm.confirmPassword}
                    onChange={(e) => setAccountForm({...accountForm, confirmPassword: e.target.value})}
                    required
                    placeholder="Confirm password"
                    className={
                      accountForm.confirmPassword && 
                      accountForm.password !== accountForm.confirmPassword ? 
                      'is-invalid' : ''
                    }
                  />
                  {accountForm.confirmPassword && accountForm.password !== accountForm.confirmPassword && (
                    <div className="invalid-feedback">
                      Passwords do not match
                    </div>
                  )}
                </Form.Group>

                <Alert variant="success">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>After account creation:</strong><br/>
                  • Employee can login at: <code>http://localhost:3000/login</code><br/>
                  • Use <strong>Employee tab</strong> with above credentials<br/>
                  • Employee will have access to their assigned projects only
                </Alert>
              </>
            )}
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAccountModal(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="success"
              disabled={
                !accountForm.email || 
                !accountForm.password || 
                !accountForm.confirmPassword ||
                accountForm.password !== accountForm.confirmPassword ||
                accountForm.password.length < 6
              }
            >
              <i className="fas fa-key me-2"></i>
              Create Login Account
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default EmployeeList;
