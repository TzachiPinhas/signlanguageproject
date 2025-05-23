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

// For debugging model loading
const checkModelFile = async (path) => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.error(`Model file check failed: ${path} - ${response.status} ${response.statusText}`);
      return false;
    }
    console.log(`Model file found: ${path} - ${response.status} OK`);
    return true;
  } catch (error) {
    console.error(`Error checking model file: ${path} - ${error.message}`);
    return false;
  }
};

// Default sign language class labels
const DEFAULT_CLASS_LABELS = [
  "Hello", "Thank you", "Yes", "No", "Please", "Sorry",
  "Good", "Bad", "Name", "What", "Where", "When", "How",
  "Help", "Want", "Love", "Like", "Need", "Time", "Now"
];

/**
 * Custom hook for sign language recognition model handling
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
   */
  const createMockModel = () => {
    console.log('Creating mock TensorFlow.js model for testing...');
    
    const model = tf.sequential();
    
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
    
    model.add(tf.layers.dropout({
      rate: 0.2
    }));
    
    model.add(tf.layers.dense({
      units: classLabels.length,
      activation: 'softmax'
    }));
    
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
   */
  const storeModelDataInSession = (data) => {
    try {
      if (data.length < 10 * 1024 * 1024) { // Only store if <10MB
        console.log('Storing model data in session storage for faster reload');
        
        // Store as base64 string for better performance
        const blob = new Blob([data]);
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64data = reader.result.split(',')[1];
            sessionStorage.setItem(`${MODEL_URL.CACHE_KEY}-data`, base64data);
            sessionStorage.setItem(`${MODEL_URL.CACHE_KEY}-timestamp`, Date.now().toString());
            console.log('Model data stored in session storage (base64)');
          } catch (e) {
            console.warn('Failed to save base64 data to session storage:', e.message);
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (e) {
      console.warn('Failed to store model in session storage:', e.message);
    }
  };

  /**
   * Helper function to retrieve model data from session storage
   */
  const getModelDataFromSession = () => {
    try {
      const timestamp = sessionStorage.getItem(`${MODEL_URL.CACHE_KEY}-timestamp`);
      const base64data = sessionStorage.getItem(`${MODEL_URL.CACHE_KEY}-data`);
      
      // Verify data is valid and fresh (less than 10 minutes old)
      if (timestamp && base64data && (Date.now() - parseInt(timestamp) < 10 * 60 * 1000)) {
        console.log('Found valid model data in session storage');
        
        // Convert base64 back to ArrayBuffer
        const binaryString = atob(base64data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes.buffer;
      }
    } catch (e) {
      console.warn('Error retrieving model from session storage:', e.message);
    }
    
    console.log('No valid model data in session storage');
    return null;
  };

  /**
   * Downloads and extracts a ZIP file containing a TensorFlow.js model
   */
  const downloadAndExtractModelZip = async () => {
    try {
      setModelLoadingStage('downloading');
      
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
          // Use the extraction progress tracking
          const debouncedUpdateProgress = debounce((percent) => {
            setExtractionProgress(percent);
            console.log(`Extraction progress: ${percent}%`);
          }, 100);
          
          const zipContents = await zip.loadAsync(sessionStorageData, {
            checkCRC32: true,
            onUpdate: metadata => {
              if (metadata.percent !== undefined) {
                const progressPercent = Math.round(metadata.percent);
                debouncedUpdateProgress(progressPercent);
              }
            }
          });
          
          // Store in memory cache
          zipCacheRef.current = zipContents;
          
          // Validate that we have the expected files
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
      
      // Create a debounced progress updater to improve performance
      const debouncedUpdateProgress = debounce((percent) => {
        setExtractionProgress(percent);
        console.log(`Extraction progress: ${percent}%`);
      }, 100);
      
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
          let totalByteLength = weightData.reduce((acc, buf) => acc + buf.byteLength, 0);
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
        console.log('🔍 MODEL LOADING: Starting model initialization process');
        
        // Initialize TensorFlow.js
        await tf.ready();
        console.log('✅ TensorFlow.js initialized with backend:', tf.getBackend());
        
        // First check if model files exist (to give better error messages)
        console.log('🔍 Checking for local model file existence...');
        const modelExists = await checkModelFile(MODEL_URL.LOCAL_MODEL);
        const weightsExist = await checkModelFile('/models/sign_language_model/group1-shard1of1.bin');
        
        if (!modelExists || !weightsExist) {
          console.error('❌ LOCAL MODEL FILES NOT FOUND! This will likely cause loading to fail.');
          if (!modelExists) console.error('❌ Missing model.json file');
          if (!weightsExist) console.error('❌ Missing weight files');
        } else {
          console.log('✅ Local model files verified');
        }
        
        // Set appropriate backend based on device
        if (isMobile) {
          // Mobile devices should use WebGL when available for better performance
          if (tf.getBackend() !== 'webgl') {
            try {
              await tf.setBackend('webgl');
              console.log('Switched to WebGL backend for better mobile performance');
            } catch (e) {
              console.warn('Failed to set WebGL backend, using:', tf.getBackend());
            }
          }
        } else {
          // For desktop, prefer WebGL but try to utilize WebGL 2.0 if available
          const webGLVersion = typeof document !== 'undefined' && 
            document.createElement('canvas').getContext('webgl2') ? '2.0' : '1.0';
          console.log(`WebGL version available: ${webGLVersion}`);
          
          // Set backend flags for optimal performance
          tf.ENV.set('WEBGL_VERSION', webGLVersion === '2.0' ? 2 : 1);
          tf.ENV.set('WEBGL_FORCE_F16_TEXTURES', false);
          tf.ENV.set('WEBGL_PACK', true);
        }
        
        // Free up memory before loading the new model
        tf.disposeVariables();
        
        let loadedModel;
        
        if (USE_MOCK_MODEL) {
          console.log('Using mock model for testing purposes...');
          loadedModel = createMockModel();
        } else {
          // Try loading model from different sources in order of reliability
          let modelLoadSuccess = false;
          
          // 1. First try local model (most reliable)
          if (!modelLoadSuccess && modelExists && weightsExist) {
            try {
              console.log(`🔍 Loading local model from: ${MODEL_URL.LOCAL_MODEL}`);
              setModelLoadingStage('loading-local');
              
              loadedModel = await tf.loadLayersModel(MODEL_URL.LOCAL_MODEL);
              console.log('✅ Successfully loaded local model from public directory');
              modelLoadSuccess = true;
            } catch (localModelError) {
              console.error('❌ Local model loading failed:', localModelError.message);
            }
          }
          
          // 2. Try IndexedDB cache if local failed
          if (!modelLoadSuccess) {
            try {
              console.log('🔍 Attempting to load model from IndexedDB cache');
              setModelLoadingStage('loading-from-cache');
              
              loadedModel = await tf.loadLayersModel(`indexeddb://${MODEL_URL.CACHE_KEY}`);
              console.log('✅ Successfully loaded model from IndexedDB cache');
              modelLoadSuccess = true;
            } catch (indexedDBError) {
              console.warn('❌ Failed to load from IndexedDB cache:', indexedDBError.message);
            }
          }
          
          // 3. Try localStorage as another cache option if previous methods failed
          if (!modelLoadSuccess) {
            try {
              console.log('🔍 Attempting to load model from localStorage cache');
              loadedModel = await tf.loadLayersModel(`localstorage://${MODEL_URL.CACHE_KEY}`);
              console.log('✅ Successfully loaded model from localStorage cache');
              modelLoadSuccess = true;
            } catch (localStorageError) {
              console.warn('❌ Failed to load from localStorage cache:', localStorageError.message);
            }
          }
          
          // 4. Try ZIP download as fallback if all local methods failed
          if (!modelLoadSuccess) {
            try {
              console.log('🔍 Trying ZIP download as fallback...');
              const zipContents = await downloadAndExtractModelZip();
              
              // Create a custom IOHandler for the ZIP file
              const zipIOHandler = createZipIOHandler(zipContents);
              
              // Load the model using the custom IOHandler
              loadedModel = await tf.loadLayersModel(zipIOHandler);
              console.log('✅ Successfully loaded model from ZIP file');
              modelLoadSuccess = true;
              
              // Try to cache the model for future use
              try {
                setModelLoadingStage('caching');
                console.log('Saving model to IndexedDB cache');
                await loadedModel.save(`indexeddb://${MODEL_URL.CACHE_KEY}`);
                console.log('Model saved to IndexedDB cache');
              } catch (cachingError) {
                console.warn('Failed to cache model:', cachingError.message);
              }
            } catch (zipError) {
              console.error('❌ Failed to load model from ZIP:', zipError.message);
            }
          }
          
          // 5. Final fallback - load from remote server directly
          if (!modelLoadSuccess) {
            try {
              console.log('🔍 Falling back to direct model loading from:', MODEL_URL.TFJS_MODEL);
              setModelLoadingStage('loading-from-server');
              
              const modelUrlWithCache = `${MODEL_URL.TFJS_MODEL}?t=${Date.now()}`;
              loadedModel = await tf.loadLayersModel(modelUrlWithCache, {
                onProgress: (fraction) => {
                  const progress = Math.round(fraction * 100);
                  console.log(`Model download progress: ${progress}%`);
                  setDownloadProgress(progress);
                }
              });
              
              console.log('✅ Successfully downloaded model from remote URL');
              modelLoadSuccess = true;
              
              // Try to cache this model too
              try {
                await loadedModel.save(`indexeddb://${MODEL_URL.CACHE_KEY}`);
                console.log('Direct-loaded model saved to cache');
              } catch (error) {
                console.warn('Failed to cache direct-loaded model:', error.message);
              }
            } catch (directLoadError) {
              console.error('❌ All loading methods failed:', directLoadError);
            }
          }
          
          // Last resort - use mock model if all methods failed
          if (!modelLoadSuccess) {
            console.warn('🔍 Creating mock model as emergency fallback');
            loadedModel = createMockModel();
            setError('❌ Could not load real model. Using mock model for demonstration only.');
          }
        }        // Warm up the model with a dummy prediction
        setModelLoadingStage('warming-up');
        console.log('🔍 Warming up model...');
        
        let warmupSuccess = false;
        
        await tf.tidy(() => {
          try {
            // Create a dummy input that matches the expected shape
            const dummyInput = tf.zeros([1, FRAME_BUFFER_SIZE, 126]);
            
            // Make sure model and predict function are available
            if (!loadedModel) {
              console.error('❌ Cannot warm up: model is null or undefined');
              return null;
            }
            
            if (typeof loadedModel.predict !== 'function') {
              console.error('❌ Cannot warm up: model.predict is not a function');
              console.error('Model type:', typeof loadedModel);
              console.error('Model keys:', Object.keys(loadedModel));
              return null;
            }
            
            // Run a prediction to warm up the GPU pipelines
            const warmupResult = loadedModel.predict(dummyInput);
            
            if (!warmupResult) {
              console.error('❌ Warmup produced null result');
              return null;
            }
            
            console.log('✅ Model warmup successful, output shape:', warmupResult.shape);
            console.log('Output size:', warmupResult.size);
            console.log('Output dtype:', warmupResult.dtype);
            
            warmupSuccess = true;
            
            // Return null to ensure tensor is disposed
            return null;
          } catch (warmupError) {
            console.error('❌ Error during model warmup:', warmupError.message);
            console.error('Error details:', warmupError);
            return null;
          }
        });
        
        if (!warmupSuccess) {
          console.warn('⚠️ Model warmup failed, but continuing with loading process');
        }
        
        // Print model summary if available
        if (loadedModel && typeof loadedModel.summary === 'function') {
          try {
            console.log('Model summary:');
            loadedModel.summary();
          } catch (error) {
            console.warn('Could not print model summary:', error.message);
          }
        }
        
        // Validate the model can make predictions with correct dimensions
        try {
          console.log('🔍 Validating model output dimensions...');
          const validationResult = await tf.tidy(() => {
            const testInput = tf.zeros([1, FRAME_BUFFER_SIZE, 126]);
            const output = loadedModel.predict(testInput);
            const shape = output.shape;
            const outputLength = output.shape[output.shape.length - 1];
            
            return {
              shape: shape,
              outputSize: outputLength,
              expectedSize: classLabels.length
            };
          });
          
          console.log('Model validation:', validationResult);
          
          if (validationResult.outputSize !== validationResult.expectedSize) {
            console.warn(`⚠️ Output size mismatch: expected ${validationResult.expectedSize}, got ${validationResult.outputSize}`);
          } else {
            console.log('✅ Model output dimensions validated successfully');
          }
        } catch (validationError) {
          console.error('❌ Model validation failed:', validationError.message);
        }
          setModelLoadingStage('ready');
        console.log('✅ MODEL LOADING COMPLETE: Model loaded and ready for prediction');
        
        // Final verification before setting the model
        if (loadedModel && typeof loadedModel.predict === 'function') {
          setModel(loadedModel);
          console.log('✅ Model successfully set and ready for use');
        } else {
          throw new Error('Model validation failed - model or predict function not available');
        }
      } catch (err) {
        console.error('❌ CRITICAL ERROR loading sign language model:', err);
        setError(`Failed to load model: ${err.message}`);
        setModelLoadingStage('error');
        
        // If all attempts failed, use mock model as last resort
        if (!USE_MOCK_MODEL) {
          try {
            console.log('🔍 Creating emergency mock model after failure...');
            const mockModel = createMockModel();
            
            if (mockModel && typeof mockModel.predict === 'function') {
              setModel(mockModel);
              setError('Using mock model for demonstration purposes. The actual model failed to load.');
              console.warn('⚠️ Using mock model as fallback - recognition will not be accurate');
            } else {
              setError(`Complete failure: ${err.message}. Mock model creation also failed.`);
            }
          } catch (mockError) {
            setError(`Complete failure: ${err.message}. Mock model also failed: ${mockError.message}`);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    // Start model loading immediately
    console.log('🔍 Initiating model loading process...');
    loadModel();
    
    // Cleanup function
    return () => {
      if (model) {
        try {
          model.dispose();
          console.log('Model disposed');
          
          // Clean up any lingering tensors
          tf.disposeVariables();
          console.log('Disposed all TF variables');
        } catch (e) {
          console.warn('Error during TensorFlow cleanup:', e);
        }
      }
      
      // Clear the ZIP cache when component unmounts
      zipCacheRef.current = null;
    };
  }, [isMobile, classLabels.length]);
  
  /**
   * Process hand landmarks and update the buffer
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
    // Check if model is loaded and buffer is full
    if (!model) {
      console.error('Cannot run prediction: model not loaded');
      return null;
    }
    
    if (!isBufferFull) {
      console.log('Buffer not full yet, skipping prediction');
      return null;
    }
    
    // Verify model has predict function
    if (typeof model.predict !== 'function') {
      console.error('Cannot run prediction: model.predict is not a function');
      return null;
    }
    
    try {
      const currentTime = performance.now();
      
      // Throttle predictions to avoid excessive processing
      if (currentTime - lastPredictionTimeRef.current < 200) {
        return null;
      }
      
      lastPredictionTimeRef.current = currentTime;
      
      // If we're using a mock model, occasionally vary the predictions for testing UI
      if (USE_MOCK_MODEL || (model && model.mockModel)) {
        // Every 3 seconds, change the prediction to make it more realistic for testing
        const shouldChangeRandomly = Math.floor(currentTime / 3000) % 3 === 0;
        
        if (shouldChangeRandomly) {
          // Generate a random index for the mock prediction
          const randomIndex = Math.floor(Math.random() * classLabels.length);
          // Generate a random confidence score between 0.7 and 0.98
          const mockConfidence = 0.7 + Math.random() * 0.28;
          
          const newMockPrediction = {
            label: classLabels[randomIndex],
            confidence: mockConfidence,
            isMock: true
          };
          
          setPrediction(newMockPrediction);
          return newMockPrediction;
        }
      }
      
      // Use tf.tidy for automatic memory cleanup
      const predictionResult = await tf.tidy(() => {
        try {
          // Verify the buffer has the expected shape
          if (bufferRef.current.length !== FRAME_BUFFER_SIZE) {
            console.warn(`Buffer size mismatch: expected ${FRAME_BUFFER_SIZE}, got ${bufferRef.current.length}`);
            return null;
          }
          
          // Shape: [1, FRAME_BUFFER_SIZE, 126]
          const inputTensor = tf.tensor3d([bufferRef.current], [1, FRAME_BUFFER_SIZE, 126]);
          
          // Run prediction
          const predictions = model.predict(inputTensor);
          
          // Get prediction data
          return predictions.data().then(predictionArray => {
            if (!predictionArray || predictionArray.length === 0) {
              console.error('Empty prediction array');
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
