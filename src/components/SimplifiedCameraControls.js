import React from 'react';
import styled from 'styled-components';

/**
 * SimplifiedCameraControls Component
 * 
 * This component provides an enhanced user interface for camera controls
 * with a focus on video upload option only (no recording functionality)
 */
const SimplifiedCameraControls = ({ 
  onUploadPress,
  isDisabled,
  colors
}) => {
  return (
    <ControlsContainer>
      {/* Upload video button */}
      <UploadButton 
        onClick={onUploadPress}
        disabled={isDisabled}
        borderColor={colors?.border || '#DADCE0'}
        backgroundColor={colors?.card || '#FFFFFF'}
      >
        <UploadButtonContent>
          <UploadIcon>📁</UploadIcon>
          <UploadTextContainer>
            <UploadLabel color={colors?.text || '#202124'}>Upload Video</UploadLabel>
            <UploadDescription color={colors?.textSecondary || '#5F6368'}>
              Select a video from your device
            </UploadDescription>
          </UploadTextContainer>
        </UploadButtonContent>
      </UploadButton>
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
  margin-top: 16px;
`;

const UploadButton = styled.button`
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  background-color: ${props => props.backgroundColor};
  border: 1px solid ${props => props.borderColor};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  transition: background-color 0.2s, transform 0.2s;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.backgroundColor === '#FFFFFF' ? '#F8F9FA' : props.backgroundColor};
    transform: translateY(-2px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 14px;
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

export default SimplifiedCameraControls;
