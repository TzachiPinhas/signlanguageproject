import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import JSZip from 'jszip';
import { debounce } from '../utils/debounce';

// Constants
const FRAME_BUFFER_SIZE = 30;
const MODEL_URL = {
  TFJS_MODEL: "https://signlanguagewebapp-a5eff0dabmhwfphu.westeurope-01.azurewebsites.net/download-model",
  MODEL_ZIP: "https://signlanguagewebapp-a5eff0dabmhwfphu.westeurope-01.azurewebsites.net/download-tfjs-model",
  LOCAL_MODEL: "/models/sign_language_model/model.json",
  CACHE_KEY: "sign-language-model-v5" // Updated version to refresh cache
};
const CONFIDENCE_THRESHOLD = 0.7;
const USE_MOCK_MODEL = false;

// Default sign language class labels
const DEFAULT_CLASS_LABELS = [
  "Hello", "Thank you", "Yes", "No", "Please", "Sorry",
  "Good", "Bad", "Name", "What", "Where", "When", "How",
  "Help", "Want", "Love", "Like", "Need", "Time", "Now"
];

/**
 * Custom hook for sign language recognition model handling
 * 
 * This hook handles:
 * - Loading the TensorFlow.js model
 * - Managing the landmarks buffer
 * - Performing predictions
 * - Memory cleanup
 */
