import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form, Alert, Tab, Tabs } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { projectAPI, messageAPI, clientAPI, userAPI } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState({
    projects: false,
    messages: false,
    sendingMessage: false
  });

  // Message Modal States
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [availableClients, setAvailableClients] = useState([]);
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    messageType: 'general',
    priority: 'medium',
    recipientType: 'admin', // 'admin' or 'client'
    clientId: ''
  });

  useEffect(() => {
    if (user?.employeeInfo) {
      fetchData();
      fetchClients(); // Fetch available clients for messaging
    }
  }, [user, activeTab]);

  const fetchClients = async () => {
    try {
      console.log('🔄 Fetching available clients for employee...');
      // Get clients from projects assigned to this employee
      const projectsResponse = await projectAPI.getAll({ employeeId: user.employeeInfo._id });
      const employeeProjects = projectsResponse.data.projects || [];
      
      // Extract unique clients from projects with detailed info
      const uniqueClientIds = [...new Set(
        employeeProjects
          .filter(project => project.client && project.client._id)
          .map(project => project.client._id)
      )];
      
      // Fetch detailed client information for each unique client
      const clientPromises = uniqueClientIds.map(async (clientId) => {
        try {
          const clientResponse = await clientAPI.getById(clientId);
          return clientResponse.data.client;
        } catch (error) {
          console.error(`Failed to fetch client ${clientId}:`, error);
          return null;
        }
      });
      
      const detailedClients = await Promise.all(clientPromises);
      const validClients = detailedClients.filter(client => client !== null);
      
      setAvailableClients(validClients);
      console.log('✅ Available clients fetched:', validClients.length);
      console.log('👥 Clients data:', validClients);
    } catch (error) {
      console.error('❌ Failed to fetch clients:', error);
      setAvailableClients([]);
    }
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'overview' || activeTab === 'projects') {
        await fetchProjects();
      }
      if (activeTab === 'overview' || activeTab === 'messages') {
        await fetchMessages();
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchProjects = async () => {
    setLoading(prev => ({ ...prev, projects: true }));
    try {
      console.log('🔄 Fetching employee projects...');
      const response = await projectAPI.getAll({ employeeId: user.employeeInfo._id });
      setProjects(response.data.projects || []);
      console.log('✅ Projects fetched:', response.data.projects?.length || 0);
    } catch (error) {
      console.error('❌ Failed to fetch projects:', error);
      setProjects([]);
    } finally {
      setLoading(prev => ({ ...prev, projects: false }));
    }
  };

  const fetchMessages = async () => {
    setLoading(prev => ({ ...prev, messages: true }));
    try {
      console.log('🔄 Fetching employee messages...');
      console.log('👤 Current user info:', {
        userId: user._id,
        employeeId: user.employeeInfo._id,
        role: user.role
      });

      const response = await messageAPI.getAll({
        limit: 100
      });
      
      console.log('📨 Raw API response:', response.data);
      
      if (response.data.success) {
        const allMessages = response.data.messages || [];
        console.log(`📋 Total messages from API: ${allMessages.length}`);
        
        setMessages(allMessages);
        console.log('✅ Messages set in state:', allMessages.length);
        
      } else {
        console.log('❌ Failed to fetch messages:', response.data.message);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch messages:', error);
      setMessages([]);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

const handleSendMessage = async (e) => {
  e.preventDefault();
  
  // Enhanced validation with detailed logging
  // console.log('📋 Form validation - Current form state:', {
  //   subject: messageForm.subject,
  //   message: messageForm.message,
  //   subjectLength: messageForm.subject?.length,
  //   messageLength: messageForm.message?.length,
  //   recipientType: messageForm.recipientType,
  //   clientId: messageForm.clientId
  // });

  if (!messageForm.subject || !messageForm.subject.trim()) {
    toast.error('Subject is required');
    return;
  }

  if (!messageForm.message || !messageForm.message.trim()) {
    toast.error('Message is required');
    return;
  }

  const trimmedSubject = messageForm.subject.trim();
  const trimmedMessage = messageForm.message.trim();

  if (trimmedSubject.length < 3) {
    toast.error('Subject must be at least 3 characters long');
    return;
  }

  if (trimmedMessage.length < 10) {
    toast.error('Message must be at least 10 characters long');
    return;
  }

  if (messageForm.recipientType === 'client' && !messageForm.clientId) {
    toast.error('Please select a client to send message to');
    return;
  }

  setLoading(prev => ({ ...prev, sendingMessage: true }));

  try {
    let messageData = {
      subject: trimmedSubject,
      message: trimmedMessage,
      messageType: messageForm.messageType || 'general',
      priority: messageForm.priority || 'medium'
    };

    console.log('📤 Preparing message data:', {
      recipientType: messageForm.recipientType,
      clientId: messageForm.clientId,
      messageType: messageForm.messageType,
      subject: trimmedSubject,
      messageLength: trimmedMessage.length
    });

    if (messageForm.recipientType === 'admin') {
      // For admin messages, let backend handle finding admin user
      console.log('📤 Sending message to admin...');
      // Don't set recipient - let backend find admin
    } else if (messageForm.recipientType === 'client') {
      // For client messages, let backend handle finding client user
      console.log('📤 Sending message to client:', messageForm.clientId);
      
      const selectedClient = availableClients.find(client => client._id === messageForm.clientId);
      if (!selectedClient) {
        toast.error('Selected client not found');
        return;
      }

      // Let backend handle finding the client user - just pass the client ID
      messageData.client = selectedClient._id;
      messageData.recipient = 'CLIENT_USER_TO_BE_FOUND'; // Special marker for backend
      
      console.log('🎯 Sending to client with backend resolution');
    }

    console.log('📤 Final message data being sent:', messageData);
    
    const response = await messageAPI.send(messageData);
    
    console.log('📨 API Response:', response.data);
    
    if (response.data.success) {
      toast.success(`✅ Message sent successfully to ${messageForm.recipientType}!`);
      setShowMessageModal(false);
      setMessageForm({
        subject: '',
        message: '',
        messageType: 'general',
        priority: 'medium',
        recipientType: 'admin',
        clientId: ''
      });
      
      if (activeTab === 'messages' || activeTab === 'overview') {
        await fetchMessages();
      }
    } else {
      console.error('❌ API returned failure:', response.data);
      toast.error(`❌ ${response.data.message || 'Failed to send message'}`);
    }
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    console.error('❌ Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Enhanced error handling
    let errorMessage = 'Failed to send message';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      errorMessage = error.response.data.errors.join(', ');
    } else if (error.response?.data?.details) {
      errorMessage = `${error.response.data.message}: ${error.response.data.details}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error(`❌ ${errorMessage}`);
  } finally {
    setLoading(prev => ({ ...prev, sendingMessage: false }));
  }
};

// FIXED: Updated Quick Message Templates with proper validation
const quickMessageTemplates = {
  projectUpdateToAdmin: {
    subject: 'Project Status Update',
    message: 'Dear Admin,\n\nI wanted to provide an update on the project progress:\n\nProject Details:\n- Current Status: \n- Completed Tasks: \n- Upcoming Tasks: \n- Issues/Blockers: \n- Expected Completion: \n\nPlease let me know if you need any additional information.\n\nBest regards,\n' + (user?.employeeInfo?.name || 'Employee'),
    messageType: 'project-update',
    priority: 'medium',
    recipientType: 'admin',
    clientId: ''
  },
  leaveRequest: {
    subject: 'Leave Application Request',
    message: 'Dear Admin,\n\nI would like to request leave for the following period:\n\nLeave Details:\n- From Date: [Please specify]\n- To Date: [Please specify]\n- Total Days: [Please specify]\n- Reason: [Please specify reason]\n- Contact during leave: [Your contact info]\n\nI have ensured that all my current tasks will be completed or properly handed over before my leave period.\n\nPlease consider my application and let me know if you need any additional information.\n\nThank you for your consideration.\n\nBest regards,\n' + (user?.employeeInfo?.name || 'Employee'),
    messageType: 'leave-request',
    priority: 'medium',
    recipientType: 'admin',
    clientId: ''
  },
  clientQuestion: {
    subject: 'Project Clarification Required',
    message: 'Dear Client,\n\nI hope this message finds you well.\n\nI am currently working on your project and need some clarification on the following points:\n\n1. [Please specify your question]\n2. [Additional questions if any]\n\nYour input will help me ensure that the project meets your exact requirements and expectations.\n\nPlease let me know your thoughts at your earliest convenience.\n\nThank you for your time and cooperation.\n\nBest regards,\n' + (user?.employeeInfo?.name || 'Employee'),
    messageType: 'clarification',
    priority: 'medium',
    recipientType: 'client',
    clientId: availableClients.length > 0 ? availableClients[0]._id : ''
  }
};

  const handleViewMessage = async (message) => {
    setSelectedMessage(message);
    setShowViewModal(true);
    
    if (message.status === 'unread' && message.recipient?._id === user._id) {
      try {
        await messageAPI.markAsRead(message._id);
        fetchMessages();
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
      'completed': 'success',
      'in-progress': 'primary',
      'planning': 'info',
      'delayed': 'danger',
      'cancelled': 'secondary',
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

  const getRoleIcon = (role) => {
    const icons = {
      'admin': 'fas fa-user-shield text-primary',
      'client': 'fas fa-building text-info',
      'employee': 'fas fa-user-tie text-success'
    };
    return icons[role] || 'fas fa-user text-muted';
  };

  const renderOverview = () => (
    <div>
      {/* Enhanced Stats Cards with Animation */}
      <Row className="g-4 mb-5">
        <Col xl={4} lg={6} md={6} sm={6}>
          <Card className="stat-card h-100 border-0 shadow-sm position-relative overflow-hidden">
            <div className="stat-gradient position-absolute w-100 h-100" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              opacity: '0.1'
            }}></div>
            <Card.Body className="text-center position-relative">
              <div className="stat-icon-container mb-3 mx-auto d-flex align-items-center justify-content-center" style={{ 
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                width: '70px',
                height: '70px',
                borderRadius: '20px',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
              }}>
                <i className="fas fa-project-diagram text-white fa-xl"></i>
              </div>
              <h2 className="stat-number fw-bold text-primary mb-2" style={{ fontSize: '2.5rem' }}>
                {projects.length}
              </h2>
              <p className="stat-label text-muted mb-0 fw-semibold">Assigned Projects</p>
              <div className="stat-trend mt-2">
                <small className="text-success">
                  <i className="fas fa-arrow-up me-1"></i>
                  Active
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4} lg={6} md={6} sm={6}>
          <Card className="stat-card h-100 border-0 shadow-sm position-relative overflow-hidden">
            <div className="stat-gradient position-absolute w-100 h-100" style={{ 
              background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
              opacity: '0.1'
            }}></div>
            <Card.Body className="text-center position-relative">
              <div className="stat-icon-container mb-3 mx-auto d-flex align-items-center justify-content-center" style={{ 
                background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
                width: '70px',
                height: '70px',
                borderRadius: '20px',
                boxShadow: '0 8px 25px rgba(86, 171, 47, 0.3)'
              }}>
                <i className="fas fa-check-circle text-white fa-xl"></i>
              </div>
              <h2 className="stat-number fw-bold text-success mb-2" style={{ fontSize: '2.5rem' }}>
                {projects.filter(p => p.status === 'completed').length}
              </h2>
              <p className="stat-label text-muted mb-0 fw-semibold">Completed Projects</p>
              <div className="stat-trend mt-2">
                <small className="text-info">
                  <i className="fas fa-medal me-1"></i>
                  Finished
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4} lg={6} md={6} sm={6}>
          <Card className="stat-card h-100 border-0 shadow-sm position-relative overflow-hidden">
            <div className="stat-gradient position-absolute w-100 h-100" style={{ 
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
              opacity: '0.1'
            }}></div>
            <Card.Body className="text-center position-relative">
              <div className="stat-icon-container mb-3 mx-auto d-flex align-items-center justify-content-center" style={{ 
                background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                width: '70px',
                height: '70px',
                borderRadius: '20px',
                boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)'
              }}>
                <i className="fas fa-envelope text-white fa-xl"></i>
              </div>
              <h2 className="stat-number fw-bold text-info mb-2" style={{ fontSize: '2.5rem' }}>
                {messages.length}
              </h2>
              <p className="stat-label text-muted mb-0 fw-semibold">Messages</p>
              <div className="stat-trend mt-2">
                <small className="text-danger">
                  {messages.filter(m => m.status === 'unread' && m.recipient?._id === user._id).length > 0 && (
                    <>
                      <i className="fas fa-bell me-1"></i>
                      {messages.filter(m => m.status === 'unread' && m.recipient?._id === user._id).length} New
                    </>
                  )}
                  {messages.filter(m => m.status === 'unread' && m.recipient?._id === user._id).length === 0 && (
                    <>
                      <i className="fas fa-check me-1"></i>
                      All Read
                    </>
                  )}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Content Grid */}
      <Row className="g-4">
        {/* Recent Projects - Enhanced */}
        <Col xxl={8} xl={7} lg={12}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0 pb-0">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <div className="icon-wrapper me-3" style={{
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-tasks text-white"></i>
                  </div>
                  <div>
                    <h5 className="card-title mb-0 fw-bold">Assigned Projects</h5>
                    <small className="text-muted">Your current work assignments</small>
                  </div>
                </div>
                <Button variant="outline-primary" size="sm" onClick={() => setActiveTab('projects')}>
                  <i className="fas fa-eye me-1"></i>
                  View All
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {loading.projects ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h6>Loading projects...</h6>
                  <p className="text-muted small">Please wait while we fetch your assignments</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-5">
                  <div className="empty-state-icon mb-4" style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(45deg, #f8f9fa, #e9ecef)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <i className="fas fa-project-diagram fa-2x text-muted"></i>
                  </div>
                  <h6 className="fw-semibold">No Projects Assigned</h6>
                  <p className="text-muted">Your project assignments will appear here</p>
                  <Button variant="primary" size="sm" onClick={() => setShowMessageModal(true)}>
                    <i className="fas fa-envelope me-2"></i>
                    Send Message
                  </Button>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="border-0 fw-semibold">Project</th>
                        <th className="border-0 fw-semibold d-none d-md-table-cell">Client</th>
                        <th className="border-0 fw-semibold">Status</th>
                        <th className="border-0 fw-semibold d-none d-lg-table-cell">Progress</th>
                        <th className="border-0 fw-semibold d-none d-xl-table-cell">Deadline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.slice(0, 5).map((project) => (
                        <tr key={project._id} className="project-row">
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="project-avatar me-3" style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                color: 'white',
                                fontWeight: 'bold'
                              }}>
                                {project.projectName?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <div className="fw-semibold text-dark">{project.projectName}</div>
                                <small className="text-muted">{project.projectId}</small>
                              </div>
                            </div>
                          </td>
                          <td className="d-none d-md-table-cell">
                            <div className="fw-semibold">
                              {project.client?.companyName || 'N/A'}
                            </div>
                            <small className="text-muted">
                              {project.client?.clientId || ''}
                            </small>
                          </td>
                          <td>{getStatusBadge(project.status)}</td>
                          <td className="d-none d-lg-table-cell">
                            <div className="progress-container">
                              <div className="progress mb-1" style={{ height: '8px', borderRadius: '4px' }}>
                                <div
                                  className="progress-bar bg-primary"
                                  style={{ width: `${project.progress || 0}%` }}
                                ></div>
                              </div>
                              <small className="text-muted fw-semibold">{project.progress || 0}%</small>
                            </div>
                          </td>
                          <td className="d-none d-xl-table-cell">
                            <div className="deadline-info">
                              <div className="fw-semibold">
                                {project.estimatedEndDate 
                                  ? moment(project.estimatedEndDate).format('DD MMM')
                                  : '-'
                                }
                              </div>
                              <small className="text-muted">
                                {project.estimatedEndDate 
                                  ? moment(project.estimatedEndDate).format('YYYY')
                                  : ''
                                }
                              </small>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions - Enhanced */}
        <Col xxl={4} xl={5} lg={12}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0 pb-0">
              <div className="d-flex align-items-center">
                <div className="icon-wrapper me-3" style={{
                  background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-bolt text-white"></i>
                </div>
                <div>
                  <h5 className="card-title mb-0 fw-bold">Quick Actions</h5>
                  <small className="text-muted">Manage your work efficiently</small>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-3">
                <Button 
                  variant="primary" 
                  size="lg"
                  className="action-btn d-flex align-items-center justify-content-center py-3"
                  onClick={() => setShowMessageModal(true)}
                  disabled={loading.sendingMessage}
                  style={{
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <i className="fas fa-envelope me-3 fa-lg"></i>
                  <div className="text-start">
                    <div className="fw-bold">Send Messages</div>
                    <small className="opacity-75">Admin & client communication</small>
                  </div>
                </Button>
                
                <Button 
                  variant="outline-info" 
                  size="lg"
                  className="action-btn d-flex align-items-center justify-content-center py-3"
                  onClick={() => setActiveTab('projects')}
                  style={{
                    borderRadius: '12px',
                    borderWidth: '2px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <i className="fas fa-eye me-3 fa-lg"></i>
                  <div className="text-start">
                    <div className="fw-bold">View Projects</div>
                    <small className="opacity-75">{projects.length} assignments</small>
                  </div>
                </Button>
                
                <Button 
                  variant="outline-warning" 
                  size="lg"
                  className="action-btn d-flex align-items-center justify-content-between py-3"
                  onClick={() => setActiveTab('messages')}
                  style={{
                    borderRadius: '12px',
                    borderWidth: '2px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div className="d-flex align-items-center">
                    <i className="fas fa-comments me-3 fa-lg"></i>
                    <div className="text-start">
                      <div className="fw-bold">Messages</div>
                      <small className="opacity-75">{messages.length} conversations</small>
                    </div>
                  </div>
                  {messages.filter(m => m.status === 'unread' && m.recipient?._id === user._id).length > 0 && (
                    <Badge bg="danger" className="ms-2">
                      {messages.filter(m => m.status === 'unread' && m.recipient?._id === user._id).length}
                    </Badge>
                  )}
                </Button>

                {/* Quick Message Options */}
                <div className="quick-message-section">
  <hr className="my-3" />
  <h6 className="text-muted mb-3 fw-semibold">
    <i className="fas fa-bolt me-2"></i>
    Quick Messages
  </h6>
  
  <div className="d-grid gap-2">
    <Button 
      variant="outline-primary" 
      size="sm"
      className="quick-msg-btn d-flex align-items-center justify-content-start py-2"
      onClick={() => {
        setMessageForm({
          subject: 'Project Status Update',
          message: `Dear Admin,

I wanted to provide an update on the project progress:

Project Details:
- Current Status: [Please specify]
- Completed Tasks: [List completed tasks]
- Upcoming Tasks: [List upcoming tasks]
- Issues/Blockers: [Any issues or blockers]
- Expected Completion: [Timeline]

Please let me know if you need any additional information.

Best regards,
${user?.employeeInfo?.name || 'Employee'}`,
          messageType: 'project-update',
          priority: 'medium',
          recipientType: 'admin',
          clientId: ''
        });
        setShowMessageModal(true);
      }}
      style={{ borderRadius: '8px' }}
    >
      <i className="fas fa-chart-line me-2 text-primary"></i>
      <small>Project Update to Admin</small>
    </Button>
    
    <Button 
      variant="outline-info" 
      size="sm"
      className="quick-msg-btn d-flex align-items-center justify-content-start py-2"
      onClick={() => {
        setMessageForm({
          subject: 'Leave Application Request',
          message: `Dear Admin,

I would like to request leave for the following period:

Leave Details:
- From Date: [Please specify]
- To Date: [Please specify]  
- Total Days: [Please specify]
- Reason: [Please specify reason]
- Contact during leave: [Your contact info]

I have ensured that all my current tasks will be completed or properly handed over before my leave period.

Please consider my application and let me know if you need any additional information.

Thank you for your consideration.

Best regards,
${user?.employeeInfo?.name || 'Employee'}`,
          messageType: 'leave-request',
          priority: 'medium',
          recipientType: 'admin',
          clientId: ''
        });
        setShowMessageModal(true);
      }}
      style={{ borderRadius: '8px' }}
    >
      <i className="fas fa-calendar-times me-2 text-info"></i>
      <small>Leave Request</small>
    </Button>
    
    {availableClients.length > 0 && (
      <Button 
        variant="outline-success" 
        size="sm"
        className="quick-msg-btn d-flex align-items-center justify-content-start py-2"
        onClick={() => {
          setMessageForm({
            subject: 'Project Clarification Required',
            message: `Dear Client,

I hope this message finds you well.

I am currently working on your project and need some clarification on the following points:

1. [Please specify your question]
2. [Additional questions if any]

Your input will help me ensure that the project meets your exact requirements and expectations.

Please let me know your thoughts at your earliest convenience.

Thank you for your time and cooperation.

Best regards,
${user?.employeeInfo?.name || 'Employee'}`,
            messageType: 'clarification',
            priority: 'medium',
            recipientType: 'client',
            clientId: availableClients[0]._id
          });
          setShowMessageModal(true);
        }}
        style={{ borderRadius: '8px' }}
      >
        <i className="fas fa-question-circle me-2 text-success"></i>
        <small>Ask Client Question</small>
      </Button>
    )}
  </div>
</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderProjects = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-transparent border-0">
        <div className="d-flex align-items-center">
          <div className="icon-wrapper me-3" style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            width: '50px',
            height: '50px',
            borderRadius: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-project-diagram text-white fa-lg"></i>
          </div>
          <div>
            <h4 className="mb-0 fw-bold">My Assigned Projects</h4>
            <small className="text-muted">Track and manage your project assignments</small>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {loading.projects ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h6>Loading projects...</h6>
            <p className="text-muted">Please wait while we fetch your assignments</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-5">
            <div className="empty-state-icon mb-4 mx-auto" style={{
              width: '120px',
              height: '120px',
              background: 'linear-gradient(45deg, #f8f9fa, #e9ecef)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-project-diagram fa-3x text-muted"></i>
            </div>
            <h5 className="fw-bold mb-3">No Projects Assigned</h5>
            <p className="text-muted mb-4">Contact admin if you're expecting project assignments.</p>
            <Button variant="primary" onClick={() => setShowMessageModal(true)}>
              <i className="fas fa-envelope me-2"></i>
              Send Message
            </Button>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="border-0 fw-semibold">Project ID</th>
                  <th className="border-0 fw-semibold">Name</th>
                  <th className="border-0 fw-semibold d-none d-md-table-cell">Client</th>
                  <th className="border-0 fw-semibold d-none d-lg-table-cell">Service Type</th>
                  <th className="border-0 fw-semibold">Status</th>
                  <th className="border-0 fw-semibold d-none d-xl-table-cell">Progress</th>
                  <th className="border-0 fw-semibold d-none d-xxl-table-cell">Start Date</th>
                  <th className="border-0 fw-semibold d-none d-xxl-table-cell">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project._id} className="project-row">
                    <td>
                      <Badge bg="primary" className="px-3 py-2 fw-bold">
                        {project.projectId}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="project-avatar me-3" style={{
                          width: '45px',
                          height: '45px',
                          background: 'linear-gradient(45deg, #667eea, #764ba2)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          color: 'white',
                          fontWeight: 'bold'
                        }}>
                          {project.projectName?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="fw-semibold text-dark">{project.projectName}</div>
                          <small className="text-muted">{project.description?.substring(0, 50)}...</small>
                        </div>
                      </div>
                    </td>
                    <td className="d-none d-md-table-cell">
                      <div className="fw-semibold">
                        {project.client?.companyName || 'N/A'}
                      </div>
                      <small className="text-muted">
                        {project.client?.clientId || ''}
                      </small>
                    </td>
                    <td className="d-none d-lg-table-cell">
                      <Badge bg="light" text="dark" className="px-3 py-2">
                        {project.serviceType}
                      </Badge>
                    </td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td className="d-none d-xl-table-cell">
                      <div className="progress-container">
                        <div className="progress mb-1" style={{ height: '10px', borderRadius: '5px' }}>
                          <div
                            className="progress-bar bg-primary"
                            style={{ width: `${project.progress || 0}%` }}
                          ></div>
                        </div>
                        <small className="text-muted fw-semibold">{project.progress || 0}%</small>
                      </div>
                    </td>
                    <td className="d-none d-xxl-table-cell">
                      <div className="date-info">
                        <div className="fw-semibold">
                          {moment(project.startDate).format('DD MMM YYYY')}
                        </div>
                      </div>
                    </td>
                    <td className="d-none d-xxl-table-cell">
                      <div className="date-info">
                        <div className="fw-semibold">
                          {moment(project.estimatedEndDate).format('DD MMM YYYY')}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  const renderMessages = () => (
    <div>
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-4 gap-3">
        <div className="d-flex align-items-center">
          <div className="icon-wrapper me-3" style={{
            background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
            width: '50px',
            height: '50px',
            borderRadius: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-envelope text-white fa-lg"></i>
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Messages & Conversations</h4>
            <small className="text-muted">Communicate with admin and clients</small>
          </div>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowMessageModal(true)}
          disabled={loading.sendingMessage}
          className="rounded-pill px-4"
        >
          <i className="fas fa-plus me-2"></i>
          {loading.sendingMessage ? 'Sending...' : 'New Message'}
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading.messages ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h6>Loading messages...</h6>
              <p className="text-muted">Please wait while we fetch your conversations</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-5">
              <div className="empty-state-icon mb-4 mx-auto" style={{
                width: '120px',
                height: '120px',
                background: 'linear-gradient(45deg, #f8f9fa, #e9ecef)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-inbox fa-3x text-muted"></i>
              </div>
              <h5 className="fw-bold mb-3">No Messages</h5>
              <p className="text-muted mb-4">Start a conversation with admin or clients by sending a message.</p>
              <Button 
                variant="primary" 
                onClick={() => setShowMessageModal(true)}
                disabled={loading.sendingMessage}
                className="rounded-pill px-4"
              >
                <i className="fas fa-envelope me-2"></i>
                Send Message
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0 fw-semibold">Subject</th>
                    <th className="border-0 fw-semibold d-none d-md-table-cell">From/To</th>
                    <th className="border-0 fw-semibold d-none d-lg-table-cell">Type</th>
                    <th className="border-0 fw-semibold d-none d-lg-table-cell">Priority</th>
                    <th className="border-0 fw-semibold">Status</th>
                    <th className="border-0 fw-semibold d-none d-xl-table-cell">Date</th>
                    <th className="border-0 fw-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr 
                      key={message._id} 
                      className={`message-row ${message.status === 'unread' && message.recipient?._id === user._id ? 'fw-bold' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleViewMessage(message)}
                    >
                      <td>
                        <div className="d-flex align-items-start">
                          {message.replyTo && (
                            <i className="fas fa-reply me-2 text-primary mt-1" title="This is a reply"></i>
                          )}
                          <div className="flex-grow-1">
                            <div className="fw-semibold text-dark mb-1">{message.subject}</div>
                            <small className="text-muted">
                              {message.message?.substring(0, 50)}...
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="d-none d-md-table-cell">
                        <div className="d-flex align-items-center">
                          {message.sender?._id === user._id ? (
                            <>
                              <i className={`${getRoleIcon(message.recipient?.role)} me-2`}></i>
                              <div>
                                <span className="text-success small">To: </span>
                                <div className="fw-semibold">{message.recipient?.name || 'Unknown'}</div>
                                <small className="text-muted">{message.recipient?.role}</small>
                              </div>
                            </>
                          ) : (
                            <>
                              <i className={`${getRoleIcon(message.sender?.role)} me-2`}></i>
                              <div>
                                <span className="text-primary small">From: </span>
                                <div className="fw-semibold">{message.sender?.name || 'Unknown'}</div>
                                <small className="text-muted">{message.sender?.role}</small>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell">
                        <Badge bg="light" text="dark" className="px-3 py-2">
                          {message.messageType}
                        </Badge>
                      </td>
                      <td className="d-none d-lg-table-cell">{getPriorityBadge(message.priority)}</td>
                      <td>{getStatusBadge(message.status)}</td>
                      <td className="d-none d-xl-table-cell">
                        <div className="fw-semibold">
                          {moment(message.createdAt).format('DD MMM YYYY')}
                        </div>
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
                            className="rounded-pill me-1"
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
                            className="rounded-pill"
                          >
                            <i className="fas fa-reply"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );

  if (!user?.employeeInfo) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-4" style={{ width: '4rem', height: '4rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="fw-bold">Loading Employee Dashboard</h5>
          <p className="text-muted">Please wait while we prepare your workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-portal min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Enhanced Header */}
      <div className="employee-header shadow-sm" style={{ backgroundColor: 'white' }}>
        <Container fluid className="py-4">
          <Row className="align-items-center">
            <Col lg={8} md={6}>
              <div className="d-flex align-items-center">
                <div className="employee-avatar me-4" style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'white',
                  boxShadow: '0 8px 25px rgba(86, 171, 47, 0.3)'
                }}>
                  {user.employeeInfo.name?.charAt(0) || 'E'}
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-success d-flex align-items-center">
                    <i className="fas fa-user-tie me-3"></i>
                    {user.employeeInfo.name}
                  </h2>
                  <div className="d-flex flex-wrap gap-3 text-muted small">
                    <span>
                      <i className="fas fa-id-badge me-1"></i>
                      Employee ID: <strong>{user.employeeInfo.employeeId}</strong>
                    </span>
                    <span>
                      <i className="fas fa-building me-1"></i>
                      Department: <strong>{user.employeeInfo.department}</strong>
                    </span>
                    <span>
                      <i className="fas fa-briefcase me-1"></i>
                      Designation: <strong>{user.employeeInfo.designation}</strong>
                    </span>
                    <span>
                      <i className="fas fa-user-circle me-1"></i>
                      User: <strong>{user.name}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={4} md={6} className="text-end">
              <Button 
                variant="outline-danger" 
                onClick={logout}
                className="rounded-pill px-4"
                style={{ borderWidth: '2px' }}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Enhanced Navigation Tabs */}
      <div className="employee-nav shadow-sm" style={{ backgroundColor: 'white', borderTop: '1px solid #e9ecef' }}>
        <Container fluid>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="custom-nav-tabs border-0"
            style={{ borderBottom: 'none' }}
          >
            <Tab 
              eventKey="overview" 
              title={
                <span className="d-flex align-items-center px-3 py-2">
                  <i className="fas fa-tachometer-alt me-2"></i>
                  <span className="d-none d-sm-inline">Overview</span>
                </span>
              }
            />
            <Tab 
              eventKey="projects" 
              title={
                <span className="d-flex align-items-center px-3 py-2">
                  <i className="fas fa-project-diagram me-2"></i>
                  <span className="d-none d-sm-inline">Projects</span>
                  <Badge bg="primary" className="ms-2 d-none d-md-inline">
                    {projects.length}
                  </Badge>
                </span>
              }
            />
            <Tab 
              eventKey="messages" 
              title={
                <span className="d-flex align-items-center px-3 py-2">
                  <i className="fas fa-envelope me-2"></i>
                  <span className="d-none d-sm-inline">Messages</span>
                  <Badge bg="info" className="ms-2 d-none d-md-inline">
                    {messages.length}
                  </Badge>
                  {messages.filter(m => m.status === 'unread' && m.recipient?._id === user._id).length > 0 && (
                    <Badge bg="danger" className="ms-1">
                      {messages.filter(m => m.status === 'unread' && m.recipient?._id === user._id).length}
                    </Badge>
                  )}
                </span>
              }
            />
          </Tabs>
        </Container>
      </div>

      {/* Main Content with Enhanced Spacing */}
      <Container fluid className="py-4">
        <div className="content-wrapper">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'projects' && renderProjects()}
          {activeTab === 'messages' && renderMessages()}
        </div>
      </Container>

      {/* Enhanced Send Message Modal */}
      <Modal show={showMessageModal} onHide={() => setShowMessageModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center">
            <div className="icon-wrapper me-3" style={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-envelope text-white"></i>
            </div>
            Send Message
          </Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSendMessage}>
          <Modal.Body className="px-4">
            <Alert variant="info" className="border-0" style={{ 
              background: 'linear-gradient(45deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
              borderRadius: '12px'
            }}>
              <div className="d-flex align-items-center">
                <i className="fas fa-info-circle me-3 text-primary fa-lg"></i>
                <div>
                  <strong>Your message will be sent to the selected recipient.</strong>
                  <br />
                  <small>
                    From: {user.employeeInfo.name} ({user.employeeInfo.employeeId}) - {user.employeeInfo.department}
                  </small>
                </div>
              </div>
            </Alert>

            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Send Message To *</Form.Label>
                  <Form.Select
                    value={messageForm.recipientType}
                    onChange={(e) => {
                      setMessageForm({
                        ...messageForm, 
                        recipientType: e.target.value,
                        clientId: '' // Reset client selection when changing type
                      });
                    }}
                    required
                    className="form-control-lg rounded-3"
                  >
                    <option value="admin">📋 Admin Team</option>
                    <option value="client">🏢 Client</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {messageForm.recipientType === 'client' && (
              <Row className="g-3 mt-2">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Select Client *</Form.Label>
                    <Form.Select
                      value={messageForm.clientId}
                      onChange={(e) => setMessageForm({...messageForm, clientId: e.target.value})}
                      required={messageForm.recipientType === 'client'}
                      className="form-control-lg rounded-3"
                    >
                      <option value="">Choose a client...</option>
                      {availableClients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.companyName} ({client.clientId})
                        </option>
                      ))}
                    </Form.Select>
                    {availableClients.length === 0 && (
                      <Form.Text className="text-warning">
                        <i className="fas fa-exclamation-triangle me-1"></i>
                        No clients available. You can only message clients from your assigned projects.
                      </Form.Text>
                    )}
                    {messageForm.clientId && (
                      <Form.Text className="text-info">
                        <i className="fas fa-info-circle me-1"></i>
                        Backend will automatically find the client's user account for message delivery.
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
              </Row>
            )}

            <Row className="g-3 mt-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Message Type *</Form.Label>
                  <Form.Select
                    value={messageForm.messageType}
                    onChange={(e) => setMessageForm({...messageForm, messageType: e.target.value})}
                    required
                    className="form-control-lg rounded-3"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="project-update">Project Update</option>
                    {messageForm.recipientType === 'admin' && (
                      <option value="leave-request">Leave Request</option>
                    )}
                    {messageForm.recipientType === 'client' && (
                      <>
                        <option value="project-status">Project Status</option>
                        <option value="clarification">Clarification Needed</option>
                        <option value="delivery">Delivery Update</option>
                      </>
                    )}
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Priority *</Form.Label>
                  <Form.Select
                    value={messageForm.priority}
                    onChange={(e) => setMessageForm({...messageForm, priority: e.target.value})}
                    required
                    className="form-control-lg rounded-3"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3">
              <Form.Label className="fw-semibold">Subject *</Form.Label>
              <Form.Control
                type="text"
                value={messageForm.subject}
                onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                required
                placeholder="Enter message subject"
                maxLength={200}
                disabled={loading.sendingMessage}
                className="form-control-lg rounded-3"
              />
              <Form.Text className="text-muted">
                {messageForm.subject.length}/200 characters
              </Form.Text>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label className="fw-semibold">Message *</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={messageForm.message}
                onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                required
                placeholder="Enter your message here..."
                maxLength={5000}
                disabled={loading.sendingMessage}
                className="rounded-3"
                style={{ resize: 'none' }}
              />
              <Form.Text className="text-muted">
                {messageForm.message.length}/5000 characters
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          
          <Modal.Footer className="border-0 pt-0">
            <Button 
              variant="outline-secondary" 
              onClick={() => setShowMessageModal(false)}
              disabled={loading.sendingMessage}
              className="rounded-pill px-4"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={loading.sendingMessage || !messageForm.subject.trim() || !messageForm.message.trim()}
              className="rounded-pill px-4"
              style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                border: 'none'
              }}
            >
              {loading.sendingMessage ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Send Message
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Enhanced View Message Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center">
            <div className="icon-wrapper me-3" style={{
              background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-envelope text-white"></i>
            </div>
            Message Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4">
          {selectedMessage && (
            <div>
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <div className="info-card p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <strong className="text-primary">From:</strong>
                    <div className="d-flex align-items-center mt-2">
                      <i className={`${getRoleIcon(selectedMessage.sender?.role)} me-2 fa-lg`}></i>
                      <div>
                        <div className="fw-semibold">{selectedMessage.sender?.name}</div>
                        <small className="text-muted">{selectedMessage.sender?.email} ({selectedMessage.sender?.role})</small>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="info-card p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <strong className="text-primary">To:</strong>
                    <div className="d-flex align-items-center mt-2">
                      <i className={`${getRoleIcon(selectedMessage.recipient?.role)} me-2 fa-lg`}></i>
                      <div>
                        <div className="fw-semibold">{selectedMessage.recipient?.name}</div>
                        <small className="text-muted">{selectedMessage.recipient?.email} ({selectedMessage.recipient?.role})</small>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>

              <Row className="g-3 mb-4">
                <Col md={8}>
                  <div className="info-item">
                    <strong className="text-primary">Subject:</strong>
                    <div className="mt-1 d-flex align-items-center">
                      <span className="fw-semibold">{selectedMessage.subject}</span>
                      {selectedMessage.replyTo && (
                        <Badge bg="primary" className="ms-2">Reply</Badge>
                      )}
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="info-item">
                    <strong className="text-primary">Date:</strong>
                    <div className="mt-1 fw-semibold">
                      {moment(selectedMessage.createdAt).format('DD MMM YYYY, HH:mm')}
                    </div>
                  </div>
                </Col>
              </Row>

              <Row className="g-3 mb-4">
                <Col md={4}>
                  <div className="info-item">
                    <strong className="text-primary">Type:</strong>
                    <div className="mt-1">
                      <Badge bg="light" text="dark" className="px-3 py-2">
                        {selectedMessage.messageType}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="info-item">
                    <strong className="text-primary">Priority:</strong>
                    <div className="mt-1">{getPriorityBadge(selectedMessage.priority)}</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="info-item">
                    <strong className="text-primary">Status:</strong>
                    <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                  </div>
                </Col>
              </Row>

              {selectedMessage.client && (
                <Row className="mb-4">
                  <Col>
                    <div className="info-card p-3 rounded-3" style={{ backgroundColor: '#e3f2fd' }}>
                      <strong className="text-primary">Client:</strong> 
                      <div className="mt-2 d-flex align-items-center">
                        <i className="fas fa-building me-2 text-info fa-lg"></i>
                        <span className="fw-semibold">
                          {selectedMessage.client.companyName} ({selectedMessage.client.clientId})
                        </span>
                      </div>
                    </div>
                  </Col>
                </Row>
              )}

              <hr className="my-4" />

              <div className="message-content">
                <strong className="text-primary mb-3 d-block">Message:</strong>
                <div className="message-body p-4 rounded-3" style={{ 
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderLeft: '4px solid #56ab2f'
                }}>
                  <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0, lineHeight: '1.6' }}>
                    {selectedMessage.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowViewModal(false)}
            className="rounded-pill px-4"
          >
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowViewModal(false);
              handleReply(selectedMessage);
            }}
            className="rounded-pill px-4"
            style={{
              background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
              border: 'none'
            }}
          >
            <i className="fas fa-reply me-2"></i>
            Reply
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Enhanced Reply Modal */}
      <Modal show={showReplyModal} onHide={() => setShowReplyModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center">
            <div className="icon-wrapper me-3" style={{
              background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-reply text-white"></i>
            </div>
            Reply to Message
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={sendReply}>
          <Modal.Body className="px-4">
            {selectedMessage && (
              <>
                <Alert variant="info" className="border-0" style={{ 
                  background: 'linear-gradient(45deg, rgba(86, 171, 47, 0.1), rgba(168, 230, 207, 0.1))',
                  borderRadius: '12px'
                }}>
                  <div className="d-flex align-items-start">
                    <i className="fas fa-reply me-3 text-success fa-lg mt-1"></i>
                    <div>
                      <strong>Replying to:</strong> {selectedMessage.subject}
                      <br />
                      <strong>From:</strong> {selectedMessage.sender?.name} ({selectedMessage.sender?.role})
                      {selectedMessage.client && (
                        <>
                          <br />
                          <strong>Client:</strong> {selectedMessage.client.companyName}
                        </>
                      )}
                    </div>
                  </div>
                </Alert>

                <Form.Group>
                  <Form.Label className="fw-semibold">Your Reply *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    placeholder="Enter your reply here..."
                    className="rounded-3"
                    style={{ resize: 'none' }}
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button 
              variant="outline-secondary" 
              onClick={() => setShowReplyModal(false)}
              className="rounded-pill px-4"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              className="rounded-pill px-4"
              style={{
                background: 'linear-gradient(45deg, #56ab2f, #a8e6cf)',
                border: 'none'
              }}
            >
              <i className="fas fa-paper-plane me-2"></i>
              Send Reply
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Custom Styles */}
      <style jsx>{`
        .stat-card {
          transition: all 0.3s ease;
          border-radius: 20px !important;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
        }
        
        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
        
        .project-row:hover,
        .message-row:hover {
          background-color: rgba(86, 171, 47, 0.05) !important;
        }
        
        .custom-nav-tabs .nav-link {
          border: none !important;
          border-radius: 0 !important;
          color: #6c757d !important;
          font-weight: 600 !important;
          padding: 1rem 1.5rem !important;
          transition: all 0.3s ease !important;
        }
        
        .custom-nav-tabs .nav-link:hover {
          background-color: rgba(86, 171, 47, 0.1) !important;
          color: #56ab2f !important;
        }
        
        .custom-nav-tabs .nav-link.active {
          background: linear-gradient(45deg, #56ab2f, #a8e6cf) !important;
          color: white !important;
          border-radius: 12px 12px 0 0 !important;
        }
        
        .table th {
          background-color: #f8f9fa !important;
          font-weight: 600 !important;
          color: #495057 !important;
          border-bottom: 2px solid #dee2e6 !important;
        }
        
        .progress {
          background-color: rgba(86, 171, 47, 0.1) !important;
        }
        
        .empty-state-icon {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @media (max-width: 768px) {
          .stat-card {
            margin-bottom: 1rem;
          }
          
          .employee-header {
            padding: 1rem 0 !important;
          }
          
          .employee-avatar {
            width: 50px !important;
            height: 50px !important;
            font-size: 20px !important;
          }
          
          .stat-icon-container {
            width: 60px !important;
            height: 60px !important;
          }
          
          .stat-number {
            font-size: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeDashboard;