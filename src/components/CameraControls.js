import React from 'react';
import styled from 'styled-components';

/**
 * CameraControls Component
 * 
 * This component provides an enhanced user interface for camera controls
 * with a focus on video upload option only (no recording functionality)
 */
const CameraControls = ({ 
  onUploadPress,
  isDisabled,
  colors
}) => {
  return (
    <ControlsContainer>
      {/* Upload video button */}
        <UploadButton 
          onClick={onUploadPress}
          disabled={isDisabled || isRecording}
          borderColor={colors?.border || '#DADCE0'}
          backgroundColor={colors?.card || '#FFFFFF'}
        >
          <UploadButtonContent>
            <UploadIcon>📁</UploadIcon>
            <UploadTextContainer>
              <UploadLabel color={colors?.text || '#202124'}>Upload Video</UploadLabel>
              <UploadDescription color={colors?.textSecondary || '#5F6368'}>
                Select an existing video from your device
              </UploadDescription>
            </UploadTextContainer>
          </UploadButtonContent>
        </UploadButton>
      </UploadButtonContainer>
    </ControlsContainer>
  );
};

// Styled components
const ControlsContainer = styled.div`
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RecordButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    margin-bottom: 16px;
  }
`;

const RecordButton = styled.button`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: ${props => props.backgroundColor};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.3);
  }
  
  &:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  @media (max-width: 768px) {
    width: 64px;
    height: 64px;
  }
`;

const StopButton = styled(RecordButton)`
  border-radius: 16px;
`;

const RecordIcon = styled.span`
  font-size: 32px;
  color: white;
  
  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const StopIcon = styled.span`
  font-size: 32px;
  color: white;
  
  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const ActionLabel = styled.div`
  margin-top: 8px;
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const UploadButtonContainer = styled.div`
  width: 100%;
`;

const UploadButton = styled.button`
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  background-color: ${props => props.backgroundColor};
  border: 1px solid ${props => props.borderColor};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  transition: background-color 0.2s;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.backgroundColor === '#FFFFFF' ? '#F8F9FA' : props.backgroundColor};
  }
  
  @media (max-width: 768px) {
    padding: 12px;
    border-radius: 8px;
  }
`;

const UploadButtonContent = styled.div`
  display: flex;
  align-items: center;
`;

const UploadIcon = styled.span`
  font-size: 24px;
  margin-right: 12px;
  
  @media (max-width: 768px) {
    font-size: 20px;
    margin-right: 8px;
  }
`;

const UploadTextContainer = styled.div`
  text-align: left;
`;

const UploadLabel = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.color};
  margin-bottom: 4px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const UploadDescription = styled.div`
  font-size: 14px;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

export default CameraControls;
