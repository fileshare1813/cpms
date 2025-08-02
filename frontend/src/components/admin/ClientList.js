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

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    domains: [],
    hosting: [],
    status: 'active'
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
        status: client.status || 'active'
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
        status: 'active'
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('💾 Saving client data:', formData);
      
      // Validate required fields
      if (!formData.companyName || !formData.contactPerson || !formData.email || !formData.phone) {
        toast.error('Please fill all required fields');
        setSaving(false);
        return;
      }

      // Prepare form data
      const clientData = {
        ...formData,
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim()
      };

      console.log('📤 Sending client data:', clientData);

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
        toast.success(editingClient ? 'Client updated successfully!' : 'Client created successfully!');
        handleModalClose();
        fetchClients();
      } else {
        toast.error(response.data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('❌ Client save error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save client';
      toast.error(errorMessage);
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

  // Account creation functions
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
        // 🌐 Login URL: http://localhost:3000/login`);

      const result = await response.json();
      
      if (result.success) {
        toast.success(`✅ Client login account created successfully!
        🏢 Company: ${selectedClient.companyName}
        📧 Email: ${accountForm.email}
        🔑 Password: ${accountForm.password}
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
    return client.hasLoginAccount || false;
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

      {/* Debug Info */}
      {/* <Row className="mb-3">
        <Col>
          <Alert variant="info">
            <small>
              <strong>Debug Info:</strong> 
              Total Clients: {pagination.total} | 
              Current Page: {pagination.page} | 
              Loading: {loading ? 'Yes' : 'No'} | 
              API Base: http://localhost:5000/api
            </small>
          </Alert>
        </Col>
      </Row> */}

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
                          <td>{client.email}</td>
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

      {/* Add/Edit Client Modal */}
      <Modal show={showModal} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${editingClient ? 'fa-edit' : 'fa-plus'} me-2`}></i>
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Debug Form Data */}
            <Alert variant="light">
              <small>
                <strong>Form Debug : </strong> 
                Company: {formData.companyName || 'Empty'} | 
                Email: {formData.email || 'Empty'} | 
                Saving: {saving ? 'Yes' : 'No'}
              </small>
            </Alert>

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
                    className={!formData.companyName ? 'is-invalid' : ''}
                  />
                  {!formData.companyName && <div className="invalid-feedback">Company name is required</div>}
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
                    className={!formData.contactPerson ? 'is-invalid' : ''}
                  />
                  {!formData.contactPerson && <div className="invalid-feedback">Contact person is required</div>}
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
                    className={!formData.email ? 'is-invalid' : ''}
                  />
                  {!formData.email && <div className="invalid-feedback">Email is required</div>}
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
                    className={!formData.phone ? 'is-invalid' : ''}
                  />
                  {!formData.phone && <div className="invalid-feedback">Phone is required</div>}
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
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose} disabled={saving}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={saving || !formData.companyName || !formData.contactPerson || !formData.email || !formData.phone}
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

      {/* Create Client Account Modal */}
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

                // <Alert variant="success">
                //   <i className="fas fa-info-circle me-2"></i>
                //   <strong>Client Portal Access:</strong><br/>
                //   • Client can login at: <code>http://localhost:3000/login</code><br/>
                //   • Use <strong>Client tab</strong> with above credentials<br/>
                //   • Client will have access to their projects and payments only
                // </Alert>
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

