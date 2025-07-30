import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import { messageAPI } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const MessageList = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    messageType: '',
    priority: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,  // Increased limit to show more messages
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchMessages();
  }, [pagination.page, filters]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      console.log('🔄 Admin fetching messages with filters:', filters);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      console.log('📤 Message API params:', params);

      const response = await messageAPI.getAll(params);
      console.log('✅ Admin Messages API Response:', response.data);
      
      if (response.data.success) {
        setMessages(response.data.messages || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
        
        console.log(`📋 Admin loaded ${response.data.messages?.length || 0} messages (total: ${response.data.pagination?.total || 0})`);
        
        // Debug: Log message types for admin
        if (response.data.messages?.length > 0) {
          console.log('📨 Message breakdown:');
          const breakdown = response.data.messages.reduce((acc, msg) => {
            const key = `${msg.sender?.role || 'unknown'} → ${msg.recipient?.role || 'unknown'}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          console.log(breakdown);
        }
      } else {
        toast.error('Failed to fetch messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Admin fetch messages error:', error);
      toast.error(`Failed to fetch messages: ${error.response?.data?.message || error.message}`);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = async (message) => {
    setSelectedMessage(message);
    setShowModal(true);
    
    // Mark as read if unread and user is recipient
    if (message.status === 'unread') {
      try {
        await messageAPI.markAsRead(message._id);
        fetchMessages(); // Refresh to update status
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleReply = (message) => {
    setSelectedMessage(message);
    setReplyText('');
    setShowReplyModal(true);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      console.log('📤 Admin sending reply to message:', selectedMessage._id);
      await messageAPI.reply(selectedMessage._id, { message: replyText });
      toast.success('Reply sent successfully');
      setShowReplyModal(false);
      setReplyText('');
      fetchMessages();
    } catch (error) {
      console.error('❌ Reply error:', error);
      toast.error(`Failed to send reply: ${error.response?.data?.message || error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'unread': 'danger',
      'read': 'primary',
      'replied': 'success'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      'low': 'success',
      'medium': 'warning',
      'high': 'danger'
    };
    return <Badge bg={variants[priority] || 'secondary'}>{priority}</Badge>;
  };

  const getMessageTypeIcon = (type) => {
    const icons = {
      'general': 'fas fa-comment',
      'support': 'fas fa-headset',
      'project-update': 'fas fa-tasks',
      'payment': 'fas fa-credit-card',
      'urgent': 'fas fa-exclamation-triangle'
    };
    return icons[type] || 'fas fa-comment';
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': 'fas fa-user-shield text-primary',
      'client': 'fas fa-building text-info',
      'employee': 'fas fa-user-tie text-success'
    };
    return icons[role] || 'fas fa-user text-muted';
  };

  return (
    <Container fluid>
      <div className="page-title">
        <i className="fas fa-envelope me-2"></i>
        Message Management
      </div>

      {/* Debug Info */}
      {/* <Row className="mb-3">
        <Col>
          <Alert variant="info">
            <small>
              <strong>Admin Debug:</strong> 
              Total Messages: {pagination.total} | 
              Current Page: {pagination.page} | 
              Loading: {loading ? 'Yes' : 'No'} |
              Filters: {JSON.stringify(filters)}
            </small>
          </Alert>
        </Col>
      </Row> */}

      {/* Filters */}
      <Row className="mb-4">
        <Col md={3}>
          <InputGroup>
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search messages..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={filters.messageType}
            onChange={(e) => handleFilterChange('messageType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="general">General</option>
            <option value="support">Support</option>
            <option value="project-update">Project Update</option>
            <option value="payment">Payment</option>
            <option value="urgent">Urgent</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Form.Select>
        </Col>
        <Col md={3} className="text-end">
          <Button variant="outline-primary" onClick={fetchMessages} disabled={loading}>
            <i className="fas fa-sync me-2"></i>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Col>
      </Row>

      {/* Messages Table */}
      <Card className="custom-table">
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            All Messages ({pagination.total})
          </h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading messages...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          <i className="fas fa-inbox fa-2x text-muted mb-3"></i>
                          <h5>No Messages Found</h5>
                          <p className="text-muted">
                            {Object.values(filters).some(f => f) 
                              ? 'No messages match your current filters.' 
                              : 'No messages available in the system.'}
                          </p>
                          <Button variant="outline-primary" onClick={fetchMessages}>
                            <i className="fas fa-sync me-2"></i>
                            Refresh Messages
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      messages.map((message) => (
                        <tr 
                          key={message._id} 
                          className={message.status === 'unread' ? 'fw-bold' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleViewMessage(message)}
                        >
                          <td>
                            <div className="d-flex align-items-center">
                              <i className={`${getMessageTypeIcon(message.messageType)} me-2 text-muted`}></i>
                              <div>
                                <div className="fw-semibold">{message.subject}</div>
                                <small className="text-muted">
                                  {message.message?.substring(0, 50)}...
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className={`${getRoleIcon(message.sender?.role)} me-2`}></i>
                              <div>
                                <div className="fw-semibold">{message.sender?.name || 'Unknown'}</div>
                                <small className="text-muted">{message.sender?.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className={`${getRoleIcon(message.recipient?.role)} me-2`}></i>
                              <div>
                                <div className="fw-semibold">{message.recipient?.name || 'Unknown'}</div>
                                <small className="text-muted">{message.recipient?.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {message.client ? (
                              <div>
                                <div className="fw-semibold">{message.client.companyName}</div>
                                <small className="text-muted">{message.client.clientId}</small>
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <Badge bg="light" text="dark">{message.messageType}</Badge>
                          </td>
                          <td>{getPriorityBadge(message.priority)}</td>
                          <td>{getStatusBadge(message.status)}</td>
                          <td>
                            <div>{moment(message.createdAt).format('DD MMM YYYY')}</div>
                            <small className="text-muted">
                              {moment(message.createdAt).format('HH:mm')}
                            </small>
                          </td>
                          <td>
                            <div className="btn-group">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewMessage(message);
                                }}
                                title="View Message"
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReply(message);
                                }}
                                title="Reply"
                              >
                                <i className="fas fa-reply"></i>
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
                    
                    {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
                      const pageNum = Math.max(1, pagination.page - 2) + index;
                      if (pageNum <= pagination.totalPages) {
                        return (
                          <li
                            key={pageNum}
                            className={`page-item ${pagination.page === pageNum ? 'active' : ''}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      }
                      return null;
                    })}
                    
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

      {/* View Message Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-envelope me-2"></i>
            Message Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMessage && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>From:</strong>
                  <div className="d-flex align-items-center mt-1">
                    <i className={`${getRoleIcon(selectedMessage.sender?.role)} me-2`}></i>
                    <div>
                      <div>{selectedMessage.sender?.name}</div>
                      <small className="text-muted">{selectedMessage.sender?.email}</small>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <strong>To:</strong>
                  <div className="d-flex align-items-center mt-1">
                    <i className={`${getRoleIcon(selectedMessage.recipient?.role)} me-2`}></i>
                    <div>
                      <div>{selectedMessage.recipient?.name}</div>
                      <small className="text-muted">{selectedMessage.recipient?.email}</small>
                    </div>
                  </div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Subject:</strong> {selectedMessage.subject}
                </Col>
                <Col md={6}>
                  <strong>Date:</strong> {moment(selectedMessage.createdAt).format('DD MMM YYYY, HH:mm')}
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <strong>Type:</strong> <Badge bg="light" text="dark">{selectedMessage.messageType}</Badge>
                </Col>
                <Col md={4}>
                  <strong>Priority:</strong> {getPriorityBadge(selectedMessage.priority)}
                </Col>
                <Col md={4}>
                  <strong>Status:</strong> {getStatusBadge(selectedMessage.status)}
                </Col>
              </Row>

              {selectedMessage.client && (
                <Row className="mb-3">
                  <Col>
                    <strong>Client:</strong> 
                    <div className="mt-1">
                      <i className="fas fa-building me-2 text-info"></i>
                      {selectedMessage.client.companyName} ({selectedMessage.client.clientId})
                    </div>
                  </Col>
                </Row>
              )}

              <hr />

              <div className="message-content">
                <strong>Message:</strong>
                <div className="mt-2 p-3 bg-light rounded">
                  <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                    {selectedMessage.message}
                  </p>
                </div>
              </div>

              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div className="mt-3">
                  <strong>Attachments:</strong>
                  <ul className="mt-2">
                    {selectedMessage.attachments.map((attachment, idx) => (
                      <li key={idx}>
                        <i className="fas fa-paperclip me-2"></i>
                        {attachment.originalName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => {
            setShowModal(false);
            handleReply(selectedMessage);
          }}>
            <i className="fas fa-reply me-2"></i>
            Reply
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reply Modal */}
      <Modal show={showReplyModal} onHide={() => setShowReplyModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-reply me-2"></i>
            Reply to Message
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={sendReply}>
          <Modal.Body>
            {selectedMessage && (
              <>
                <Alert variant="info">
                  <strong>Replying to:</strong> {selectedMessage.subject}
                  <br />
                  <strong>From:</strong> {selectedMessage.sender?.name} ({selectedMessage.sender?.role})
                  <br />
                  {selectedMessage.client && (
                    <>
                      <strong>Client:</strong> {selectedMessage.client.companyName}
                    </>
                  )}
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label>Your Reply *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    placeholder="Enter your reply here..."
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReplyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <i className="fas fa-paper-plane me-2"></i>
              Send Reply
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default MessageList;
