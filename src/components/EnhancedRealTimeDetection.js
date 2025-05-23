import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

/**
 * EnhancedRealTimeDetection Component
 * 
 * This component displays real-time sign language detection results
 * with improved visual feedback and animations for better user experience.
 */
const EnhancedRealTimeDetection = ({ prediction, confidenceThreshold, isVisible = true }) => {
  const [animateText, setAnimateText] = useState(false);
  const [lastPrediction, setLastPrediction] = useState(null);
  const [hasDetection, setHasDetection] = useState(false);
  
  // Trigger animation when prediction changes
  useEffect(() => {
    if (prediction && prediction.confidence >= confidenceThreshold && prediction.label !== lastPrediction) {
      setAnimateText(true);
      setLastPrediction(prediction.label);
      setHasDetection(true);
      
      // Reset animation after it completes
      const timer = setTimeout(() => {
        setAnimateText(false);
      }, 500);
      
      return () => clearTimeout(timer);
    } else if (!prediction || prediction.confidence < confidenceThreshold) {
      setHasDetection(false);
    }
  }, [prediction, lastPrediction, confidenceThreshold]);
  
  if (!isVisible) {
    return null;
  }

  return (
    <DetectionContainer active={hasDetection}>
      {prediction && prediction.confidence >= confidenceThreshold ? (
        <>
          <DetectedSign animate={animateText}>{prediction.label}</DetectedSign>
          <ConfidenceContainer>
            <ConfidenceLabel>Confidence:</ConfidenceLabel>
            <ConfidenceValue>{Math.round(prediction.confidence * 100)}%</ConfidenceValue>
          </ConfidenceContainer>
          <ConfidenceBar>
            <ConfidenceLevel level={prediction.confidence} />
          </ConfidenceBar>
        </>
      ) : (
        <WaitingDisplay>
          <WaitingText>Waiting for signs...</WaitingText>
          <WaitingInstructions>Position your hands clearly in the frame</WaitingInstructions>
        </WaitingDisplay>
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

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Styled components
const DetectionContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background-color: ${props => props.active 
    ? 'rgba(25, 118, 210, 0.8)' 
    : 'rgba(0, 0, 0, 0.6)'};
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
  min-height: 90px;
  transition: background-color 0.3s ease;
  ${props => props.active && `
    background: linear-gradient(270deg, rgba(25, 118, 210, 0.8), rgba(66, 133, 244, 0.8), rgba(52, 168, 83, 0.8));
    background-size: 600% 600%;
    animation: ${gradientShift} 4s ease infinite;
  `}
`;

const DetectedSign = styled.div`
  color: white;
  font-size: 32px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  animation: ${props => props.animate ? popIn : 'none'} 0.5s ease-out;
  margin-bottom: 8px;
  
  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const ConfidenceContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 6px;
`;

const ConfidenceLabel = styled.span`
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin-right: 6px;
`;

const ConfidenceValue = styled.span`
  color: white;
  font-weight: bold;
  font-size: 16px;
`;

const ConfidenceBar = styled.div`
  width: 80%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
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

const WaitingDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const WaitingText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 20px;
  font-weight: bold;
  animation: ${pulse} 2s infinite ease-in-out;
  margin-bottom: 4px;
  
  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const WaitingInstructions = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

export default EnhancedRealTimeDetection;
