import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

// Import screens
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import ResultsScreen from './screens/ResultsScreen';
import CameraScreen from './screens/CameraScreen';
import LoginScreen from './screens/LoginScreen';
import HistoryScreen from './screens/HistoryScreen';
import MobileConnectionScreen from './screens/MobileConnectionScreen';
import Layout from './components/Layout';

// Mobile connection detector
const MobileConnectionDetector = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if this is a mobile connection
    const queryParams = new URLSearchParams(location.search);
    const isMobile = queryParams.get('mobile') === 'true';
    
    if (isMobile) {
      // Save to localStorage to remember this is a mobile connection
      localStorage.setItem('isMobileConnection', 'true');
      // Redirect to home
      navigate('/home');
    }
  }, [location, navigate]);
  
  return null;
};

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      setIsLoading(false);
    });
    
    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  // Create a protected route component
  const ProtectedRoute = ({ children }) => {
    if (!isSignedIn) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <ThemeProvider>
      <Router>
        <MobileConnectionDetector />
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={
            isSignedIn ? <Navigate to="/home" replace /> : <LoginScreen />
          } />
          
          {/* Make camera screen the default landing page */}
          <Route path="/" element={
            <Navigate to="/camera" replace />
          } />
          
          {/* Home screen - Now redirects to camera */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Navigate to="/camera" replace />
            </ProtectedRoute>
          } />
          
          {/* Connection screen - Now accessible via manual navigation */}
          <Route path="/connect" element={
            <ProtectedRoute>
              <Layout>
                <MobileConnectionScreen />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/camera" element={
            <ProtectedRoute>
              <Layout>
                <CameraScreen />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/results" element={
            <ProtectedRoute>
              <Layout>
                <ResultsScreen />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/history" element={
            <ProtectedRoute>
              <Layout>
                <HistoryScreen />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <SettingsScreen />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Support for the old connection route for backward compatibility */}
          <Route path="/connect-mobile" element={
            <ProtectedRoute>
              <Navigate to="/connect" replace />
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
