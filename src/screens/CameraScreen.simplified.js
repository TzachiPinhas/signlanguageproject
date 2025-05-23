import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { HandLandmarker } from '@mediapipe/tasks-vision';
// Import our custom hook for sign language recognition
import useSignLanguageModel from '../hooks/useSignLanguageModel';
// Import the model loading indicator component
import ModelLoadingIndicator from '../components/ModelLoadingIndicator';
// Import our enhanced UI components
import EnhancedRealTimeDetection from '../components/EnhancedRealTimeDetection';
import SimplifiedCameraControls from '../components/SimplifiedCameraControls';

/**
 * Simplified CameraScreen component focused purely on real-time detection
 * and video upload functionality (no recording)
 */
const CameraScreen = () => {
  const { theme: COLORS } = useTheme();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(() => {
    // Get saved zoom level from localStorage or default to 1 (no zoom)
    return parseFloat(localStorage.getItem('preferredZoom') || '1.0');
  });
  // Use our simplified sign language model hook
  const {
    model: signModel,
    isLoading: isSignModelLoading,
    error: signModelError,
    prediction,
    isBufferFull,
    bufferLength,
    isPredicting,
    processHandLandmarks,
    runPrediction,
    resetBuffer,
    FRAME_BUFFER_SIZE,
    // Destructure the previously undefined variables
    modelLoadingStage,
    downloadProgress,
    extractionProgress,
    isMockModel,
    confidenceThreshold
  } = useSignLanguageModel();
  
  // Track frames with no hands detected
  const [noHandsFrameCount, setNoHandsFrameCount] = useState(0);
  
  // References
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        console.log('Initializing MediaPipe...');
        setIsModelLoading(true);
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        // Initialize the hand landmarker
        const handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: isMobile ? "GPU" : "CPU" // Use GPU for mobile for better performance
          },
          numHands: 2,
          runningMode: "VIDEO"
        });
        
        setHandLandmarker(handLandmarkerInstance);
        
        // Initialize the gesture recognizer
        const recognizerInstance = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: isMobile ? "GPU" : "CPU"
          },
          numHands: 2,
          runningMode: "VIDEO"
        });
        
        setGestureRecognizer(recognizerInstance);
        setIsModelLoading(false);
        console.log('MediaPipe initialized successfully!');
      } catch (error) {
        console.error('Error initializing MediaPipe:', error);
        setCameraError(`Failed to initialize models: ${error.message}`);
        setIsModelLoading(false);
      }
    };
    
    // Check if device is mobile
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      setIsMobile(
        /android/i.test(userAgent) || 
        /iPad|iPhone|iPod/.test(userAgent) || 
        (window.innerWidth <= 768)
      );
    };
    
    checkIfMobile();
    
    const handleResize = () => {
      checkIfMobile();
    };
    
    window.addEventListener('resize', handleResize);
    initMediaPipe();
    
    // Clean up
    return () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      if (gestureRecognizer) {
        gestureRecognizer.close();
      }
      
      if (handLandmarker) {
        handLandmarker.close();
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
    };  }, [isMobile]);    // Process video frames with hand landmarks - OPTIMIZED FOR REAL-TIME DETECTION
  const processVideoFrame = useCallback(async () => {
    if (!handLandmarker || !videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      console.log("Skipping frame - requirements not met");
      animationRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }
    
    // Debugging - log frame processing
    const currentFrame = performance.now();
    console.log(`Processing video frame at ${currentFrame.toFixed(0)}ms`);
    
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    // Match canvas dimensions to video
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    
    const ctx = canvasRef.current.getContext('2d');
    
    // Process with hand landmarker
    const startTimeMs = performance.now();
    const landmarkerResult = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
    
    // Clear canvas
    ctx.clearRect(0, 0, videoWidth, videoHeight);
      // Check if hands are detected
    if (landmarkerResult.landmarks && landmarkerResult.landmarks.length > 0) {
      // Reset no hands counter when hands are detected
      setNoHandsFrameCount(0);      // Visual feedback: show number of hands detected
      ctx.fillStyle = 'yellow';
      ctx.font = '18px Arial';
      ctx.fillText(`Hands detected: ${landmarkerResult.landmarks.length}`, 10, 22);
      
      // Show buffer status
      ctx.fillStyle = 'cyan';
      ctx.fillText(`Buffer: ${bufferLength}/${FRAME_BUFFER_SIZE}`, 10, 50);
      
      // Show prediction if available
      if (prediction) {
        ctx.fillStyle = 'lime';
        ctx.font = '24px Arial';
        ctx.fillText(`Prediction: ${prediction.label}`, 10, 85);
        ctx.font = '18px Arial';
        ctx.fillText(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, 10, 115);
      }
      
      // Show predicting status
      if (isPredicting) {
        ctx.fillStyle = 'orange';
        ctx.fillText('Predicting...', 10, 145);
      }
      
      // Debug info for first hand
      if (landmarkerResult.landmarks.length > 0) {
        const firstHand = landmarkerResult.landmarks[0];
        ctx.fillStyle = 'white';
        ctx.fillText(`Hand data: ${firstHand.length} landmarks`, 10, 175);
        ctx.fillText(`Tensor shape: [1,${FRAME_BUFFER_SIZE},126] (${1*FRAME_BUFFER_SIZE*126} values)`, 10, 205);
      }
      
      // Show buffer status
      ctx.fillStyle = 'cyan';
      ctx.fillText(`Buffer: ${bufferLength}/${FRAME_BUFFER_SIZE}`, 10, 50);
      
      // Show prediction if available
      if (prediction) {
        ctx.fillStyle = 'lime';
        ctx.font = '24px Arial';
        ctx.fillText(`Prediction: ${prediction.label}`, 10, 85);
        ctx.font = '18px Arial';
        ctx.fillText(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, 10, 115);
      }
      
      // Show predicting status
      if (isPredicting) {
        ctx.fillStyle = 'orange';
        ctx.fillText('Predicting...', 10, 145);
      }      // Process hand landmarks using our custom hook
      const bufferFull = processHandLandmarks(landmarkerResult);
      console.log(`Frame processed - Buffer added to collection`);      // Run prediction if buffer is full
      if (bufferFull) {
        console.log("Buffer full, running prediction");
        try {
          // Ensure the model and function are available
          if (signModel && typeof runPrediction === 'function') {
            // Since we're in an async function, we can safely use await here
            const result = await runPrediction();
            
            if (!result && signModel) {
              console.log("No prediction result returned but model exists");
              
              // Check model status in more detail
              console.log("Model status check:", {
                modelExists: !!signModel,
                hasPredict: typeof signModel.predict === 'function',
                bufferSize: bufferLength,
                bufferComplete: isBufferFull
              });
            }
          } else {
            // Show detailed error info
            console.error("Cannot run prediction: model not loaded or function not available");
            
            const errorDetails = {
              modelExists: !!signModel,
              modelType: signModel ? typeof signModel : "undefined",
              predictFnExists: signModel ? typeof signModel.predict === 'function' : false,
              functionExists: typeof runPrediction === 'function',
              bufferStatus: `${bufferLength}/${FRAME_BUFFER_SIZE}`,
              modelError: signModelError
            };
            
            console.error("Detailed error info:", errorDetails);
            
            // When canvas is available, add error messaging
            if (ctx) {
              ctx.fillStyle = 'red';
              ctx.font = '16px Arial';
              ctx.fillText('Error: Model not available', 10, 240);
              
              if (!signModel) {
                ctx.fillText('Sign language model not loaded', 10, 270);
              } else if (typeof signModel.predict !== 'function') {
                ctx.fillText('Model predict() function not available', 10, 270);
              }
            }
          }        } catch (error) {
          console.error("Error running prediction:", error);
          
          // Add error to canvas for visual feedback
          if (ctx) {
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.fillText(`Prediction error: ${error.message}`, 10, 240);
          }
          
          // Even if there's an error, we want to make sure the animation continues
          // This is now handled at the end of the function with requestAnimationFrame
        }
      }
      
      // Draw hand landmarks on canvas
      landmarkerResult.landmarks.forEach((landmarks) => {
        // Draw hand connections
        drawHandConnections(ctx, landmarks);
        
        // Draw hand landmarks
        drawHandLandmarks(ctx, landmarks);
      });    } else {
      // Increment no hands counter
      const newCount = noHandsFrameCount + 1;
      setNoHandsFrameCount(newCount);
      
      // Show no hands detected message
      ctx.fillStyle = 'orange';
      ctx.font = '18px Arial';
      ctx.fillText(`No hands detected (${newCount}/30)`, 10, 22);
      
      // Clear prediction and buffer if no hands detected for a while (about 1 second)
      if (newCount > 30) {
        resetBuffer();
      }
    }      // Explicitly request the next frame, using a direct function call to avoid closure issues
    // Since processVideoFrame is now async, we need to make sure we request the next frame 
    // regardless of whether any Promises within the function resolve or reject
    // This ensures the animation loop continues even if there's an error in an await operation
    animationRef.current = requestAnimationFrame(processVideoFrame);
  }, [handLandmarker, processHandLandmarks, runPrediction, resetBuffer, bufferLength]);
  
  // Custom function to draw hand connections
  const drawHandConnections = (ctx, landmarks) => {
    // Define hand connections (pairs of landmark indices that should be connected)
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],           // thumb
      [0, 5], [5, 6], [6, 7], [7, 8],           // index finger
      [0, 9], [9, 10], [10, 11], [11, 12],      // middle finger
      [0, 13], [13, 14], [14, 15], [15, 16],    // ring finger
      [0, 17], [17, 18], [18, 19], [19, 20],    // pinky
      [5, 9], [9, 13], [13, 17],                // palm connections
    ];
    
    // Set line style for connections
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#00FF00';
    ctx.lineJoin = 'round';
    
    // Draw each connection as a line
    connections.forEach(([i, j]) => {
      const start = landmarks[i];
      const end = landmarks[j];
      
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvasRef.current.width, start.y * canvasRef.current.height);
        ctx.lineTo(end.x * canvasRef.current.width, end.y * canvasRef.current.height);
        ctx.stroke();
      }
    });
  };
  
  // Custom function to draw hand landmarks
  const drawHandLandmarks = (ctx, landmarks) => {
    // Set style for landmarks
    ctx.fillStyle = '#FF0000';
    
    // Draw each landmark as a circle
    landmarks.forEach((landmark) => {
      const x = landmark.x * canvasRef.current.width;
      const y = landmark.y * canvasRef.current.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };
  // Start hand landmark processing when camera is ready  
  useEffect(() => {
    if (cameraReady && handLandmarker) {
      console.log("Camera ready and hand landmarker initialized - starting frame processing");
      // Clear any existing animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Clear the buffer and reset state
      resetBuffer();
        // Start processing frames - ensure this happens only once
      if (!animationRef.current) {
        console.log("Starting animation frame loop for continuous detection");
        // Start the animation frame loop with our async function
        animationRef.current = requestAnimationFrame(processVideoFrame);
      }
    }
    
    return () => {
      if (animationRef.current) {
        console.log("Cleaning up animation frame on unmount");
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [cameraReady, handLandmarker]);
  
  // Check if device has a rear camera
  const checkForCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log(`Device has ${videoDevices.length} camera(s) available.`);
      
      // Log information about available cameras to help with debugging
      if (videoDevices.length === 0) {
        console.warn("No cameras detected on this device");
      }
    } catch (error) {
      console.error("Error checking for cameras:", error);
    }
  };
  
  // Get video constraints with appropriate resolution and zoom
  const getVideoConstraints = () => {
    const resolution = { width: { ideal: 1280 }, height: { ideal: 720 } };
    
    // For mobile devices, adjust resolution
    if (isMobile) {
      resolution.width.ideal = 720;
      resolution.height.ideal = 1280;
    }
    
    // Add advanced zoom constraints if supported
    const advanced = [];
    
    // Add zoom constraint if available
    if (zoomLevel !== 1.0) {
      advanced.push({
        zoom: zoomLevel
      });
    }
    
    return {
      ...resolution,
      // Always use environment (rear) camera for better sign language capture
      facingMode: "environment",
      advanced: advanced.length > 0 ? advanced : undefined
    };
  };
  
  // Request camera access and setup video stream
  const setupCamera = async () => {
    try {
      // Stop any previous camera stream
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      // Check device camera capabilities
      await checkForCamera();
      
      const constraints = {
        video: getVideoConstraints()
      };
      
      console.log("Requesting rear camera with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
          videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            console.log("Video playing, camera ready");
            setCameraReady(true);
          }).catch(err => {
            console.error("Error auto-playing video:", err);
            setCameraReady(true);
          });
        };
        
        // Log camera stream information
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          console.log('Using camera:', videoTrack.label);
        }
        
        setCameraError('');
      }
    } catch (error) {
      console.error("Error accessing rear camera:", error);
      
      // Provide more helpful error messages based on the error type
      if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        setCameraError(`Could not access rear camera: Your device may not have a rear camera or it might be in use by another application. Please try using a device with a rear-facing camera.`);
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError(`Camera access denied: Please enable camera permissions in your browser settings and reload this page.`);
      } else {
        setCameraError(`Camera error: ${error.message}. Try reloading the page or using a different device/browser.`);
      }
    }
  };
  
  // Handle zoom change
  const handleZoomChange = (newZoom) => {
    setZoomLevel(parseFloat(newZoom));
    
    // Save preference to localStorage
    localStorage.setItem('preferredZoom', newZoom.toString());
    
    // If we have a current stream, try to adjust zoom directly
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.getConstraints === 'function') {
        try {
          const constraints = {
            advanced: [{ zoom: parseFloat(newZoom) }]
          };
          videoTrack.applyConstraints(constraints)
            .catch(error => {
              console.log("Zoom adjustment failed, restarting camera:", error);
              setupCamera();
            });
        } catch (error) {
          console.log("Failed to apply zoom directly, restarting camera:", error);
          setupCamera();
        }
      } else {
        // If direct zoom adjustment not supported, restart the camera
        setupCamera();
      }
    }
  };
  
  // Pick a video file from device storage
  const pickVideoFromGallery = async () => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'video/*';
      
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const videoURL = URL.createObjectURL(file);
          setVideoUri(videoURL);
          setShowConfirmation(true);
        }
      };
      
      fileInput.click();
    } catch (error) {
      console.error("Error selecting video:", error);
      alert("Error selecting video: " + error.message);
    }
  };
  
  // Process the selected/uploaded video
  const sendVideoForProcessing = () => {
    setShowConfirmation(false);
    if (videoUri) {
      processVideo(videoUri);
    } else {
      alert("No video to send");
    }
  };
  
  // Cancel and go back to real-time detection
  const recordAgain = () => {
    setShowConfirmation(false);
    setVideoUri(null);
  };
  
  // Process video with AI
  const processVideo = async (uri) => {
    setIsProcessing(true);
    console.log("Processing video, URI:", uri);
    
    try {
      // In a real application, you would send the video to your backend server
      // Create FormData and send it to your API
      const formData = new FormData();
      
      // Convert blob URL to blob 
      const response = await fetch(uri);
      const videoBlob = await response.blob();
      
      formData.append('video', videoBlob, 'video.webm');
      
      // Note: For demo purposes, if you don't have a backend API ready
      // This is where you'd send the video to your API for processing
      // Now we'll simulate processing and recognition
      
      const simulateServerCall = async () => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Example of random recognition result (replace with actual API call)
        const demoResults = [
          { label: "Hello", confidence: 0.92 },
          { label: "Thank you", confidence: 0.87 },
          { label: "Yes", confidence: 0.95 },
          { label: "No", confidence: 0.89 },
          { label: "Please", confidence: 0.82 }
        ];
        
        return demoResults[Math.floor(Math.random() * demoResults.length)];
      };
      
      const result = await simulateServerCall();

      console.log("✅ Result:", JSON.stringify(result));
      navigate('/results', { state: { result } });
      
    } catch (error) {
      console.error("🚨 Error processing video:", error.message);
      alert(`Error processing video: ${error.message}`);
      
      // Navigate with error result
      const errorResult = { label: "ERROR", confidence: 0 };
      navigate('/results', { state: { result: errorResult } });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Use effect to setup camera when component mounts
  useEffect(() => {
    setupCamera();
  }, []);

  // Monitor network connectivity status
  useEffect(() => {
    let networkMonitorInterval;
    
    // Function to handle network status changes
    const handleNetworkChange = async () => {
      const isConnected = navigator.onLine;
      
      if (!isConnected && !cameraError) {
        console.warn('Network connection issue detected');
        setCameraError('Network connectivity issue detected. This may affect model loading.');
      } else if (isConnected && cameraError && cameraError.includes('Network connectivity issue')) {
        // Clear network-specific errors when connection is restored
        console.log('Network connection restored');
        setCameraError('');
      }
    };
    
    // Set up event listeners for online/offline events
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    // Check initial network status
    handleNetworkChange();
    
    // Periodically check network status in the background
    networkMonitorInterval = setInterval(handleNetworkChange, 30000); // Every 30 seconds
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      clearInterval(networkMonitorInterval);
    };
  }, [cameraError]);
  
  // Check if model and MediaPipe are still loading
  const isLoading = isModelLoading || isSignModelLoading;
  
  // Show loading screen if models are still loading
  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <h2>Initializing Sign Language Recognition</h2>
          <ModelLoadingIndicator 
            isLoading={isSignModelLoading}
            error={signModelError}
            loadingStage={modelLoadingStage}
            downloadProgress={downloadProgress}
            extractionProgress={extractionProgress}
            isMockModel={isMockModel}
          />
          {signModelError && (
            <ErrorMessage>
              <h3>Model Error:</h3>
              <p>{signModelError}</p>
              <p>Please try refreshing the page.</p>
            </ErrorMessage>
          )}
          {cameraError && (
            <ErrorMessage>
              <h3>Camera Error:</h3>
              <p>{cameraError}</p>
              <p>Please ensure you have granted camera permissions.</p>
            </ErrorMessage>
          )}
        </LoadingContainer>
      </Container>
    );
  }
  
  return (
    <Container>
      {/* Visual debug: buffer and prediction status */}
      <StatusOverlay style={{ display: bufferLength > 0 ? 'flex' : 'none' }}>
        <StatusText>Buffer: {bufferLength}/{FRAME_BUFFER_SIZE}</StatusText>
        {isPredicting ? <StatusText>Predicting...</StatusText> : null}
        {prediction && !isPredicting && (
          <PredictionDisplay>
            {prediction.label} ({(prediction.confidence*100).toFixed(1)}%)
          </PredictionDisplay>
        )}
        {!prediction && !isPredicting && isBufferFull && (
          <StatusText>No prediction</StatusText>
        )}
      </StatusOverlay>
      
      {showConfirmation ? (
        // Confirmation screen for uploaded videos
        <ConfirmationContainer>
          <ConfirmationCard backgroundColor={COLORS.card}>
            <SuccessIcon backgroundColor={COLORS.accent}>
              <SuccessIconText>📹</SuccessIconText>
            </SuccessIcon>
            <ConfirmationTitle color={COLORS.text}>Video is ready!</ConfirmationTitle>
            <ConfirmationText color={COLORS.textSecondary}>Would you like to process this video for sign language recognition?</ConfirmationText>
            
            <ConfirmationButtons>
              <CancelButton 
                backgroundColor={COLORS.card}
                borderColor={COLORS.border}
                onClick={recordAgain}
              >
                <CancelButtonText color={COLORS.textSecondary}>Cancel</CancelButtonText>
              </CancelButton>
              
              <ProcessButton 
                backgroundColor={COLORS.primary}
                onClick={sendVideoForProcessing}
              >
                <ProcessButtonText color={COLORS.card}>Process Video</ProcessButtonText>
              </ProcessButton>
            </ConfirmationButtons>
          </ConfirmationCard>
        </ConfirmationContainer>
      ) : (
        // Real-time detection screen
        <OptionsContainer>
          {isProcessing ? (
            <ProcessingContainer backgroundColor={COLORS.card}>
              <LoaderAnimation />
              <ProcessingText color={COLORS.textSecondary}>Processing video...</ProcessingText>
            </ProcessingContainer>
          ) : (
            <>
              <Header>
                <HeaderTitle color={COLORS.text}>Real-Time Sign Detection</HeaderTitle>
                <InstructionsText color={COLORS.textSecondary}>
                  Position your hands in the frame for instant sign language detection
                </InstructionsText>
                <StatusIndicator active={isBufferFull}>
                  {isBufferFull ? 
                    <ActiveStatusText>● LIVE DETECTION ACTIVE</ActiveStatusText> : 
                    <PreparingStatusText>○ Preparing detection ({bufferLength}/{FRAME_BUFFER_SIZE})</PreparingStatusText>
                  }
                </StatusIndicator>
              </Header>
              
              {/* Loading indicator for model initialization */}
              {isModelLoading && (
                <ModelLoadingContainer>
                  <LoaderAnimation />
                  <ModelLoadingText color={COLORS.textSecondary}>
                    Loading hand detection models...
                  </ModelLoadingText>
                </ModelLoadingContainer>
              )}
                
              {/* Sign language model loading indicator */}
              <ModelLoadingIndicator 
                isLoading={isSignModelLoading}
                error={signModelError}
                loadingStage={modelLoadingStage}
                downloadProgress={downloadProgress}
                extractionProgress={extractionProgress}
                isMockModel={isMockModel}
                onRetry={() => window.location.reload()}
              />
              
              {/* Mock model warning */}
              {isMockModel && !isSignModelLoading && !signModelError && (
                <MockModelContainer>
                  <MockModelText>
                    <strong>Demo Mode:</strong> Using test predictions. Real model not available.
                  </MockModelText>
                </MockModelContainer>
              )}
              
              {/* Camera Error Message */}
              {cameraError && (
                <ErrorContainer>
                  <ErrorText>{cameraError}</ErrorText>
                </ErrorContainer>
              )}
              
              {/* Camera Preview */}
              <VideoContainer>
                <Video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ display: videoUri ? 'none' : 'block' }}
                />
                <Canvas 
                  ref={canvasRef} 
                  style={{ display: videoUri ? 'none' : 'block' }} 
                />
                {videoUri && <RecordedVideo src={videoUri} controls />}
                
                {/* Enhanced Real-time Sign Language Detection */}                {!videoUri && (
                  <EnhancedRealTimeDetection 
                    prediction={prediction}
                    confidenceThreshold={confidenceThreshold || 0.7} // Provide fallback if undefined
                    isVisible={true}
                  />
                )}
              </VideoContainer>
              
              {/* Zoom control slider */}
              <ZoomControlContainer>
                <ZoomLabel color={COLORS.text}>Camera Zoom: {zoomLevel.toFixed(1)}x</ZoomLabel>
                <ZoomSlider 
                  type="range" 
                  min="1.0" 
                  max="5.0" 
                  step="0.1" 
                  value={zoomLevel} 
                  onChange={(e) => handleZoomChange(e.target.value)}
                  disabled={isModelLoading}
                />
                <ZoomLevelIndicator>
                  <span>1x</span>
                  <span>3x</span>
                  <span>5x</span>
                </ZoomLevelIndicator>
              </ZoomControlContainer>
              
              {/* Simplified Camera Controls - Only Upload Button */}
              <SimplifiedCameraControls 
                onUploadPress={pickVideoFromGallery}
                isDisabled={isModelLoading || isSignModelLoading}
                colors={COLORS}
              />
            </>
          )}
        </OptionsContainer>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 24px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  width: 100%;
  text-align: center;
  margin-bottom: 20px;
`;

const HeaderTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    font-size: 24px;
    margin-bottom: 8px;
  }
`;

const InstructionsText = styled.p`
  font-size: 16px;
  color: ${props => props.color};
  text-align: center;
  line-height: 22px;
  margin-bottom: 10px;
  
  @media (max-width: 768px) {
    font-size: 14px;
    margin-bottom: 8px;
  }
`;

const StatusIndicator = styled.div`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  margin-top: 8px;
  background-color: ${props => props.active ? 'rgba(46, 204, 113, 0.15)' : 'rgba(189, 195, 199, 0.15)'};
  
  @media (max-width: 768px) {
    padding: 4px 10px;
    margin-top: 6px;
  }
`;

const ActiveStatusText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #2ecc71;
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const PreparingStatusText = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #7f8c8d;
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const VideoContainer = styled.div`
  width: 100%;
  max-width: 640px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  position: relative;
  background-color: #000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  aspect-ratio: 16/9;
  
  @media (max-width: 768px) {
    border-radius: 12px;
    margin-bottom: 16px;
    max-height: 60vh;
    aspect-ratio: auto;
    height: 60vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  
  @media (max-width: 768px) {
    object-position: center;
    max-height: 100%;
    max-width: 100%;
  }
`;

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
`;

const RecordedVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

// Zoom Controls
const ZoomControlContainer = styled.div`
  width: 100%;
  max-width: 640px;
  margin-bottom: 20px;
`;

const ZoomLabel = styled.p`
  color: ${props => props.color};
  font-size: 14px;
  margin-bottom: 8px;
  font-weight: 500;
`;

const ZoomSlider = styled.input`
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: linear-gradient(to right, #3498db, #1abc9c);
  outline: none;
  border-radius: 3px;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid #3498db;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }
  
  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid #3498db;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

const ZoomLevelIndicator = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
`;

// Loading and error components
const ModelLoadingContainer = styled.div`
  margin-bottom: 16px;
  text-align: center;
  
  @media (max-width: 768px) {
    margin-bottom: 12px;
  }
`;

const ModelLoadingText = styled.p`
  margin-top: 8px;
  font-size: 14px;
  color: ${props => props.color};
`;

const ErrorContainer = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
  width: 100%;
  max-width: 640px;
`;

const ErrorText = styled.p`
  font-size: 14px;
  margin: 0;
`;

const MockModelContainer = styled.div`
  background-color: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
  width: 100%;
  max-width: 640px;
  border: 1px solid #ffeeba;
`;

const MockModelText = styled.p`
  font-size: 14px;
  margin: 0;
`;

// Processing animation
const LoaderAnimation = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    border-width: 3px;
    border-top-width: 3px;
  }
`;

const ProcessingContainer = styled.div`
  background-color: ${props => props.backgroundColor};
  border-radius: 16px;
  padding: 24px;
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    border-radius: 12px;
    padding: 20px;
  }
