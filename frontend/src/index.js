import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Bootstrap CSS import
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'; // Custom CSS should come after Bootstrap


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
