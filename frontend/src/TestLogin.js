import React, { useState } from 'react';

const TestLogin = () => {
  const [activeTab, setActiveTab] = useState('admin');
  
  console.log('✅ TestLogin loaded');
  console.log('🔄 Active tab:', activeTab);
  
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>🧪 Test Login Component</h1>
      
      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={() => setActiveTab('admin')}
          style={{ margin: '10px', padding: '10px 20px' }}
        >
          👤 Admin
        </button>
        <button 
          onClick={() => setActiveTab('employee')}
          style={{ margin: '10px', padding: '10px 20px' }}
        >
          👔 Employee  
        </button>
        <button 
          onClick={() => setActiveTab('client')}
          style={{ margin: '10px', padding: '10px 20px' }}
        >
          🏢 Client
        </button>
      </div>
      
      <div style={{ fontSize: '18px', marginTop: '20px' }}>
        <strong>Active Tab: {activeTab}</strong>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: 'green' }}>
        ✅ Console logs should show above
      </div>
    </div>
  );
};

export default TestLogin;
