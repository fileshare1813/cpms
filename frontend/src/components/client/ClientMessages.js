import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Modal, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { messageAPI } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const ClientMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeForm, setComposeForm] = useState({
    subject: '',
    message: '',
    messageType: 'general',
    priority: 'medium'
  });

  useEffect(() => {
    if (user?.clientInfo) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const response = await messageAPI.getAll({ clientId: user.clientInfo._id });
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = async (message) => {
    setSelectedMessage(message);
    setShowModal(true);
    
    // Mark as read if unread
    if (message.status === 'unread') {
      try {
        await messageAPI.markAsRead(message._id);
        fetchMessages(); // Refresh to update status
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      // Find admin user (you might need to adjust this logic)
      const adminId = '507f1f77bcf86cd799439011'; // Replace with actual admin ID logic
      
      await messageAPI.send({
        ...composeForm,
        sender: user.id,
        recipient: adminId,
        client: user.clientInfo._id
      });
      
      toast.success('Message sent successfully');
      setShowComposeModal(false);
      setComposeForm({
        subject: '',
        message: '',
        messageType: 'general',
        priority: 'medium'
      });
      fetchMessages();
    } catch (error) {
      toast.error('Failed to send message');
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="fas fa-envelope me-2"></i>
          Messages ({messages.length})
        </h4>
        <Button variant="primary" onClick={() => setShowComposeModal(true)}>
          <i className="fas fa-plus me-2"></i>
          New Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-inbox fa-2x mb-3"></i>
          <h5>No Messages</h5>
          <p className="mb-0">You don't have any messages yet.</p>
        </Alert>
      ) : (
        <Card className="shadow-sm">
          <Card.Body>
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message._id} className={message.status === 'unread' ? 'fw-bold' : ''}>
                    <td>
                      <i className={`${getMessageTypeIcon(message.messageType)} me-2 text-muted`}></i>
                      {message.subject}
                    </td>
                    <td>
                      <Badge bg="light" text="dark">{message.messageType}</Badge>
                    </td>
                    <td>{getPriorityBadge(message.priority)}</td>
                    <td>{moment(message.createdAt).format('DD MMM YYYY, HH:mm')}</td>
                    <td>{getStatusBadge(message.status)}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleViewMessage(message)}
                      >
                        <i className="fas fa-eye me-1"></i>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* View Message Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`${selectedMessage ? getMessageTypeIcon(selectedMessage.messageType) : 'fas fa-envelope'} me-2`}></i>
            {selectedMessage?.subject}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMessage && (
            <div>
              <div className="mb-3">
                <div className="row">
                  <div className="col-md-6">
                    <strong>From:</strong> {selectedMessage.sender?.name || 'Unknown'}
                  </div>
                  <div className="col-md-6">
                    <strong>Date:</strong> {moment(selectedMessage.createdAt).format('DD MMM YYYY, HH:mm')}
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-md-6">
                    <strong>Type:</strong> <Badge bg="light" text="dark">{selectedMessage.messageType}</Badge>
                  </div>
                  <div className="col-md-6">
                    <strong>Priority:</strong> {getPriorityBadge(selectedMessage.priority)}
                  </div>
                </div>
              </div>
              
              <hr />
              
              <div className="message-content">
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedMessage.message}</p>
              </div>

              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div>
                  <hr />
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
        </Modal.Footer>
      </Modal>

      {/* Compose Message Modal */}
      <Modal show={showComposeModal} onHide={() => setShowComposeModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-paper-plane me-2"></i>
            New Message
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSendMessage}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Subject *</Form.Label>
              <Form.Control
                type="text"
                value={composeForm.subject}
                onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})}
                required
                placeholder="Enter message subject"
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Message Type</Form.Label>
                  <Form.Select
                    value={composeForm.messageType}
                    onChange={(e) => setComposeForm({...composeForm, messageType: e.target.value})}
                  >
                    <option value="general">General</option>
                    <option value="support">Support</option>
                    <option value="project-update">Project Update</option>
                    <option value="payment">Payment</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={composeForm.priority}
                    onChange={(e) => setComposeForm({...composeForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Message *</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={composeForm.message}
                onChange={(e) => setComposeForm({...composeForm, message: e.target.value})}
                required
                placeholder="Enter your message here..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowComposeModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <i className="fas fa-paper-plane me-2"></i>
              Send Message
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientMessages;