const useSignLanguageModel = (isMobile = false) => {
  // State for model and loading status
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classLabels, setClassLabels] = useState(DEFAULT_CLASS_LABELS);
  
  // State for prediction and buffer
  const [prediction, setPrediction] = useState(null);
  const [isBufferFull, setIsBufferFull] = useState(false);
  
  // State for download and extraction progress
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [modelLoadingStage, setModelLoadingStage] = useState('initializing');
  
  // Refs
  const bufferRef = useRef([]);
  const lastPredictionTimeRef = useRef(0);
  const zipCacheRef = useRef(null);

  /**
   * Creates a mock sign language recognition model for testing
   * @returns {tf.LayersModel} A simple model for testing
   */
  const createMockModel = () => {
    console.log('Creating mock TensorFlow.js model for testing...');
    
    // Create a sequential model
    const model = tf.sequential();
    
    // Input shape: [batch, FRAME_BUFFER_SIZE, 126]
    model.add(tf.layers.lstm({
      units: 64,
      returnSequences: true,
      inputShape: [FRAME_BUFFER_SIZE, 126],
      activation: 'relu'
    }));
    
    model.add(tf.layers.lstm({
      units: 32,
      returnSequences: false,
      activation: 'relu'
    }));
    
    // Add dropout for regularization
    model.add(tf.layers.dropout({
      rate: 0.2
    }));
    
    // Output layer with units matching our sign classes
    model.add(tf.layers.dense({
      units: classLabels.length,
      activation: 'softmax'
    }));
    
    // Compile the model
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    model.summary();
    
    console.warn('⚠️ USING MOCK MODEL - This is for testing only and will not provide accurate sign language recognition');
    
    return model;
  };

  /**
   * Utility function to retry failed operations with exponential backoff
   */
  const retryWithBackoff = async (operation, retries = 3, baseDelay = 300, onRetry = () => {}) => {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, 3 - retries);
      console.log(`Retrying operation after ${delay}ms, ${retries} retries left`);
      onRetry(retries, delay);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(operation, retries - 1, baseDelay, onRetry);
    }
  };

  /**
   * Helper function to store model data in session storage for quick reload
   * @param {Uint8Array} data - The model data to store
   */
  const storeModelDataInSession = (data) => {
    try {
      // Only store if data is small enough (<10MB to avoid performance issues)
      if (data.length < 10 * 1024 * 1024) {
        console.log('Storing model data in session storage for faster reload');
        // Convert to base64 for more efficient storage
        const blob = new Blob([data]);
        const reader = new FileReader();
        
        reader.onload = () => {
          const base64data = reader.result.split(',')[1];
          sessionStorage.setItem('modelZipData', base64data);
          sessionStorage.setItem('modelZipTimestamp', Date.now().toString());
          sessionStorage.setItem('modelZipVersion', MODEL_URL.CACHE_KEY);
        };
        
        reader.readAsDataURL(blob);
      }
    } catch (e) {
      console.warn('Failed to store model in session storage:', e.message);
    }
  };

  /**
   * Helper function to retrieve model data from session storage
   * @returns {ArrayBuffer|null} - The model data or null if not found
   */
  const getModelDataFromSession = () => {
    try {
      const base64data = sessionStorage.getItem('modelZipData');
      const timestamp = sessionStorage.getItem('modelZipTimestamp');
      const version = sessionStorage.getItem('modelZipVersion');
      
      if (base64data && timestamp && version === MODEL_URL.CACHE_KEY) {
        // Check if data is still fresh (less than 1 hour old)
        const age = Date.now() - parseInt(timestamp);
        if (age < 60 * 60 * 1000) { // 1 hour
          console.log('Found valid model data in session storage');
          
          // Convert base64 back to ArrayBuffer
          const binaryString = atob(base64data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          return bytes.buffer;
        }
      }
    } catch (e) {
      console.warn('Failed to get model from session storage:', e.message);
    }
    return null;
  };

  /**
   * Downloads and extracts a ZIP file containing a TensorFlow.js model
   * @returns {Promise<Object>} - An object containing the model files
   */
  const downloadAndExtractModelZip = async () => {
    try {
      setModelLoadingStage('downloading');
      
      // Add a timestamp to avoid caching issues
      const zipUrl = `${MODEL_URL.MODEL_ZIP}?t=${Date.now()}`;
      console.log('Downloading model ZIP from:', zipUrl);
      
      // Check if we have the ZIP in memory cache
      if (zipCacheRef.current) {
        console.log('Using cached ZIP file from memory');
        return zipCacheRef.current;
      }
      
      // Try to load from session storage if available
      const sessionStorageData = getModelDataFromSession();
      if (sessionStorageData) {
        console.log('Found ZIP data in session storage, reusing it');
        setDownloadProgress(100);
        
        // Extract the ZIP
        setModelLoadingStage('extracting');
        const zip = new JSZip();
        try {
          // Use debounced extraction progress tracking
          const debouncedUpdateProgress = debounce((percent) => {
            setExtractionProgress(percent);
            console.log(`Extraction progress (from session): ${percent}%`);
          }, 100); // Update UI at most every 100ms
          
          const zipContents = await zip.loadAsync(sessionStorageData, {
            checkCRC32: true,
            onUpdate: metadata => {
              if (metadata.percent !== undefined) {
                const progressPercent = Math.round(metadata.percent);
                debouncedUpdateProgress(progressPercent);
              }
            }
          });
          
          zipCacheRef.current = zipContents;
          
          // Validate the ZIP structure
          const fileList = Object.keys(zipContents.files);
          if (!fileList.some(file => file.includes('model.json'))) {
            console.warn('Session storage ZIP appears invalid, downloading fresh copy');
            throw new Error('Invalid ZIP structure in session storage');
          }
          
          setExtractionProgress(100);
          return zipContents;
        } catch (sessionError) {
          console.warn('Error using session storage data, falling back to download:', sessionError);
          // Continue with normal download flow
        }
      }
      
      // Fetch the ZIP file with progress reporting and retry logic
      const response = await retryWithBackoff(
        async () => {
          const resp = await fetch(zipUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Accept': 'application/zip, application/octet-stream'
            },
          });
          
          if (!resp.ok) {
            throw new Error(`Failed to download model ZIP: ${resp.status} ${resp.statusText}`);
          }
          
          return resp;
        }, 
        3, // 3 retries
        500, // 500ms base delay
        (retriesLeft) => {
          console.log(`Download failed, retrying... (${retriesLeft} attempts left)`);
          setModelLoadingStage('download-retry');
        }
      );
      
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      let loadedBytes = 0;
      
      // Create a reader to process the response in chunks
      const reader = response.body.getReader();
      const chunks = [];
      
      // Process the download in chunks to track progress
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        chunks.push(value);
        loadedBytes += value.length;
        
        if (totalBytes > 0) {
          const progressPercent = (loadedBytes / totalBytes) * 100;
          setDownloadProgress(progressPercent);
          console.log(`Download progress: ${progressPercent.toFixed(1)}%`);
        }
      }
      
      // Combine chunks into a single Uint8Array
      const allChunksLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const zipData = new Uint8Array(allChunksLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        zipData.set(chunk, offset);
        offset += chunk.length;
      }
      
      setDownloadProgress(100);
      console.log('ZIP download complete');
      
      // Store in session for quick reloads
      storeModelDataInSession(zipData);
      
      // Extract the ZIP file contents
      setModelLoadingStage('extracting');
      const zip = new JSZip();
      
      // Use debounced extraction progress tracking
      const debouncedUpdateProgress = debounce((percent) => {
        setExtractionProgress(percent);
        console.log(`Extraction progress: ${percent}%`);
      }, 100); // Update UI at most every 100ms
      
      // Load the zip with proper extraction progress tracking
      const zipContents = await zip.loadAsync(zipData, {
        checkCRC32: true, // Enable CRC checks for data integrity
        onUpdate: metadata => {
          if (metadata.percent !== undefined) {
            const progressPercent = Math.round(metadata.percent);
            debouncedUpdateProgress(progressPercent);
          }
        }
      });
      
      // Store the ZIP contents in memory cache
      zipCacheRef.current = zipContents;
      
      // List of files in the ZIP
      const fileList = Object.keys(zipContents.files);
      console.log('ZIP contains files:', fileList);
      
      // Validate that we have the model.json file
      if (!fileList.some(file => file.includes('model.json'))) {
        throw new Error('Invalid model ZIP: Missing model.json file. Available files: ' + fileList.join(', '));
      }
      
      setExtractionProgress(100);
      console.log('ZIP extraction complete');
      
      return zipContents;
    } catch (error) {
      console.error('Error downloading or extracting model ZIP:', error);
      throw error;
    }
  };

  /**
   * Creates a custom TensorFlow.js IOHandler to load model from extracted ZIP contents
   * @param {Object} zipContents - The contents of the extracted ZIP file
   * @returns {tf.io.IOHandler} - A custom IOHandler for model loading
   */
  const createZipIOHandler = (zipContents) => {
    return {
      load: async () => {
        try {
          console.log('Loading model from ZIP contents...');
          setModelLoadingStage('loading');
          
          // Find the model.json file in the ZIP
          const modelJsonFile = Object.keys(zipContents.files).find(
            name => name.endsWith('model.json') || name === 'model.json'
          );
          
          if (!modelJsonFile) {
            throw new Error('model.json not found in ZIP file');
          }
          
          // Get the directory path of the model.json file
          const modelDir = modelJsonFile.includes('/') ? 
            modelJsonFile.substring(0, modelJsonFile.lastIndexOf('/') + 1) : 
            '';
          
          // Load and parse model.json
          const modelJsonContent = await zipContents.files[modelJsonFile].async('text');
          const modelJSON = JSON.parse(modelJsonContent);
          
          // Load model weights (binary files)
          const weightSpecs = modelJSON.weightsManifest.flatMap(group => group.weights);
          const weightData = await Promise.all(
            modelJSON.weightsManifest.map(async group => {
              const paths = group.paths;
              const buffers = await Promise.all(
                paths.map(async path => {
                  // Try several possible paths for the weight file
                  const possiblePaths = [
                    modelDir + path,          // Standard path with directory
                    path,                     // Direct path (root of ZIP)
                    'model/' + path,          // Common subfolder
                    'assets/' + path,         // Another common subfolder
                    path.replace(/^\.\//, '') // Remove leading ./ if present
                  ];
                  
                  // Try each path until we find the file
                  let weightFile = null;
                  for (const tryPath of possiblePaths) {
                    weightFile = zipContents.files[tryPath];
                    if (weightFile) {
                      console.log(`Found weight file at path: ${tryPath}`);
                      break;
                    }
                  }
                  
                  if (!weightFile) {
                    console.error('Attempted paths:', possiblePaths);
                    throw new Error(`Weight file not found in ZIP for path: ${path}`);
                  }
                  
                  return await weightFile.async('arraybuffer');
                })
              );
              
              // Concatenate weight file arraybuffers
              const totalByteLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
              const combinedBuffer = new ArrayBuffer(totalByteLength);
              const combinedView = new Uint8Array(combinedBuffer);
              
              let offset = 0;
              for (const buf of buffers) {
                combinedView.set(new Uint8Array(buf), offset);
                offset += buf.byteLength;
              }
              
              return combinedBuffer;
            })
          );
          
          // Combine all weight buffers
          const totalByteLength = weightData.reduce((acc, buf) => acc + buf.byteLength, 0);
          const combinedWeightData = new ArrayBuffer(totalByteLength);
          const combinedWeightView = new Uint8Array(combinedWeightData);
          
          let weightDataOffset = 0;
          for (const buf of weightData) {
            combinedWeightView.set(new Uint8Array(buf), weightDataOffset);
            weightDataOffset += buf.byteLength;
          }
          
          // Create the model artifacts object
          const modelArtifacts = {
            modelTopology: modelJSON.modelTopology,
            weightSpecs: weightSpecs,
            weightData: combinedWeightData,
            format: modelJSON.format,
            generatedBy: modelJSON.generatedBy,
            convertedBy: modelJSON.convertedBy
          };
          
          console.log('Successfully loaded model from ZIP');
          return modelArtifacts;
        } catch (error) {
          console.error('Error in ZIP IOHandler:', error);
          throw error;
        }
      }
    };
  };

  // Load the TensorFlow.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setModelLoadingStage('initializing');
        
        // Initialize TensorFlow.js
        await tf.ready();
        console.log('TensorFlow.js initialized with backend:', tf.getBackend());
        
        // Set appropriate backend based on device
        if (isMobile) {
          if (tf.getBackend() !== 'webgl') {
            try {
              await tf.setBackend('webgl');
              console.log('Switched to WebGL backend for better mobile performance');
            } catch (e) {
              console.warn('Failed to set WebGL backend, using:', tf.getBackend());
            }
          }
        } else {
          // For desktop, prefer WebGL for better performance
          if (tf.getBackend() !== 'webgl') {
            try {
              await tf.setBackend('webgl');
              console.log('Set WebGL backend for desktop');
            } catch (e) {
              console.warn('WebGL backend not available, using:', tf.getBackend());
            }
          }
        }
        
        // Free up memory before loading the new model
        tf.disposeVariables();
        
        let loadedModel;
        
        if (USE_MOCK_MODEL) {
          console.log('Using mock model for testing purposes...');
          loadedModel = createMockModel();
        } else {
          // First try to load from cache using a simpler approach
          try {
            setModelLoadingStage('loading-from-cache');
            console.log('Attempting to load model from IndexedDB cache...');
            
            // Try loading from IndexedDB cache with a direct path
            try {
              loadedModel = await tf.loadLayersModel(`indexeddb://${MODEL_URL.CACHE_KEY}`);
              console.log('Successfully loaded model from IndexedDB cache');
            } catch (indexedDBError) {
              console.warn('Failed to load from IndexedDB cache:', indexedDBError.message);
              
              // Fallback to localStorage if available
              try {
                console.log('Trying localStorage cache as fallback...');
                loadedModel = await tf.loadLayersModel(`localstorage://${MODEL_URL.CACHE_KEY}`);
                console.log('Successfully loaded model from localStorage cache');
              } catch (localStorageError) {
                console.warn('Failed to load from localStorage:', localStorageError.message);
                throw new Error('No cached model available');
              }
            }
          } catch (cacheError) {
            console.log('No cached model found or cache error:', cacheError.message);
            
            // If no cached model, try to download and extract from ZIP
            try {
              // Download and extract the ZIP file
              const zipContents = await downloadAndExtractModelZip();
              
              // Create a custom IOHandler for the ZIP file
              const zipIOHandler = createZipIOHandler(zipContents);
              
              // Load the model using the custom IOHandler
              loadedModel = await tf.loadLayersModel(zipIOHandler);
              console.log('Successfully loaded model from ZIP file');
              
              // Cache the model for future use with a simpler approach
              try {
                setModelLoadingStage('caching');
                
                // Get model size information
                const modelInfo = await loadedModel.getModelArtifactsInfo();
                console.log('Model size:', (modelInfo.modelSizeInBytes / (1024 * 1024)).toFixed(2), 'MB');
                
                // Create metadata for tracking cache freshness
                const modelMetadata = {
                  lastUpdated: Date.now(),
                  version: MODEL_URL.CACHE_KEY,
                  source: 'zip'
                };
                
                // Try to save to IndexedDB first (more storage space)
                try {
                  await loadedModel.save(`indexeddb://${MODEL_URL.CACHE_KEY}`);
                  console.log('Model saved to IndexedDB cache');
                  
                  // Store metadata in localStorage
                  localStorage.setItem(`${MODEL_URL.CACHE_KEY}-metadata`, JSON.stringify({
                    ...modelMetadata,
                    storageType: 'indexeddb'
                  }));
                } catch (indexedDBError) {
                  console.warn('Failed to save model to IndexedDB:', indexedDBError.message);
                  
                  // If IndexedDB fails, try localStorage for small models
                  if (modelInfo.modelSizeInBytes < 5 * 1024 * 1024) {
                    try {
                      await loadedModel.save(`localstorage://${MODEL_URL.CACHE_KEY}`);
                      console.log('Model saved to localStorage (small model only)');
                      
                      // Update metadata
                      localStorage.setItem(`${MODEL_URL.CACHE_KEY}-metadata`, JSON.stringify({
                        ...modelMetadata,
                        storageType: 'localstorage'
                      }));
                    } catch (localStorageError) {
                      console.warn('Failed to save model to localStorage:', localStorageError.message);
                    }
                  } else {
                    console.warn('Model too large for localStorage, skipping backup cache');
                  }
                }
              } catch (cacheSaveError) {
                console.warn('Failed to cache model:', cacheSaveError.message);
              }
            } catch (zipError) {
              console.warn('Failed to load model from ZIP:', zipError.message);
              
              // Fallback to direct model loading if ZIP extraction fails
              try {
                console.log('Falling back to direct model loading from:', MODEL_URL.TFJS_MODEL);
                setModelLoadingStage('loading-from-server');
                
                const modelUrlWithCache = `${MODEL_URL.TFJS_MODEL}?t=${Date.now()}`;
                
                loadedModel = await tf.loadLayersModel(modelUrlWithCache, {
                  onProgress: (fraction) => {
                    const progress = Math.round(fraction * 100);
                    console.log(`Model download progress: ${progress}%`);
                    setDownloadProgress(progress);
                  }
                });
                
                console.log('Successfully downloaded model from remote URL');
              } catch (remoteError) {
                console.warn('Failed to load remote model:', remoteError.message);
                
                // Try fallback to local model
                try {
                  console.log('Attempting to load local TensorFlow.js model from:', MODEL_URL.LOCAL_MODEL);
                  setModelLoadingStage('loading-from-local');
                  loadedModel = await tf.loadLayersModel(MODEL_URL.LOCAL_MODEL);
                  console.log('Successfully loaded local TensorFlow.js model');
                } catch (localError) {
                  console.error('Failed to load local model:', localError.message);
                  
                  // If all model loading attempts fail, fall back to mock model
                  console.log('All model loading attempts failed. Using mock model as last resort...');
                  loadedModel = createMockModel();
                  setError('Could not load sign language recognition model. Using a simulated model for demonstration purposes only.');
                }
              }
            }
          }
        }
        
        // Perform model warm-up with a dummy prediction
        setModelLoadingStage('warming-up');
        console.log('Warming up model...');
        
        await tf.tidy(() => {
          // Create a dummy input that matches the expected shape
          const dummyInput = tf.zeros([1, FRAME_BUFFER_SIZE, 126]);
          
          // Run a prediction to warm up the GPU pipelines
          const warmupResult = loadedModel.predict(dummyInput);
          console.log('Model warmup output shape:', warmupResult.shape);
        });
        
        // Run garbage collection
        console.log('Running garbage collection...');
        tf.disposeVariables();
        
        setModelLoadingStage('ready');
        console.log('Model loaded and ready');
        setModel(loadedModel);
        
      } catch (err) {
        console.error('Error loading sign language model:', err);
        setError(`Failed to load model: ${err.message}`);
        setModelLoadingStage('error');
        
        // If all attempts failed, use mock model as last resort
        if (!USE_MOCK_MODEL) {
          try {
            console.log('Creating emergency mock model after failure...');
            const mockModel = createMockModel();
            setModel(mockModel);
            setError('Using mock model for demonstration purposes. The actual model failed to load.');
          } catch (mockError) {
            setError(`Complete failure: ${err.message}. Mock model also failed: ${mockError.message}`);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModel();
    
    // Cleanup function
    return () => {
      if (model) {
        try {
          model.dispose();
          console.log('Model disposed');
          
          // Clean up any lingering tensors
          tf.disposeVariables();
        } catch (e) {
          console.warn('Error during TensorFlow cleanup:', e);
        }
      }
      
      zipCacheRef.current = null;
    };
  }, [isMobile, classLabels.length]);
  
  /**
   * Process hand landmarks and update the buffer
   * @param {Object} landmarkerResult - Results from MediaPipe containing hand landmarks
   * @returns {boolean} - Whether the buffer is full (ready for prediction)
   */
  const processHandLandmarks = (landmarkerResult) => {
    // Create an array to store all hand landmarks (for up to 2 hands)
    // Each hand has 21 landmarks with x, y, z coordinates (63 values per hand)
    // Total array length for 2 hands: 126 values
    const handLandmarksArray = new Array(126).fill(0);
    
    // Process detected hands (up to 2)
    if (landmarkerResult.landmarks) {
      landmarkerResult.landmarks.forEach((handLandmarks, handIndex) => {
        if (handIndex >= 2) return; // Only process maximum of 2 hands
        
        // For each landmark in the hand
        handLandmarks.forEach((landmark, landmarkIndex) => {
          // Calculate base index for this landmark in the flattened array
          const baseIndex = handIndex * 63 + landmarkIndex * 3;
          
          // Store normalized x, y, z coordinates
          handLandmarksArray[baseIndex] = landmark.x;     // x coordinate
          handLandmarksArray[baseIndex + 1] = landmark.y; // y coordinate
          handLandmarksArray[baseIndex + 2] = landmark.z; // z coordinate
        });
      });
    }
    
    // Add new frame data to buffer
    bufferRef.current.push(handLandmarksArray);
    
    // Keep only the most recent FRAME_BUFFER_SIZE frames
    if (bufferRef.current.length > FRAME_BUFFER_SIZE) {
      bufferRef.current.shift(); // Remove oldest frame
    }
    
    // Update buffer full state
    const isFull = bufferRef.current.length === FRAME_BUFFER_SIZE;
    setIsBufferFull(isFull);
    
    return isFull;
  };

  /**
   * Run prediction on the current buffer
   */
  const runPrediction = async () => {
    if (!model || !isBufferFull) {
      return null;
    }
    
    try {
      const currentTime = performance.now();
      // Throttle predictions to avoid excessive processing
      if (currentTime - lastPredictionTimeRef.current < 200) { // Max 5 predictions per second
        return null;
      }
      
      lastPredictionTimeRef.current = currentTime;
      
      // For mock model, generate random predictions
      if (USE_MOCK_MODEL) {
        const randomIndex = Math.floor(Math.random() * classLabels.length);
        const mockConfidence = 0.7 + Math.random() * 0.28;
        
        const newMockPrediction = {
          label: classLabels[randomIndex],
          confidence: mockConfidence,
          isMock: true
        };
        
        setPrediction(newMockPrediction);
        return newMockPrediction;
      }
      
      // Use tf.tidy for automatic memory cleanup
      const predictionResult = await tf.tidy(() => {
        try {
          // Verify the buffer has the expected shape
          if (bufferRef.current.length !== FRAME_BUFFER_SIZE) {
            console.warn(`Buffer size mismatch: expected ${FRAME_BUFFER_SIZE}, got ${bufferRef.current.length}`);
            return null;
          }
          
          // Create input tensor from landmarks buffer [1, FRAME_BUFFER_SIZE, 126]
          const inputTensor = tf.tensor3d([bufferRef.current], [1, FRAME_BUFFER_SIZE, 126]);
          
          // Run prediction
          const predictions = model.predict(inputTensor);
          
          // Get prediction data
          return predictions.data().then(predictionArray => {
            if (!predictionArray || predictionArray.length === 0) {
              return null;
            }
            
            // Find highest probability class
            let maxProb = 0;
            let maxIndex = 0;
            
            for (let i = 0; i < predictionArray.length; i++) {
              if (predictionArray[i] > maxProb) {
                maxProb = predictionArray[i];
                maxIndex = i;
              }
            }
            
            // Ensure index is within bounds of class labels
            const safeIndex = Math.min(maxIndex, classLabels.length - 1);
            return [classLabels[safeIndex], maxProb];
          });
        } catch (innerError) {
          console.error('Error during prediction computation:', innerError);
          return null;
        }
      });
      
      // If prediction failed, early return
      if (!predictionResult) return null;
      
      // Unpack prediction result
      const [predictedLabel, predictedConfidence] = predictionResult;
      
      // Only update if confidence exceeds threshold
      if (predictedConfidence >= CONFIDENCE_THRESHOLD) {
        const newPrediction = {
          label: predictedLabel,
          confidence: predictedConfidence,
          isMock: USE_MOCK_MODEL
        };
        
        setPrediction(newPrediction);
        return newPrediction;
      }
      
      return null;
    } catch (error) {
      console.error('Prediction error:', error);
      return null;
    }
  };
  
  /**
   * Reset the buffer and prediction when no hands are detected
   */
  const resetBuffer = () => {
    bufferRef.current = [];
    setIsBufferFull(false);
    setPrediction(null);
  };
  
  return {
    model,
    isLoading,
    error,
    prediction,
    isBufferFull,
    classLabels,
    downloadProgress,
    extractionProgress,
    modelLoadingStage,
    processHandLandmarks,
    runPrediction,
    resetBuffer,
    bufferLength: bufferRef.current.length,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    isMockModel: USE_MOCK_MODEL || (prediction && prediction.isMock)
  };
};

export default useSignLanguageModel;