`;

const ProcessingText = styled.p`
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    margin-top: 12px;
    font-size: 14px;
  }
`;

// Confirmation screen for uploaded videos
const ConfirmationContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 24px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const ConfirmationCard = styled.div`
  background-color: ${props => props.backgroundColor};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  align-items: center;
  text-align: center;
  
  @media (max-width: 768px) {
    border-radius: 12px;
    padding: 20px;
  }
`;

const SuccessIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: ${props => props.backgroundColor};
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    border-radius: 24px;
    margin-bottom: 12px;
  }
`;

const SuccessIconText = styled.span`
  font-size: 32px;
  color: white;
  font-weight: 700;
  
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const ConfirmationTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.color};
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    font-size: 20px;
    margin-bottom: 12px;
  }
`;

const ConfirmationText = styled.p`
  font-size: 16px;
  color: ${props => props.color};
  margin-bottom: 8px;
  
  @media (max-width: 768px) {
    font-size: 14px;
    margin-bottom: 6px;
  }
`;

const ConfirmationButtons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 24px;
  width: 100%;
  
  @media (max-width: 768px) {
    margin-top: 16px;
  }
`;

const CancelButton = styled.button`
  background-color: ${props => props.backgroundColor};
  border: 1px solid ${props => props.borderColor};
  padding: 12px 16px;
  border-radius: 12px;
  flex: 1;
  margin-right: 10px;
  align-items: center;
  text-align: center;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
  
  @media (max-width: 768px) {
    padding: 10px 14px;
    border-radius: 10px;
  }
