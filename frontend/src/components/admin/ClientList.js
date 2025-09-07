import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, InputGroup, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { clientAPI } from '../../services/api';

const ClientList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Account creation states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [accountForm, setAccountForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // FIXED: Enhanced form data with user account fields
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    domains: [],
    hosting: [],
    status: 'active',
    // User account fields (for new clients)
    userName: '',
    userPassword: '',
    createUserAccount: true // Toggle for creating user account
  });

  useEffect(() => {
    fetchClients();
  }, [pagination.page, searchTerm, statusFilter]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching clients...');
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter
      };

      const response = await clientAPI.getAll(params);
      console.log('✅ Client API Response:', response.data);
      
      if (response.data.success) {
        setClients(response.data.clients || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      } else {
        toast.error('Failed to fetch clients');
      }
    } catch (error) {
      console.error('❌ Fetch clients error:', error);
      toast.error(`Failed to fetch clients: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleModalShow = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        companyName: client.companyName || '',
        contactPerson: client.contactPerson || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        notes: client.notes || '',
        domains: client.domains || [],
        hosting: client.hosting || [],
        status: client.status || 'active',
        // Don't show user fields for editing
        userName: '',
        userPassword: '',
        createUserAccount: false
      });
    } else {
      setEditingClient(null);
      setFormData({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        domains: [],
        hosting: [],
        status: 'active',
        // User account fields for new client
        userName: '',
        userPassword: '',
        createUserAccount: true
      });
    }
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingClient(null);
    setSaving(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // FIXED: Enhanced submit function with proper validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('💾 Saving client data:', formData);
      
      // Enhanced validation
      const requiredFields = [
        { field: 'companyName', message: 'Company name is required' },
        { field: 'contactPerson', message: 'Contact person is required' },
        { field: 'email', message: 'Email is required' },
        { field: 'phone', message: 'Phone number is required' }
      ];

      // Additional validation for new clients with user accounts
      if (!editingClient && formData.createUserAccount) {
        requiredFields.push(
          { field: 'userName', message: 'User name is required for client account' },
          { field: 'userPassword', message: 'Password is required for client account' }
        );
      }

      // Check required fields
      for (const { field, message } of requiredFields) {
        if (!formData[field] || !formData[field].toString().trim()) {
          toast.error(message);
          setSaving(false);
          return;
        }
      }

      // Email validation
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        setSaving(false);
        return;
      }

      // Password validation for new clients
      if (!editingClient && formData.createUserAccount && formData.userPassword.length < 6) {
        toast.error('Password must be at least 6 characters long');
        setSaving(false);
        return;
      }

      // Phone validation
      if (formData.phone.length < 10) {
        toast.error('Phone number must be at least 10 digits');
        setSaving(false);
        return;
      }

      // Prepare client data
      const clientData = {
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address?.trim() || '',
        notes: formData.notes?.trim() || '',
        domains: formData.domains || [],
        hosting: formData.hosting || [],
        status: formData.status
      };

      // Add user account data for new clients
      if (!editingClient && formData.createUserAccount) {
        clientData.userName = formData.userName.trim();
        clientData.userPassword = formData.userPassword;
        console.log('📤 Creating client with user account');
      }

      console.log('📤 Sending client data:', {
        ...clientData,
        userPassword: clientData.userPassword ? '[HIDDEN]' : undefined
      });

      let response;
      if (editingClient) {
        console.log('🔄 Updating client with ID:', editingClient._id);
        response = await clientAPI.update(editingClient._id, clientData);
      } else {
        console.log('➕ Creating new client');
        response = await clientAPI.create(clientData);
      }

      console.log('✅ Client save response:', response.data);
      
      if (response.data.success) {
        const successMessage = editingClient 
          ? 'Client updated successfully!' 
          : formData.createUserAccount 
            ? 'Client and user account created successfully!' 
            : 'Client created successfully!';
        
        toast.success(successMessage);
        handleModalClose();
        fetchClients();
      } else {
        toast.error(response.data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('❌ Client save error:', error);
      let errorMessage = 'Failed to save client';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        console.log('🗑️ Deleting client with ID:', id);
        const response = await clientAPI.delete(id);
        console.log('✅ Delete response:', response.data);
        
        if (response.data.success) {
          toast.success('Client deleted successfully');
          fetchClients();
        } else {
          toast.error(response.data.message || 'Failed to delete client');
        }
      } catch (error) {
        console.error('❌ Delete client error:', error);
        toast.error(error.response?.data?.message || 'Failed to delete client');
      }
    }
  };

  // Account creation functions (for existing clients without accounts)
  const handleCreateClientAccount = (client) => {
    setSelectedClient(client);
    setAccountForm({
      email: client.email || `${client.companyName.toLowerCase().replace(/\s+/g, '')}@client.com`,
      password: '',
      confirmPassword: ''
    });
    setShowAccountModal(true);
  };

  const createClientAccount = async (e) => {
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
      const response = await fetch('https://cpms-4qh0.onrender.com/api/auth/client/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          clientId: selectedClient._id,
          name: selectedClient.contactPerson,
          email: accountForm.email,
          password: accountForm.password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`✅ Client login account created successfully!
        🏢 Company: ${selectedClient.companyName}
        📧 Email: ${accountForm.email}
        🔑 Password: ${accountForm.password}
        🌐 Login URL: http://localhost:3000/login`);
        setShowAccountModal(false);
        fetchClients(); // Refresh client list
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Account creation error:', error);
      toast.error('Failed to create client account');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'secondary',
      suspended: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const checkHasLoginAccount = (client) => {
    return client.user || client.hasLoginAccount || false;
  };

  return (
    <Container fluid>
      <div className="page-title">
        <i className="fas fa-users me-3"></i>
        Client Management
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
              placeholder="Search clients..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Form.Select>
        </Col>
        <Col lg={5} className="text-end">
          <Button variant="primary" onClick={() => handleModalShow()}>
            <i className="fas fa-plus me-2"></i>
            Add New Client
          </Button>
        </Col>
      </Row>

      {/* Clients Table */}
      <Card className="custom-table">
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Clients ({pagination.total})
          </h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading clients...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Client ID</th>
                      <th>Company</th>
                      <th>Contact Person</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Login Account</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <i className="fas fa-building fa-2x text-muted mb-3"></i>
                          <h5>No Clients Found</h5>
                          <p className="text-muted">Click "Add New Client" to create your first client.</p>
                        </td>
                      </tr>
                    ) : (
                      clients.map((client) => (
                        <tr key={client._id}>
                          <td>
                            <strong className="text-primary">{client.clientId}</strong>
                          </td>
                          <td>
                            <div className="fw-semibold">{client.companyName}</div>
                            <small className="text-muted">
                              {client.domains?.length || 0} domains, {client.hosting?.length || 0} hosting
                            </small>
                          </td>
                          <td>{client.contactPerson}</td>
                          <td>
                            <div className="fw-semibold">{client.email}</div>
                          </td>
                          <td>{client.phone}</td>
                          <td>{getStatusBadge(client.status)}</td>
                          <td>
                            {checkHasLoginAccount(client) ? (
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
                              {!checkHasLoginAccount(client) && (
                                <Button
                                  size="sm"
                                  variant="outline-success"
                                  onClick={() => handleCreateClientAccount(client)}
                                  title="Create Client Login Account"
                                >
                                  <i className="fas fa-key"></i>
                                </Button>
                              )}
                              
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-1"
                                onClick={() => handleModalShow(client)}
                                title="Edit Client"
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(client._id)}
                                title="Delete Client"
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

      {/* FIXED: Enhanced Add/Edit Client Modal */}
      <Modal show={showModal} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${editingClient ? 'fa-edit' : 'fa-plus'} me-2`}></i>
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Client Information Section */}
            <div className="mb-4">
              <h6 className="fw-bold text-primary mb-3">
                <i className="fas fa-building me-2"></i>
                Client Information
              </h6>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Company Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter company name"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contact Person <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      required
                      placeholder="Contact person name"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="client@company.com"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone Number <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="+91 9876543210"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Complete address"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes about client"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Form.Select>
              </Form.Group>
            </div>

            {/* User Account Section (Only for new clients) */}
            {!editingClient && (
              <div className="mb-4">
                <hr />
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold text-success mb-0">
                    <i className="fas fa-user-plus me-2"></i>
                    Create User Account
                  </h6>
                  <Form.Check
                    type="switch"
                    id="createUserAccount"
                    name="createUserAccount"
                    checked={formData.createUserAccount}
                    onChange={handleInputChange}
                    label="Enable"
                  />
                </div>

                {formData.createUserAccount && (
                  <>
                    <Alert variant="info" className="mb-3">
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Client Portal Access:</strong> This will create a login account for the client to access their projects, payments, and messages.
                    </Alert>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>User Name <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="text"
                            name="userName"
                            value={formData.userName}
                            onChange={handleInputChange}
                            required={formData.createUserAccount}
                            placeholder="Enter user name"
                          />
                          <Form.Text className="text-muted">
                            This will be the display name in the system
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Password <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="password"
                            name="userPassword"
                            value={formData.userPassword}
                            onChange={handleInputChange}
                            required={formData.createUserAccount}
                            minLength={6}
                            placeholder="Min 6 characters"
                          />
                          <Form.Text className="text-muted">
                            Client will use this password to login
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}
              </div>
            )}

            {/* Form Debug Info (Remove in production) */}
            <Alert variant="light" className="small">
              <strong>Debug:</strong> 
              Company: {formData.companyName || 'Empty'} | 
              Email: {formData.email || 'Empty'} | 
              User Account: {formData.createUserAccount ? 'Yes' : 'No'} |
              User Name: {formData.userName || 'Empty'} |
              Saving: {saving ? 'Yes' : 'No'}
            </Alert>
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose} disabled={saving}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={
                saving || 
                !formData.companyName.trim() || 
                !formData.contactPerson.trim() || 
                !formData.email.trim() || 
                !formData.phone.trim() ||
                (formData.createUserAccount && !editingClient && (!formData.userName.trim() || !formData.userPassword))
              }
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {editingClient ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {editingClient ? 'Update Client' : 'Create Client'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Create Client Account Modal (for existing clients) */}
      <Modal show={showAccountModal} onHide={() => setShowAccountModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-key me-2 text-primary"></i>
            Create Client Login Account
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={createClientAccount}>
          <Modal.Body>
            {selectedClient && (
              <>
                <Alert variant="info">
                  <div className="d-flex align-items-center mb-2">
                    <i className="fas fa-building fa-2x me-3"></i>
                    <div>
                      <strong>Company:</strong> {selectedClient.companyName}<br/>
                      <strong>Contact Person:</strong> {selectedClient.contactPerson}<br/>
                      <strong>Client ID:</strong> {selectedClient.clientId}
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
                    placeholder="client@company.com"
                  />
                  <Form.Text className="text-muted">
                    This email will be used for client portal login
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
                  <strong>Client Portal Access:</strong><br/>
                  • Client can login at: <code>http://localhost:3000/login</code><br/>
                  • Use <strong>Client tab</strong> with above credentials<br/>
                  • Client will have access to their projects and payments only
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
              variant="primary"
              disabled={
                !accountForm.email || 
                !accountForm.password || 
                !accountForm.confirmPassword ||
                accountForm.password !== accountForm.confirmPassword ||
                accountForm.password.length < 6
              }
            >
              <i className="fas fa-key me-2"></i>
              Create Client Account
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ClientList;