import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to handle camera permissions and access
 * with built-in error handling and status tracking.
 * 
 * @returns {Object} Camera permission status and related functions
 */
const useCameraPermission = () => {
  const [permissionStatus, setPermissionStatus] = useState({
    granted: false,
    denied: false,
    prompt: false,
    error: null
  });
  
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  
  // Check if the browser supports the required APIs
  const isSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);
  
  // Check permission status
  const checkPermission = useCallback(async () => {
    if (!isSupported()) {
      setPermissionStatus({
        granted: false,
        denied: false,
        prompt: false,
        error: 'Camera API not supported in this browser'
      });
      return;
    }
    
    try {
      // Modern browsers support permissions API
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'camera' });
          
          setPermissionStatus({
            granted: status.state === 'granted',
            denied: status.state === 'denied',
            prompt: status.state === 'prompt',
            error: null
          });
          
          // Listen for permission changes
          status.addEventListener('change', () => {
            setPermissionStatus({
              granted: status.state === 'granted',
              denied: status.state === 'denied',
              prompt: status.state === 'prompt',
              error: null
            });
          });
          
          return status.state;
        } catch (permQueryError) {
          console.warn('Permissions API error:', permQueryError.message);
          // Fall back to feature detection approach
        }
      }
      
      // Fallback approach - attempt to access camera
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
      testStream.getTracks().forEach(track => track.stop());
      
      setPermissionStatus({
        granted: true,
        denied: false,
        prompt: false,
        error: null
      });
      
      return 'granted';
    } catch (error) {
      // Handle different error types
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionStatus({
          granted: false,
          denied: true,
          prompt: false,
          error: 'Camera access denied'
        });
        return 'denied';
      } else if (error.name === 'NotFoundError') {
        setPermissionStatus({
          granted: false,
          denied: false,
          prompt: false,
          error: 'No camera found on this device'
        });
      } else {
        setPermissionStatus({
          granted: false,
          denied: false,
          prompt: false,
          error: error.message || 'Unknown camera error'
        });
      }
      
      return 'error';
    }
  }, [isSupported]);
  
  // Request camera access
  const requestPermission = useCallback(async (constraints = { video: true }) => {
    if (!isSupported()) {
      return {
        stream: null,
        error: 'Camera API not supported in this browser'
      };
    }
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setPermissionStatus({
        granted: true,
        denied: false,
        prompt: false,
        error: null
      });
      
      setStream(mediaStream);
      
      return { stream: mediaStream, error: null };
    } catch (error) {
      console.error('Camera access error:', error.message);
      
      let errorMessage;
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          errorMessage = 'Camera access was denied';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          errorMessage = 'No camera found on this device';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          errorMessage = 'Camera is already in use by another application';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Could not find a camera matching the requested constraints';
          break;
        case 'TypeError':
          errorMessage = 'Invalid camera constraints specified';
          break;
        default:
          errorMessage = error.message || 'Unknown camera error';
      }
      
      setPermissionStatus({
        granted: false,
        denied: error.name === 'NotAllowedError',
        prompt: false,
        error: errorMessage
      });
      
      return { stream: null, error: errorMessage };
    }
  }, [isSupported]);
  
  // List available camera devices
  const enumerateDevices = useCallback(async () => {
    if (!isSupported()) {
      return [];
    }
    
    try {
      // First, let's get permission if needed
      if (!permissionStatus.granted && !permissionStatus.denied) {
        const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
        testStream.getTracks().forEach(track => track.stop());
      }
      
      // Now enumerate devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      
      setDevices(videoDevices);
      
      // Auto-select a default device if none selected
      if (videoDevices.length > 0 && !selectedDeviceId) {
        // Try to find a back camera on mobile (environment facing)
        const backCamera = videoDevices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') || 
          d.label.toLowerCase().includes('environment')
        );
        
        // Use back camera or first available
        setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
      }
      
      return videoDevices;
    } catch (error) {
      console.error('Error enumerating camera devices:', error);
      setDevices([]);
      return [];
    }
  }, [isSupported, permissionStatus.granted, permissionStatus.denied, selectedDeviceId]);
  
  // Release camera stream
  const releaseCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);
  
  // Switch camera (for devices with multiple cameras)
  const switchCamera = useCallback(async (deviceId = null) => {
    // Release current stream
    releaseCamera();
    
    if (!deviceId && devices.length > 1) {
      // Find next device in the list
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      deviceId = devices[nextIndex].deviceId;
    }
    
    if (deviceId) {
      setSelectedDeviceId(deviceId);
      
      return requestPermission({
        video: {
          deviceId: { exact: deviceId }
        }
      });
    }
    
    return { stream: null, error: 'No alternative camera found' };
  }, [devices, selectedDeviceId, releaseCamera, requestPermission]);
  
  // Check permission status on mount
  useEffect(() => {
    checkPermission();
    
    // Add device change listener
    if (navigator.mediaDevices) {
      const handleDeviceChange = () => {
        enumerateDevices();
      };
      
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [checkPermission, enumerateDevices]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      releaseCamera();
    };
  }, [releaseCamera]);
  
  return {
    permissionStatus,
    stream,
    devices,
    selectedDeviceId,
    isSupported: isSupported(),
    checkPermission,
    requestPermission,
    enumerateDevices,
    releaseCamera,
    switchCamera,
    setSelectedDeviceId
  };
};

export default useCameraPermission;
