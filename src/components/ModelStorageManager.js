import React from 'react';
import styled from 'styled-components';
import * as tf from '@tensorflow/tfjs';

const Container = styled.div`
  padding: 20px;
  margin: 20px 0;
  background-color: #f8f9fa;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`;

const Title = styled.h3`
  margin-top: 0;
  color: #333;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 15px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.danger ? '#dc3545' : props.secondary ? '#6c757d' : '#007bff'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background-color: ${props => props.danger ? '#c82333' : props.secondary ? '#5a6268' : '#0069d9'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Message = styled.p`
  margin: 10px 0;
  padding: 10px;
  background-color: ${props => props.type === 'success' ? '#d4edda' : props.type === 'info' ? '#d1ecf1' : '#f8d7da'};
  color: ${props => props.type === 'success' ? '#155724' : props.type === 'info' ? '#0c5460' : '#721c24'};
  border-radius: 4px;
  display: ${props => props.visible ? 'block' : 'none'};
`;

const DiagnosticsList = styled.ul`
  margin: 15px 0;
  padding-left: 20px;
  list-style-type: none;
  
  li {
    margin-bottom: 8px;
    position: relative;
    padding-left: 25px;
    
    &:before {
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    
    &.success:before {
      content: '✓';
      color: #155724;
    }
    
    &.error:before {
      content: '✗';
      color: #721c24;
    }
    
    &.warning:before {
      content: '⚠️';
      color: #856404;
    }
    
    &.info:before {
      content: 'ℹ';
      color: #0c5460;
    }
  }
`;

const ModelStorageManager = () => {
  const [message, setMessage] = React.useState({ text: '', type: 'success', visible: false });
  const [isClearing, setIsClearing] = React.useState(false);
  const [diagnosticsResults, setDiagnosticsResults] = React.useState([]);
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  
  const MODEL_CACHE_KEY = "sign-language-model-v6"; // Updated to match new version
  
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type, visible: true });
    setTimeout(() => setMessage(prev => ({ ...prev, visible: false })), 5000);
  };
  
  // Run diagnostics on model loading environment
  const runDiagnostics = async () => {
    try {
      setIsClearing(true);
      setShowDiagnostics(true);
      setDiagnosticsResults([
        { type: 'info', message: 'Starting model environment diagnostics...' }
      ]);
      
      // Check TensorFlow.js initialization
      try {
        await tf.ready();
        setDiagnosticsResults(prev => [...prev, 
          { type: 'success', message: `TensorFlow.js initialized with backend: ${tf.getBackend()}` }
        ]);
      } catch (tfError) {
        setDiagnosticsResults(prev => [...prev, 
          { type: 'error', message: `TensorFlow.js initialization failed: ${tfError.message}` }
        ]);
      }
      
      // Check WebGL support
      if (tf.getBackend() === 'webgl') {
        setDiagnosticsResults(prev => [...prev, 
          { type: 'success', message: 'WebGL backend is active (best performance)' }
        ]);
      } else {
        try {
          await tf.setBackend('webgl');
          setDiagnosticsResults(prev => [...prev, 
            { type: 'success', message: 'Successfully switched to WebGL backend' }
          ]);
        } catch (webglError) {
          setDiagnosticsResults(prev => [...prev, 
            { type: 'warning', message: `WebGL not available, using ${tf.getBackend()} (slower performance)` }
          ]);
        }
      }
      
      // Check for cached models
      let hasIndexedDBCache = false;
      let hasLocalStorageCache = false;
      
      try {
        // Check if model exists in IndexedDB
        const models = await tf.io.listModels();
        const modelInfo = Object.keys(models).filter(key => key.includes(MODEL_CACHE_KEY));
        
        if (modelInfo.length > 0) {
          hasIndexedDBCache = true;
          setDiagnosticsResults(prev => [...prev, 
            { type: 'success', message: `Found cached model in IndexedDB: ${modelInfo.join(', ')}` }
          ]);
        } else {
          setDiagnosticsResults(prev => [...prev, 
            { type: 'info', message: 'No cached model found in IndexedDB' }
          ]);
        }
      } catch (cacheError) {
        setDiagnosticsResults(prev => [...prev, 
          { type: 'warning', message: `Error checking IndexedDB cache: ${cacheError.message}` }
        ]);
      }
      
      // Check localStorage for any model-related items
      try {
        const modelKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('tensorflowjs') || key.includes(MODEL_CACHE_KEY))) {
            modelKeys.push(key);
          }
        }
        
        if (modelKeys.length > 0) {
          hasLocalStorageCache = true;
          setDiagnosticsResults(prev => [...prev, 
            { type: 'success', message: `Found model data in localStorage: ${modelKeys.length} keys` }
          ]);
        } else {
          setDiagnosticsResults(prev => [...prev, 
            { type: 'info', message: 'No model data found in localStorage' }
          ]);
        }
      } catch (lsError) {
        setDiagnosticsResults(prev => [...prev, 
          { type: 'warning', message: `Error checking localStorage: ${lsError.message}` }
        ]);
      }
      
      // Check remote model availability
      try {
        const modelUrl = "https://signlanguagewebapp-a5eff0dabmhwfphu.westeurope-01.azurewebsites.net/download-tfjs-model";
        const response = await fetch(modelUrl, { method: 'HEAD' });
        
        if (response.ok) {
          setDiagnosticsResults(prev => [...prev, 
            { type: 'success', message: 'Remote model endpoint is accessible' }
          ]);
        } else {
          setDiagnosticsResults(prev => [...prev, 
            { type: 'error', message: `Remote model endpoint returned status ${response.status}` }
          ]);
        }
      } catch (fetchError) {
        setDiagnosticsResults(prev => [...prev, 
          { type: 'error', message: `Cannot access remote model endpoint: ${fetchError.message}` }
        ]);
      }
      
      // Check local model files
      try {
        const localModelUrl = '/models/sign_language_model/model.json';
        const modelResponse = await fetch(localModelUrl);
        
        if (modelResponse.ok) {
          setDiagnosticsResults(prev => [...prev, 
            { type: 'success', message: 'Local model.json file is accessible' }
          ]);
          
          // Check for weights file
          const weightsResponse = await fetch('/models/sign_language_model/group1-shard1of1.bin', { method: 'HEAD' });
          
          if (weightsResponse.ok) {
            setDiagnosticsResults(prev => [...prev, 
              { type: 'success', message: 'Local model weight file is accessible' }
            ]);
          } else {
            setDiagnosticsResults(prev => [...prev, 
              { type: 'error', message: 'Local model weight file is missing or inaccessible' }
            ]);
          }
        } else {
          setDiagnosticsResults(prev => [...prev, 
            { type: 'error', message: 'Local model.json file is missing or inaccessible' }
          ]);
        }
      } catch (localError) {
        setDiagnosticsResults(prev => [...prev, 
          { type: 'error', message: `Error checking local model: ${localError.message}` }
        ]);
      }
      
      setDiagnosticsResults(prev => [...prev, 
        { type: 'info', message: 'Diagnostics completed' }
      ]);
      
    } catch (error) {
      setDiagnosticsResults(prev => [...prev, 
        { type: 'error', message: `Diagnostics error: ${error.message}` }
      ]);
    } finally {
      setIsClearing(false);
    }
  };
  
  const clearIndexedDB = async () => {
    try {
      setIsClearing(true);
      
      // Open IndexedDB database
      const request = indexedDB.deleteDatabase(`tensorflowjs`);
      
      request.onsuccess = () => {
        console.log('IndexedDB model storage cleared');
        showMessage('TensorFlow.js IndexedDB storage has been cleared successfully');
        setIsClearing(false);
      };
      
      request.onerror = (event) => {
        console.error('Failed to clear IndexedDB storage:', event.target.error);
        showMessage(`Failed to clear IndexedDB: ${event.target.error}`, 'error');
        setIsClearing(false);
      };
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      showMessage(`Error clearing IndexedDB: ${error.message}`, 'error');
      setIsClearing(false);
    }
  };
  
  const clearLocalStorage = () => {
    try {
      setIsClearing(true);
      
      // Clear only TensorFlow.js related items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('tensorflowjs') || key.includes(MODEL_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      }
      
      showMessage('localStorage model cache has been cleared');
      setIsClearing(false);
    } catch (error) {
      showMessage(`Error clearing localStorage: ${error.message}`, 'error');
      setIsClearing(false);
    }
  };
  
  const clearSessionStorage = () => {
    try {
      setIsClearing(true);
      
      // Clear model related session storage
      sessionStorage.removeItem('modelZipData');
      sessionStorage.removeItem('modelZipTimestamp');
      sessionStorage.removeItem('modelZipVersion');
      
      showMessage('Session storage model cache has been cleared');
      setIsClearing(false);
    } catch (error) {
      showMessage(`Error clearing session storage: ${error.message}`, 'error');
      setIsClearing(false);
    }
  };
  
  const clearAllStorage = () => {
    clearIndexedDB();
    clearLocalStorage();
    clearSessionStorage();
  };
  return (
    <Container>
      <Title>Model Storage Management</Title>
      <p>If you're experiencing issues with the sign language model, you can diagnose problems or clear storage caches:</p>
      
      <Message visible={message.visible} type={message.type}>{message.text}</Message>
      
      <ButtonRow>
        <Button secondary onClick={runDiagnostics} disabled={isClearing}>
          Run Diagnostics
        </Button>
        <Button onClick={clearIndexedDB} disabled={isClearing}>
          Clear IndexedDB Cache
        </Button>
        <Button onClick={clearLocalStorage} disabled={isClearing}>
          Clear localStorage Cache
        </Button>
        <Button onClick={clearSessionStorage} disabled={isClearing}>
          Clear Session Cache
        </Button>
        <Button danger onClick={clearAllStorage} disabled={isClearing}>
          Clear All Caches
        </Button>
        <Button secondary onClick={() => window.open('/model-checker.html', '_blank')}>
          Open Model Checker
        </Button>
      </ButtonRow>
      
      {showDiagnostics && diagnosticsResults.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Diagnostics Results</h4>
          <DiagnosticsList>
            {diagnosticsResults.map((result, index) => (
              <li key={index} className={result.type}>
                {result.message}
              </li>
            ))}
          </DiagnosticsList>
          
          <Button secondary onClick={() => setShowDiagnostics(false)}>
            Hide Diagnostics
          </Button>
        </div>
      )}
    </Container>
  );
};

export default ModelStorageManager;
