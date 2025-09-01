import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form, Alert, Tab, Tabs } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { projectAPI, paymentAPI, messageAPI } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const ClientDashboard = () => {
const { user, logout } = useAuth();
const [activeTab, setActiveTab] = useState('overview');
const [projects, setProjects] = useState([]);
const [payments, setPayments] = useState([]);
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState({
projects: false,
payments: false,
messages: false,
sendingMessage: false
});

  // Message Modal States
const [showMessageModal, setShowMessageModal] = useState(false);
const [showViewModal, setShowViewModal] = useState(false);
const [showReplyModal, setShowReplyModal] = useState(false);
const [selectedMessage, setSelectedMessage] = useState(null);
const [replyText, setReplyText] = useState('');
const [messageForm, setMessageForm] = useState({
subject: '',
message: '',
messageType: 'general',
priority: 'medium'
});

  useEffect(() => {
if (user?.clientInfo) {
fetchData();
}
}, [user, activeTab]);


const fetchData = async () => {
try {
if (activeTab === 'overview' || activeTab === 'projects') {
await fetchProjects();
}
if (activeTab === 'overview' || activeTab === 'payments') {
await fetchPayments();
}
if (activeTab === 'overview' || activeTab === 'messages') {
await fetchMessages();
}
} catch (error) {
toast.error('Failed to fetch data.');
}
};

  const fetchProjects = async () => {
setLoading(prev => ({ ...prev, projects: true }));
try {
const response = await projectAPI.getByClient(user.clientInfo._id);
setProjects(response.data.projects || []);
} catch (error) {
toast.error('Failed to fetch projects.');
setProjects([]);
} finally {
setLoading(prev => ({ ...prev, projects: false }));
}
};

  const fetchPayments = async () => {
setLoading(prev => ({ ...prev, payments: true }));
try {
const response = await paymentAPI.getByClient(user.clientInfo._id);
setPayments(response.data.payments || []);
} catch (error) {
toast.error('Failed to fetch payments.');
setPayments([]);
} finally {
setLoading(prev => ({ ...prev, payments: false }));
}
};

  const fetchMessages = async () => {
setLoading(prev => ({ ...prev, messages: true }));
try {
const response = await messageAPI.getAll({ limit: 100 });
if (response.data.success) {
setMessages(response.data.messages || []);
} else {
setMessages([]);
}
} catch (error) {
toast.error('Failed to fetch messages.');
setMessages([]);
} finally {
setLoading(prev => ({ ...prev, messages: false }));
}
};
// download invoice
      const handleInvoiceDownload = async (id, invoiceNumber) => {
  try {
    const response = await paymentAPI.generateInvoice(id); 
    const blob = new Blob([response.data], { type: 'application/pdf' }); // 👈 Blob type set
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber || 'invoice'}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Invoice downloaded successfully!');
  } catch (error) {
    toast.error('Failed to download invoice.');
    // optional: backend se error message show karne ke liye
    // toast.error(error.response?.data?.message || 'Failed to download invoice.');
  }
};

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(prev => ({ ...prev, sendingMessage: true }));

    try {
      const messageData = {
        subject: messageForm.subject.trim(),
        message: messageForm.message.trim(),
        messageType: messageForm.messageType,
        priority: messageForm.priority
      };

      const response = await messageAPI.send(messageData);
      
      if (response.data.success) {
        toast.success('✅ Message sent successfully to admin!');
        setShowMessageModal(false);
        setMessageForm({
          subject: '',
          message: '',
          messageType: 'general',
          priority: 'medium'
        });
        
        if (activeTab === 'messages' || activeTab === 'overview') {
          await fetchMessages();
        }
      } else {
        toast.error(`❌ ${response.data.message || 'Failed to send message'}`);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message || 
                          'Failed to send message';
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, sendingMessage: false }));
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
'paid': 'success',
'pending': 'warning',
'overdue': 'danger',
'partial': 'info',
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
        <Col xl={3} lg={6} md={6} sm={6}>
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
              <p className="stat-label text-muted mb-0 fw-semibold">Total Projects</p>
              <div className="stat-trend mt-2">
                <small className="text-success">
                  <i className="fas fa-arrow-up me-1"></i>
                  Active
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} lg={6} md={6} sm={6}>
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
              <p className="stat-label text-muted mb-0 fw-semibold">Completed</p>
              <div className="stat-trend mt-2">
                <small className="text-info">
                  <i className="fas fa-medal me-1"></i>
                  Finished
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} lg={6} md={6} sm={6}>
          <Card className="stat-card h-100 border-0 shadow-sm position-relative overflow-hidden">
            <div className="stat-gradient position-absolute w-100 h-100" style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              opacity: '0.1'
            }}></div>
            <Card.Body className="text-center position-relative">
              <div className="stat-icon-container mb-3 mx-auto d-flex align-items-center justify-content-center" style={{ 
                background: 'linear-gradient(45deg, #f093fb, #f5576c)',
                width: '70px',
                height: '70px',
                borderRadius: '20px',
                boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)'
              }}>
                <i className="fas fa-credit-card text-white fa-xl"></i>
              </div>
              <h2 className="stat-number fw-bold text-warning mb-2" style={{ fontSize: '2.5rem' }}>
                {payments.length}
              </h2>
              <p className="stat-label text-muted mb-0 fw-semibold">Total Invoices</p>
              <div className="stat-trend mt-2">
                <small className="text-warning">
                  <i className="fas fa-invoice me-1"></i>
                  Billing
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} lg={6} md={6} sm={6}>
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
                    <h5 className="card-title mb-0 fw-bold">Recent Projects</h5>
                    <small className="text-muted">Your active project portfolio</small>
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
                  <p className="text-muted small">Please wait while we fetch your projects</p>
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
                  <h6 className="fw-semibold">No Projects Yet</h6>
                  <p className="text-muted">Your projects will appear here once created</p>
                  <Button variant="primary" size="sm" onClick={() => setShowMessageModal(true)}>
                    <i className="fas fa-envelope me-2"></i>
                    Contact Admin
                  </Button>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="border-0 fw-semibold">Project</th>
                        <th className="border-0 fw-semibold d-none d-md-table-cell">Service</th>
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
                            <Badge bg="light" text="dark" className="px-3 py-2">
                              {project.serviceType}
                            </Badge>
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
                  <small className="text-muted">Manage your account efficiently</small>
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
                    <div className="fw-bold">
                      {loading.sendingMessage ? 'Sending...' : 'Message Admin'}
                    </div>
                    <small className="opacity-75">Get support & updates</small>
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
                    <small className="opacity-75">{projects.length} total projects</small>
                  </div>
                </Button>
                
                <Button 
                  variant="outline-success" 
                  size="lg"
                  className="action-btn d-flex align-items-center justify-content-center py-3"
                  onClick={() => setActiveTab('payments')}
                  style={{
                    borderRadius: '12px',
                    borderWidth: '2px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <i className="fas fa-credit-card me-3 fa-lg"></i>
                  <div className="text-start">
                    <div className="fw-bold">View Invoices</div>
                    <small className="opacity-75">{payments.length} payment records</small>
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
            <h4 className="mb-0 fw-bold">My Projects</h4>
            <small className="text-muted">Manage and track your project portfolio</small>
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
            <p className="text-muted">Please wait while we fetch your projects</p>
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
            <h5 className="fw-bold mb-3">No Projects Found</h5>
            <p className="text-muted mb-4">Contact admin to start your first project and begin your journey with us.</p>
            <Button variant="primary" onClick={() => setShowMessageModal(true)}>
              <i className="fas fa-envelope me-2"></i>
              Contact Admin
            </Button>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="border-0 fw-semibold">Project ID</th>
                  <th className="border-0 fw-semibold">Name</th>
                  <th className="border-0 fw-semibold d-none d-md-table-cell">Service Type</th>
                  <th className="border-0 fw-semibold">Status</th>
                  <th className="border-0 fw-semibold d-none d-lg-table-cell">Progress</th>
                  <th className="border-0 fw-semibold d-none d-xl-table-cell">Start Date</th>
                  <th className="border-0 fw-semibold d-none d-xl-table-cell">Deadline</th>
                  <th className="border-0 fw-semibold d-none d-xxl-table-cell">Budget</th>
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
                      <Badge bg="light" text="dark" className="px-3 py-2">
                        {project.serviceType}
                      </Badge>
                    </td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td className="d-none d-lg-table-cell">
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
                    <td className="d-none d-xl-table-cell">
                      <div className="date-info">
                        <div className="fw-semibold">
                          {moment(project.startDate).format('DD MMM YYYY')}
                        </div>
                      </div>
                    </td>
                    <td className="d-none d-xl-table-cell">
                      <div className="date-info">
                        <div className="fw-semibold">
                          {moment(project.estimatedEndDate).format('DD MMM YYYY')}
                        </div>
                      </div>
                    </td>
                    <td className="d-none d-xxl-table-cell">
                      <div className="fw-bold text-success">
                        ₹{project.budget?.toLocaleString('en-IN') || '0'}
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

  const renderPayments = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-transparent border-0">
        <div className="d-flex align-items-center">
          <div className="icon-wrapper me-3" style={{
            background: 'linear-gradient(45deg, #f093fb, #f5576c)',
            width: '50px',
            height: '50px',
            borderRadius: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-credit-card text-white fa-lg"></i>
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Payment History</h4>
            <small className="text-muted">Track your invoices and payment status</small>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {loading.payments ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h6>Loading payments...</h6>
            <p className="text-muted">Please wait while we fetch your payment history</p>
          </div>
        ) : payments.length === 0 ? (
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
              <i className="fas fa-credit-card fa-3x text-muted"></i>
            </div>
            <h5 className="fw-bold mb-3">No Payment Records</h5>
            <p className="text-muted">Payment history will appear here as invoices are generated.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="border-0 fw-semibold">Invoice #</th>
                  <th className="border-0 fw-semibold d-none d-md-table-cell">Project</th>
                  <th className="border-0 fw-semibold">Total Amount</th>
                  <th className="border-0 fw-semibold d-none d-lg-table-cell">Paid Amount</th>
                  <th className="border-0 fw-semibold d-none d-lg-table-cell">Due Amount</th>
                  <th className="border-0 fw-semibold">Status</th>
                  <th className="border-0 fw-semibold d-none d-xl-table-cell">Due Date</th>
                  <th className="border-0 fw-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id} className="payment-row">
                    <td>
                      <Badge bg="primary" className="px-3 py-2 fw-bold">
                        {payment.invoiceNumber}
                      </Badge>
                    </td>
                    <td className="d-none d-md-table-cell">
                      <div className="fw-semibold text-dark">
                        {payment.project?.projectName || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">
                        ₹{payment.totalAmount?.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="d-none d-lg-table-cell">
                      <div className="fw-semibold text-success">
                        ₹{payment.paidAmount?.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="d-none d-lg-table-cell">
                      <div className="fw-semibold text-danger">
                        ₹{payment.dueAmount?.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td>{getStatusBadge(payment.paymentStatus)}</td>
                    <td className="d-none d-xl-table-cell">
                      <div className="fw-semibold">
                        {moment(payment.dueDate).format('DD MMM YYYY')}
                      </div>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="rounded-pill"
                        onClick={() => handleInvoiceDownload(payment._id, payment.invoiceNumber)}
                        >
                        <i className="fas fa-download me-1"></i>
                        Download
                        </Button>
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
            <small className="text-muted">Communicate with your project team</small>
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
              <p className="text-muted mb-4">Start a conversation with admin by sending a message.</p>
              <Button 
                variant="primary" 
                onClick={() => setShowMessageModal(true)}
                disabled={loading.sendingMessage}
                className="rounded-pill px-4"
              >
                <i className="fas fa-envelope me-2"></i>
                Send First Message
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

  if (!user?.clientInfo) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-4" style={{ width: '4rem', height: '4rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="fw-bold">Loading Client Dashboard</h5>
          <p className="text-muted">Please wait while we prepare your workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-portal min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Enhanced Header */}
      <div className="client-header shadow-sm" style={{ backgroundColor: 'white' }}>
        <Container fluid className="py-4">
          <Row className="align-items-center">
            <Col lg={8} md={6}>
              <div className="d-flex align-items-center">
                <div className="company-avatar me-4" style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'white',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                }}>
                  {user.clientInfo.companyName?.charAt(0) || 'C'}
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-primary d-flex align-items-center">
                    <i className="fas fa-building me-3"></i>
                    {user.clientInfo.companyName}
                  </h2>
                  <div className="d-flex flex-wrap gap-3 text-muted small">
                    <span>
                      <i className="fas fa-id-badge me-1"></i>
                      Client ID: <strong>{user.clientInfo.clientId}</strong>
                    </span>
                    <span>
                      <i className="fas fa-user me-1"></i>
                      Contact: <strong>{user.clientInfo.contactPerson}</strong>
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
      <div className="client-nav shadow-sm" style={{ backgroundColor: 'white', borderTop: '1px solid #e9ecef' }}>
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
              eventKey="payments" 
              title={
                <span className="d-flex align-items-center px-3 py-2">
                  <i className="fas fa-credit-card me-2"></i>
                  <span className="d-none d-sm-inline">Payments</span>
                  <Badge bg="warning" className="ms-2 d-none d-md-inline">
                    {payments.length}
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
          {activeTab === 'payments' && renderPayments()}
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
            Send Message to Admin
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
                  <strong>Your message will be sent directly to the admin team.</strong>
                  <br />
                  <small>
                    From: {user.clientInfo.companyName} ({user.clientInfo.clientId}) - {user.name}
                  </small>
                </div>
              </div>
            </Alert>

            <Row className="g-3">
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
                    <option value="payment">Payment Related</option>
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
                  borderLeft: '4px solid #667eea'
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
        .payment-row:hover,
        .message-row:hover {
          background-color: rgba(102, 126, 234, 0.05) !important;
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
          background-color: rgba(102, 126, 234, 0.1) !important;
          color: #667eea !important;
        }
        
        .custom-nav-tabs .nav-link.active {
          background: linear-gradient(45deg, #667eea, #764ba2) !important;
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
          background-color: rgba(102, 126, 234, 0.1) !important;
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
          
          .client-header {
            padding: 1rem 0 !important;
          }
          
          .company-avatar {
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

export default ClientDashboard;
