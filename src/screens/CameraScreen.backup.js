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
import RealTimeDetection from '../components/RealTimeDetection';
import CameraControls from '../components/CameraControls';

/**
 * CameraScreen component provides an interface for sign language detection
 * using camera input with real-time feedback and recording options.
 */
const CameraScreen = () => {
  const { theme: COLORS } = useTheme();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
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
  
  // Use our custom hook to handle sign language recognition model
  const {
    model: signModel,
    isLoading: isSignModelLoading,
    error: signModelError,
    prediction,
    isBufferFull,
    classLabels: modelClassLabels,
    processHandLandmarks,
    runPrediction,
    resetBuffer,
    bufferLength,
    confidenceThreshold,
    isMockModel,
    modelSource,
    downloadProgress,
    extractionProgress,
    modelLoadingStage
  } = useSignLanguageModel(isMobile);
  
  // Track frames with no hands detected
  const [noHandsFrameCount, setNoHandsFrameCount] = useState(0);
  const FRAME_BUFFER_SIZE = 30; // Keep 30 frames of hand landmarks for predictions
  
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
    };
  }, [isMobile]);
  
  // Process video frames with hand landmarks
  const processVideoFrame = useCallback(() => {
    if (!handLandmarker || !videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended || isRecording) {
      animationRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }
    
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
      setNoHandsFrameCount(0);

      // Process hand landmarks using our custom hook
      processHandLandmarks(landmarkerResult);
      
      // Run prediction if buffer is full
      if (isBufferFull) {
        runPrediction();
      }
      
      // Draw hand landmarks on canvas
      landmarkerResult.landmarks.forEach((landmarks) => {
        // Draw hand connections
        drawHandConnections(ctx, landmarks);
        
        // Draw hand landmarks
        drawHandLandmarks(ctx, landmarks);
      });
    } else {
      // Increment no hands counter
      const newCount = noHandsFrameCount + 1;
      setNoHandsFrameCount(newCount);
      
      // Clear prediction and buffer if no hands detected for a while (about 1 second)
      if (newCount > 30) {
        resetBuffer();
      }
    }
    
    // Request next animation frame
    animationRef.current = requestAnimationFrame(processVideoFrame);
  }, [handLandmarker, isRecording, noHandsFrameCount, isBufferFull, confidenceThreshold, prediction, processHandLandmarks, runPrediction, resetBuffer]);
  
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
      processVideoFrame();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraReady, handLandmarker, processVideoFrame]);
  
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
          setCameraReady(true);
        };
        
        // Log camera stream information
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          console.log('Using camera:', videoTrack.label);
        }
        
        // Setup media recorder for video capture
        try {
          const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm; codecs=vp9'
          });
          
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              setRecordedChunks(prev => [...prev, e.data]);
            }
          };
          
          recorder.onstop = () => {
            const blob = new Blob(recordedChunks, {
              type: 'video/webm'
            });
            const videoURL = URL.createObjectURL(blob);
            setVideoUri(videoURL);
            setShowConfirmation(true);
            
            // Save to "gallery" (download)
            const shouldSaveToGallery = localStorage.getItem('saveToGallery') !== 'false';
            if (shouldSaveToGallery) {
              const a = document.createElement('a');
              document.body.appendChild(a);
              a.style.display = 'none';
              a.href = videoURL;
              a.download = `sign-language-${Date.now()}.webm`;
              a.click();
              document.body.removeChild(a);
            }
          };
          
          setMediaRecorder(recorder);
          setCameraError('');
        } catch (recorderError) {
          console.error("Error setting up media recorder:", recorderError);
          setCameraError(`Warning: Recording may not work properly (${recorderError.message}), but camera is functioning.`);
        }
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
  
  // Start recording video
  const startRecording = () => {
    setRecordedChunks([]);
    try {
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          stopRecording();
        }
      }, 5000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Error starting recording. Please try again.");
    }
  };
  
  // Stop recording video
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
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
  
  // Process the selected/recorded video
  const sendVideoForProcessing = () => {
    setShowConfirmation(false);
    if (videoUri) {
      processVideo(videoUri);
    } else {
      alert("No video to send");
    }
  };
  
  // Cancel and record again
  const recordAgain = () => {
    setShowConfirmation(false);
    setVideoUri(null);
  };
  
  // Process video with AI (simulation for now)
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
  
  // Handle recording action - toggle recording state
  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  return (
    <Container>
      {showConfirmation ? (
        // Confirmation screen
        <ConfirmationContainer>
          <ConfirmationCard backgroundColor={COLORS.card}>
            <SuccessIcon backgroundColor={COLORS.accent}>
              <SuccessIconText>✓</SuccessIconText>
            </SuccessIcon>
            <ConfirmationTitle color={COLORS.text}>Video is ready!</ConfirmationTitle>
            <ConfirmationText color={COLORS.textSecondary}>The video has been saved.</ConfirmationText>
            <ConfirmationText color={COLORS.textSecondary}>Would you like to send the video for recognition?</ConfirmationText>
            
            <ConfirmationButtons>
              <ReRecordButton 
                backgroundColor={COLORS.card}
                borderColor={COLORS.primary}
                onClick={recordAgain}
              >
                <ReRecordButtonText color={COLORS.primary}>🔄 Record again</ReRecordButtonText>
              </ReRecordButton>
              
              <SendButton 
                backgroundColor={COLORS.primary}
                onClick={sendVideoForProcessing}
              >
                <SendButtonText color={COLORS.card}>✓ Send for recognition</SendButtonText>
              </SendButton>
            </ConfirmationButtons>
          </ConfirmationCard>
        </ConfirmationContainer>
      ) : (
        // Camera screen
        <OptionsContainer>
          {isProcessing ? (
            <ProcessingContainer backgroundColor={COLORS.card}>
              <LoaderAnimation />
              <ProcessingText color={COLORS.textSecondary}>Processing video...</ProcessingText>
            </ProcessingContainer>
          ) : (
            <>
              <Header>
                <HeaderTitle color={COLORS.text}>Sign Language Recognition</HeaderTitle>
                <InstructionsText color={COLORS.textSecondary}>
                  Position your hands in the frame for real-time detection
                </InstructionsText>
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
              
              {/* Camera usage instructions */}
              {!isModelLoading && !isSignModelLoading && !cameraError && !signModelError && (
                <CameraInstructionContainer>
                  <CameraInstructionText color={COLORS.textSecondary}>
                    Please position your phone so your signs are clearly visible in the frame
                  </CameraInstructionText>
                  
                  {isBufferFull ? (
                    <RecognitionStatusText color={COLORS.primary}>
                      Recognition active - perform signs slowly and clearly
                    </RecognitionStatusText>
                  ) : (
                    <RecognitionStatusText color={COLORS.textSecondary}>
                      Preparing recognition system... {bufferLength}/{FRAME_BUFFER_SIZE} frames
                    </RecognitionStatusText>
                  )}
                </CameraInstructionContainer>
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
                
                {/* Real-time Sign Language Detection - Using our new component */}
                {!videoUri && (
                  <RealTimeDetection 
                    prediction={prediction}
                    confidenceThreshold={confidenceThreshold}
                    isVisible={!isRecording}
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
                  disabled={isModelLoading || isRecording}
                />
                <ZoomLevelIndicator>
                  <span>1x</span>
                  <span>3x</span>
                  <span>5x</span>
                </ZoomLevelIndicator>
              </ZoomControlContainer>
              
              {/* Camera Controls - Using our new component */}
              <CameraControls 
                isRecording={isRecording}
                onRecordPress={handleRecordPress}
                onUploadPress={pickVideoFromGallery}
                isDisabled={isModelLoading || isSignModelLoading || !mediaRecorder}
                colors={COLORS}
              />
              
              <CancelButton
                color={COLORS.textSecondary}
                onClick={() => navigate('/')}
              >
                Return to main screen
              </CancelButton>
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
  margin-bottom: 24px;
`;

const HeaderTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const InstructionsText = styled.p`
  font-size: 16px;
  color: ${props => props.color};
  text-align: center;
  line-height: 22px;
  
  @media (max-width: 768px) {
    font-size: 14px;
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

const CameraInstructionContainer = styled.div`
  width: 100%;
  max-width: 640px;
  margin-bottom: 16px;
  text-align: center;
`;

const CameraInstructionText = styled.p`
  font-size: 14px;
  color: ${props => props.color};
  margin-bottom: 8px;
`;

const RecognitionStatusText = styled.p`
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.color};
  margin-top: 8px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
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

// Confirmation screen
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
  flex-direction: column;
  margin-top: 24px;
  width: 100%;
  
  @media (max-width: 768px) {
    margin-top: 16px;
  }
`;

const ReRecordButton = styled.button`
  background-color: ${props => props.backgroundColor};
  border: 1px solid ${props => props.borderColor};
  padding: 16px;
  border-radius: 12px;
  align-items: center;
  text-align: center;
  margin-bottom: 16px;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
  
  @media (max-width: 768px) {
    padding: 14px;
    border-radius: 10px;
    margin-bottom: 12px;
  }
`;

const SendButton = styled.button`
  background-color: ${props => props.backgroundColor};
  padding: 16px;
  border-radius: 12px;
  align-items: center;
  text-align: center;
  border: none;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
  
  @media (max-width: 768px) {
    padding: 14px;
    border-radius: 10px;
  }
`;

const ReRecordButtonText = styled.span`
  color: ${props => props.color};
  font-weight: 600;
  font-size: 16px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const SendButtonText = styled.span`
  color: ${props => props.color};
  font-weight: 600;
  font-size: 16px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const CancelButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.color};
  text-align: center;
  margin-top: 16px;
  font-size: 16px;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
  
  @media (max-width: 768px) {
    margin-top: 12px;
    font-size: 14px;
  }
`;

export default CameraScreen;