`;

const ProcessButton = styled.button`
  background-color: ${props => props.backgroundColor};
  padding: 12px 16px;
  border-radius: 12px;
  flex: 1;
  margin-left: 10px;
  align-items: center;
  text-align: center;
  border: none;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
  
  @media (max-width: 768px) {
    padding: 10px 14px;
    border-radius: 10px;
  }
`;

const CancelButtonText = styled.span`
  color: ${props => props.color};
  font-weight: 600;
  font-size: 16px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const ProcessButtonText = styled.span`
  color: ${props => props.color};
  font-weight: 600;
  font-size: 16px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const StatusOverlay = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 16px;
  padding: 12px;
  border-radius: 8px;
  z-index: 30;
  
  @media (max-width: 768px) {
    padding: 8px;
    border-radius: 6px;
  }
`;

const StatusText = styled.div`
  margin-bottom: 6px;
  text-align: center;
  font-size: 14px;
  color: white;
`;

const PredictionDisplay = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  background-color: rgba(52, 152, 219, 0.8);
  padding: 8px 16px;
  border-radius: 8px;
  margin-top: 8px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 24px;
  text-align: center;
`;

const ErrorMessage = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  padding: 16px;
  border-radius: 8px;
  margin-top: 20px;
  width: 100%;
  max-width: 600px;
  text-align: left;
  border: 1px solid #f5c6cb;
  
  h3 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 18px;
  }
  
  p {
    margin-bottom: 10px;
    line-height: 1.4;
  }
  
  p:last-child {
    margin-bottom: 0;
    font-weight: 500;
  }
`;

export default CameraScreen;
