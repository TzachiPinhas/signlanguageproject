import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

/**
 * Component for tracking and displaying model extraction progress.
 * Optimizes UI updates by debouncing progress updates.
 * 
 * @param {Object} props Component props
 * @param {number} props.progress Current progress percentage (0-100)
 * @param {string} props.stage Current processing stage (downloading, extracting, etc.)
 * @param {boolean} props.showDetails Whether to show detailed progress information
 */
const ExtractionProgressTracker = ({ 
  progress = 0, 
  stage = 'extracting',
  showDetails = false
}) => {
  // Use a debounced update for progress to avoid excessive re-renders
  const [displayedProgress, setDisplayedProgress] = useState(progress);
  
  // Debounce function for smoother UI updates
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  // Update displayed progress with debouncing
  const updateProgress = useCallback(
    debounce(progress => {
      setDisplayedProgress(progress);
    }, 100),
    []
  );
  
  // Update progress when the prop changes
  useEffect(() => {
    if (progress !== displayedProgress) {
      updateProgress(progress);
    }
  }, [progress, displayedProgress, updateProgress]);
  
  // Generate appropriate status message
  const getStatusMessage = () => {
    switch (stage) {
      case 'downloading':
        return `Downloading model files (${displayedProgress.toFixed(0)}%)`;
      case 'extracting':
        return `Extracting model files (${displayedProgress.toFixed(0)}%)`;
      case 'loading':
        return 'Loading model from extracted files';
      default:
        return `Processing model (${displayedProgress.toFixed(0)}%)`;
    }
  };
  
  return (
    <ProgressContainer>
      <ProgressLabel>{getStatusMessage()}</ProgressLabel>
      <ProgressBarContainer>
        <ProgressBar width={`${displayedProgress}%`} />
      </ProgressBarContainer>
      
      {showDetails && (
        <ProgressDetails>
          {stage === 'extracting' && (
            <div>
              <p>Extracted {displayedProgress.toFixed(0)}%</p>
              <p>Optimizing files for faster model loading</p>
            </div>
          )}
        </ProgressDetails>
      )}
    </ProgressContainer>
  );
};

const ProgressContainer = styled.div`
  margin: 16px 0;
  width: 100%;
`;

const ProgressLabel = styled.div`
  margin-bottom: 8px;
  font-size: 14px;
  color: #555;
`;

const ProgressBarContainer = styled.div`
  height: 8px;
  background-color: #eaeaea;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBar = styled.div`
  height: 100%;
  background-color: #4285f4;
  width: ${props => props.width || '0%'};
  transition: width 0.3s ease-out;
`;

const ProgressDetails = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: #777;
`;

export default ExtractionProgressTracker;
