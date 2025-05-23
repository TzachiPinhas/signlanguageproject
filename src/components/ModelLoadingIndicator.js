import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Component to display the model loading progress and status with enhanced detail
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isLoading Whether the model is currently loading
 * @param {string} props.error Error message, if any
 * @param {string} props.loadingStage Current loading stage (e.g., downloading, extracting, etc.)
 * @param {number} props.downloadProgress Download progress (0-100)
 * @param {number} props.extractionProgress Extraction progress (0-100)
 * @param {boolean} props.isMockModel Whether a mock model is being used
 * @param {function} props.onRetry Callback when retry button is clicked
 */
const ModelLoadingIndicator = ({ 
  isLoading,
  error,
  loadingStage,
  downloadProgress,
  extractionProgress,
  isMockModel,
  onRetry
}) => {
  const { theme: COLORS } = useTheme();
  
  if (!isLoading && !error) {
    return null; // Don't render anything if not loading and no error
  }

  // Determine status message and progress
  let statusMessage = 'Loading sign language recognition model...';
  let progressValue = 0;
    switch (loadingStage) {
    case 'initializing':
      statusMessage = 'Initializing TensorFlow.js engine...';
      progressValue = 5;
      break;    
    case 'downloading':
      statusMessage = `Downloading model (${downloadProgress.toFixed(0)}%)...`;
      progressValue = downloadProgress;
      break;
    case 'download-retry':
      statusMessage = 'Connection issue. Retrying download...';
      progressValue = downloadProgress;
      break;
    case 'extracting':
      statusMessage = `Extracting model files (${extractionProgress.toFixed(0)}%)...`;
      progressValue = extractionProgress;
      break;
    case 'loading':
      statusMessage = 'Loading sign language model from extracted files...';
      progressValue = 80;
      break;
    case 'loading-from-cache':
      statusMessage = 'Loading model from browser cache...';
      progressValue = 60;
      break;
    case 'loading-from-server':      statusMessage = 'Loading model directly from server...';
      progressValue = downloadProgress;
      break;    case 'loading-from-local':
      statusMessage = 'Loading local model fallback...';
      progressValue = 70;
      break;
    case 'caching':
      statusMessage = 'Caching model for faster future access...';
      progressValue = 85;
      break;
    case 'warming-up':
      statusMessage = 'Optimizing model performance...';
      progressValue = 95;
      break;
    case 'error':
      statusMessage = error || 'Error loading model';
      progressValue = 100;
      break;
    default:
      statusMessage = 'Loading model...';
      progressValue = 50;
  }

  // Format error message to be more user-friendly and provide helpful suggestions
  const formatErrorMessage = (error) => {
    if (!error) {
      return { message: 'Unknown error occurred', suggestion: 'Please try again later.' };
    }
    
    // Network related errors
    if (error.includes('network') || 
        error.includes('fetch') || 
        error.includes('download') ||
        error.includes('timeout') ||
        error.includes('Failed to fetch') ||
        error.includes('CORS')) {
      return {
        message: 'Network connection issue detected',
        suggestion: 'Please check your internet connection and try again. The model requires downloading data from our servers.'
      };
    }
    
    // Storage related errors
    if (error.includes('storage') || 
        error.includes('IndexedDB') || 
        error.includes('localStorage') || 
        error.includes('quota')) {
      return {
        message: 'Storage issue detected',
        suggestion: 'Your browser may have limited storage space. Try clearing some browser data or using a different browser.'
      };
    }
    
    // WebGL/GPU errors
    if (error.includes('WebGL') || 
        error.includes('GPU') || 
        error.includes('hardware')) {
      return {
        message: 'Graphics processing issue',
        suggestion: 'Your device may have limited GPU support. Try using a device with better hardware support.'
      };
    }
    
    // Memory errors
    if (error.includes('memory') || 
        error.includes('heap') || 
        error.includes('allocation')) {
      return {
        message: 'Memory issue detected',
        suggestion: 'Your device may have insufficient memory. Try closing other tabs or applications.'
      };
    }
    
    // Default case - just return the original error with a generic suggestion
    return {
      message: error,
      suggestion: 'This may be a temporary issue. Please try again later.'
    };
  };

  const formattedError = formatErrorMessage(error);

  return (
    <LoadingOverlay>
      <LoadingCard>
        <h3>Sign Language Recognition</h3>
        <p>{statusMessage}</p>
        
        {error ? (
          <ErrorMessage>
            <p>{formattedError.message}</p>
            <Suggestion>{formattedError.suggestion}</Suggestion>
            {onRetry && (
              <RetryButton 
                onClick={onRetry}
                color={COLORS.error}
                hoverColor={COLORS.errorDark}
              >
                Retry
              </RetryButton>
            )}
          </ErrorMessage>
        ) : (
          <ProgressBarContainer>
            <ProgressBar width={`${progressValue}%`} color={COLORS.accent} />
          </ProgressBarContainer>
        )}
        
        {isMockModel && (
          <WarningMessage>
            Using a simulated model for demonstration purposes only. 
            Recognition accuracy will be limited.
          </WarningMessage>
        )}

        <InfoText>
          This model is downloaded once and cached for future use.
        </InfoText>
      </LoadingCard>
    </LoadingOverlay>
  );
};

// Styled components
const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const LoadingCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
  
  h3 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 1.5rem;
  }
  
  p {
    margin-bottom: 20px;
    color: #555;
  }
`;

const ProgressBarContainer = styled.div`
  height: 12px;
  background-color: #eee;
  border-radius: 6px;
  overflow: hidden;
  margin: 16px 0;
`;

const ProgressBar = styled.div`
  height: 100%;
  width: ${props => props.width || '0%'};
  background-color: ${props => props.color || '#4caf50'};
  border-radius: 6px;
  transition: width 0.3s ease-in-out;
`;

const ErrorMessage = styled.div`
  margin: 16px 0;
  padding: 12px;
  border-radius: 6px;
  background-color: #ffebee;
  color: #c62828;
  
  p {
    color: #c62828;
    margin-bottom: 12px;
  }
`;

const Suggestion = styled.p`
  font-size: 0.9rem;
  color: #666;
  font-style: italic;
  margin: 8px 0 16px;
`;

const WarningMessage = styled.div`
  margin-top: 16px;
  padding: 12px;
  border-radius: 6px;
  background-color: #fff8e1;
  color: #ff8f00;
  font-size: 0.9rem;
`;

const InfoText = styled.p`
  margin-top: 16px;
  font-size: 0.8rem;
  color: #757575;
`;

const RetryButton = styled.button`
  background-color: ${props => props.color || '#f44336'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: ${props => props.hoverColor || '#d32f2f'};
  }
`;

export default ModelLoadingIndicator;
