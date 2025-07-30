import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import { paymentAPI, clientAPI, projectAPI } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [formData, setFormData] = useState({
    client: '',
    project: '',
    description: '',
    totalAmount: '',
    paidAmount: '',
    paymentMethod: 'bank-transfer',
    dueDate: '',
    paidDate: '',
    transactionId: '',
    notes: '',
    taxAmount: '',
    discountAmount: '',
    gstRate: '18'
  });

  useEffect(() => {
    fetchPayments();
    fetchClients();
    fetchProjects();
  }, [pagination.page, searchTerm, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching payments...');
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter
      };

      const response = await paymentAPI.getAll(params);
      console.log('✅ Payments API Response:', response.data);

      if (response.data.success) {
        setPayments(response.data.payments || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      } else {
        toast.error('Failed to fetch payments');
      }
    } catch (error) {
      console.error('❌ Failed to fetch payments:', error);
      toast.error(`Failed to fetch payments: ${error.response?.data?.message || error.message}`);
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

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll({ limit: 100 });
      if (response.data.success) {
        setProjects(response.data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleModalShow = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        client: payment.client?._id || '',
        project: payment.project?._id || '',
        description: payment.description || '',
        totalAmount: payment.totalAmount || '',
        paidAmount: payment.paidAmount || '',
        paymentMethod: payment.paymentMethod || 'bank-transfer',
        dueDate: payment.dueDate ? moment(payment.dueDate).format('YYYY-MM-DD') : '',
        paidDate: payment.paidDate ? moment(payment.paidDate).format('YYYY-MM-DD') : '',
        transactionId: payment.transactionId || '',
        notes: payment.notes || '',
        taxAmount: payment.taxAmount || '',
        discountAmount: payment.discountAmount || '',
        gstRate: payment.gstRate || '18'
      });
    } else {
      setEditingPayment(null);
      setFormData({
        client: '',
        project: '',
        description: '',
        totalAmount: '',
        paidAmount: '',
        paymentMethod: 'bank-transfer',
        dueDate: '',
        paidDate: '',
        transactionId: '',
        notes: '',
        taxAmount: '',
        discountAmount: '',
        gstRate: '18'
      });
    }
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPayment(null);
    setSaving(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    setFormData(prev => ({
      ...prev,
      client: clientId,
      project: '' // Reset project when client changes
    }));
  };

  const getClientProjects = () => {
    if (!formData.client) return [];
    return projects.filter(project => project.client?._id === formData.client);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!formData.client || !formData.project || !formData.description.trim() || 
        !formData.totalAmount || !formData.dueDate) {
      toast.error('Please fill all required fields');
      setSaving(false);
      return;
    }

    const totalAmount = Number(formData.totalAmount);
    const paidAmount = Number(formData.paidAmount || 0);

    if (totalAmount <= 0) {
      toast.error('Total amount must be greater than 0');
      setSaving(false);
      return;
    }

    if (paidAmount > totalAmount) {
      toast.error('Paid amount cannot be greater than total amount');
      setSaving(false);
      return;
    }

    try {
      console.log('💾 Saving payment:', formData);

      const paymentData = {
        client: formData.client,
        project: formData.project,
        description: formData.description.trim(),
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        paymentMethod: formData.paymentMethod,
        dueDate: formData.dueDate,
        paidDate: formData.paidDate || undefined,
        transactionId: formData.transactionId.trim(),
        notes: formData.notes.trim(),
        taxAmount: Number(formData.taxAmount || 0),
        discountAmount: Number(formData.discountAmount || 0),
        gstRate: Number(formData.gstRate || 18)
      };

      console.log('📤 Final payment data:', paymentData);

      let response;
      if (editingPayment) {
        response = await paymentAPI.update(editingPayment._id, paymentData);
      } else {
        response = await paymentAPI.create(paymentData);
      }

      console.log('✅ Payment save response:', response.data);

      if (response.data.success) {
        toast.success(editingPayment ? 'Payment updated successfully!' : 'Payment record created successfully!');
        handleModalClose();
        fetchPayments();
      } else {
        toast.error(response.data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('❌ Payment save error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save payment';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        const response = await paymentAPI.delete(id);
        if (response.data.success) {
          toast.success('Payment record deleted successfully');
          fetchPayments();
        } else {
          toast.error(response.data.message || 'Failed to delete payment');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete payment');
      }
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'pending': 'warning',
      'partial': 'info',
      'paid': 'success',
      'overdue': 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPaymentMethodBadge = (method) => {
    const variants = {
      'cash': 'success',
      'bank-transfer': 'primary',
      'cheque': 'info',
      'online': 'warning',
      'upi': 'success',
      'card': 'info'
    };
    return <Badge bg={variants[method] || 'secondary'}>{method}</Badge>;
  };

  return (
    <Container fluid>
      <div className="page-title">
        <i className="fas fa-credit-card me-2"></i>
        Payment Management
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
              placeholder="Search payments..."
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
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </Form.Select>
        </Col>
        <Col lg={5} className="text-end">
          <Button variant="primary" onClick={() => handleModalShow()}>
            <i className="fas fa-plus me-2"></i>
            Add Payment Record
          </Button>
        </Col>
      </Row>

      {/* Debug Info */}
      {/* <Row className="mb-3">
        <Col>
          <Alert variant="info">
            <small>
              <strong>Debug Info:</strong> 
              Total Payments: {pagination.total} | 
              Current Page: {pagination.page} | 
              Loading: {loading ? 'Yes' : 'No'} | 
              Clients Available: {clients.length} | 
              Projects Available: {projects.length}
            </small>
          </Alert>
        </Col>
      </Row> */}

      {/* Payments Table */}
      <Card className="custom-table">
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Payment Records ({pagination.total})
          </h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading payments...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Client</th>
                      <th>Project</th>
                      <th>Description</th>
                      <th>Total Amount</th>
                      <th>Paid Amount</th>
                      <th>Due Amount</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          <i className="fas fa-credit-card fa-2x text-muted mb-3"></i>
                          <h5>No Payment Records Found</h5>
                          <p className="text-muted">
                            {searchTerm || statusFilter 
                              ? 'No payments match your current filters.' 
                              : 'Click "Add Payment Record" to create your first payment record.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment._id}>
                          <td>
                            <strong className="text-primary">{payment.invoiceNumber}</strong>
                          </td>
                          <td>
                            <div className="fw-semibold">{payment.client?.companyName}</div>
                            <small className="text-muted">{payment.client?.clientId}</small>
                          </td>
                          <td>
                            <div className="fw-semibold">{payment.project?.projectName}</div>
                            <small className="text-muted">{payment.project?.projectId}</small>
                          </td>
                          <td>
                            <div className="fw-semibold">{payment.description}</div>
                            {payment.notes && (
                              <small className="text-muted">{payment.notes.substring(0, 50)}...</small>
                            )}
                          </td>
                          <td>₹{payment.totalAmount?.toLocaleString('en-IN')}</td>
                          <td>₹{payment.paidAmount?.toLocaleString('en-IN')}</td>
                          <td>₹{payment.dueAmount?.toLocaleString('en-IN')}</td>
                          <td>{getStatusBadge(payment.paymentStatus)}</td>
                          <td>
                            {payment.dueDate 
                              ? moment(payment.dueDate).format('DD MMM YYYY')
                              : '-'
                            }
                            {payment.paymentStatus === 'overdue' && (
                              <div>
                                <small className="text-danger">
                                  {Math.ceil((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24))} days overdue
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="btn-group">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-1"
                                onClick={() => handleModalShow(payment)}
                                title="Edit Payment"
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(payment._id)}
                                title="Delete Payment"
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

      {/* Add/Edit Payment Modal */}
      <Modal show={showModal} onHide={handleModalClose} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${editingPayment ? 'fa-edit' : 'fa-plus'} me-2`}></i>
            {editingPayment ? 'Edit Payment Record' : 'Add Payment Record'}
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Debug Form Data */}
            {/* <Alert variant="light">
              <small>
                <strong>Form Debug:</strong> 
                Client: {formData.client || 'Not Selected'} | 
                Project: {formData.project || 'Not Selected'} | 
                Total Amount: {formData.totalAmount || 'Empty'} | 
                Saving: {saving ? 'Yes' : 'No'}
              </small>
            </Alert> */}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Client <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="client"
                    value={formData.client}
                    onChange={handleClientChange}
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Project <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="project"
                    value={formData.project}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.client}
                    className={!formData.project ? 'is-invalid' : ''}
                  >
                    <option value="">Select Project</option>
                    {getClientProjects().map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.projectName} ({project.projectId})
                      </option>
                    ))}
                  </Form.Select>
                  {!formData.project && <div className="invalid-feedback">Project selection is required</div>}
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
                placeholder="Enter payment description (e.g., Project milestone payment, Final payment, etc.)"
                className={!formData.description ? 'is-invalid' : ''}
              />
              {!formData.description && <div className="invalid-feedback">Description is required</div>}
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Total Amount (₹) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="Enter total amount"
                    className={!formData.totalAmount ? 'is-invalid' : ''}
                  />
                  {!formData.totalAmount && <div className="invalid-feedback">Total amount is required</div>}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Paid Amount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="paidAmount"
                    value={formData.paidAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter paid amount (if any)"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Amount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.totalAmount && formData.paidAmount ? 
                          (Number(formData.totalAmount) - Number(formData.paidAmount || 0)).toFixed(2) : 
                          formData.totalAmount || '0'}
                    disabled
                    className="bg-light"
                  />
                  <Form.Text className="text-muted">
                    Automatically calculated
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online Payment</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    required
                    className={!formData.dueDate ? 'is-invalid' : ''}
                  />
                  {!formData.dueDate && <div className="invalid-feedback">Due date is required</div>}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Paid Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="paidDate"
                    value={formData.paidDate}
                    onChange={handleInputChange}
                    disabled={!formData.paidAmount || formData.paidAmount === '0'}
                  />
                  <Form.Text className="text-muted">
                    Only required if payment is made
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Transaction ID</Form.Label>
                  <Form.Control
                    type="text"
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={handleInputChange}
                    placeholder="Enter transaction/reference ID"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Tax Amount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="taxAmount"
                    value={formData.taxAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Tax amount"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount Amount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="discountAmount"
                    value={formData.discountAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Discount amount"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>GST Rate (%)</Form.Label>
                  <Form.Control
                    type="number"
                    name="gstRate"
                    value={formData.gstRate}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="GST rate"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about this payment..."
              />
            </Form.Group>
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose} disabled={saving}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={saving || !formData.client || !formData.project || !formData.description || !formData.totalAmount || !formData.dueDate}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {editingPayment ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {editingPayment ? 'Update Payment' : 'Create Payment Record'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PaymentList;
