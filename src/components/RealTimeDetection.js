import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

/**
 * RealTimeDetection Component
 * 
 * This component displays real-time sign language detection results
 * with visual feedback and animations to improve user experience.
 */
const RealTimeDetection = ({ prediction, confidenceThreshold, isVisible = true }) => {
  const [animateText, setAnimateText] = React.useState(false);
  const [lastPrediction, setLastPrediction] = React.useState(null);
  
  // Trigger animation when prediction changes
  useEffect(() => {
    if (prediction && prediction.label !== lastPrediction) {
      setAnimateText(true);
      setLastPrediction(prediction.label);
      
      // Reset animation after it completes
      const timer = setTimeout(() => {
        setAnimateText(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [prediction, lastPrediction]);
  
  if (!isVisible) {
    return null;
  }

  return (
    <DetectionContainer>
      {prediction && prediction.confidence >= confidenceThreshold ? (
        <>
          <DetectedLabel animate={animateText}>{prediction.label}</DetectedLabel>
          <ConfidenceBar level={prediction.confidence}>
            <ConfidenceLevel level={prediction.confidence} />
          </ConfidenceBar>
        </>
      ) : (
        <WaitingText>Waiting for signs...</WaitingText>
      )}
    </DetectionContainer>
  );
};

// Animation keyframes
const popIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
`;

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

// Styled components
const DetectionContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
  min-height: 70px;
`;

const DetectedLabel = styled.div`
  color: white;
  font-size: 28px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  animation: ${props => props.animate ? popIn : 'none'} 0.5s ease-out;
  
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const ConfidenceBar = styled.div`
  width: 80%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  margin-top: 8px;
  overflow: hidden;
`;

const ConfidenceLevel = styled.div`
  height: 100%;
  width: ${props => props.level * 100}%;
  background-color: ${props => 
    props.level > 0.85 ? '#4CAF50' :
    props.level > 0.70 ? '#FFC107' : '#F44336'};
  border-radius: 4px;
  transition: width 0.3s ease-out;
`;

const WaitingText = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 20px;
  font-style: italic;
  animation: ${pulse} 2s infinite ease-in-out;
  
  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

export default RealTimeDetection;
