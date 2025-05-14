import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const HomeScreen = () => {
  const { theme: COLORS } = useTheme();
  const navigate = useNavigate();
  const [hasCamera, setHasCamera] = useState(null);
  
  useEffect(() => {
    // Check if browser supports camera access
    const checkCameraAccess = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(cameras.length > 0);
      } catch (error) {
        console.error("Error checking camera:", error);
        setHasCamera(false);
      }
    };
    
    checkCameraAccess();
  }, []);
  
  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCamera(true);
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      alert("Camera access is required to use this app.");
    }
  };

  if (hasCamera === null) {
    // Loading state
    return <Container backgroundColor={COLORS.background}>
      <Title color={COLORS.text}>Loading...</Title>
    </Container>
  }
  
  if (hasCamera === false) {
    // Camera permission needed
    return (
      <Container backgroundColor={COLORS.background}>
        <ContentContainer>
          <Title color={COLORS.text}>We need camera permission</Title>
          <Message color={COLORS.textSecondary}>To use the app, we need access to your camera 📷</Message>
          <Button 
            backgroundColor={COLORS.primary}
            onClick={requestCameraPermission}
          >
            <ButtonText color={COLORS.card}>Allow access</ButtonText>
          </Button>
        </ContentContainer>
      </Container>
    );
  }

  return (
    <Container backgroundColor={COLORS.background}>
      <ContentContainer>
        <Title color={COLORS.text}>Sign Language Recognition</Title>
        <Subtitle color={COLORS.textSecondary}>Welcome to the Sign Language Recognition App</Subtitle>
        
        <InfoCard backgroundColor={COLORS.primaryLight}>
          <InfoText color={COLORS.textSecondary}>Record a short video or choose from your files to identify the word in sign language</InfoText>
        </InfoCard>
        
        <Button 
          backgroundColor={COLORS.primary}
          onClick={() => navigate('/camera')}
        >
          <ButtonText color={COLORS.card}>📷 Upload or Capture Sign</ButtonText>
        </Button>
      </ContentContainer>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  background-color: ${props => props.backgroundColor};
  flex: 1;
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  flex: 1;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
  text-align: center;
  color: ${props => props.color};
`;

const Subtitle = styled.p`
  font-size: 16px;
  margin-bottom: 32px;
  text-align: center;
  color: ${props => props.color};
`;

const InfoCard = styled.div`
  background-color: ${props => props.backgroundColor};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
  width: 100%;
  max-width: 500px;
`;

const InfoText = styled.p`
  font-size: 16px;
  color: ${props => props.color};
  text-align: center;
  line-height: 24px;
`;

const Message = styled.p`
  font-size: 16px;
  margin-bottom: 32px;
  text-align: center;
  color: ${props => props.color};
`;

const Button = styled.button`
  background-color: ${props => props.backgroundColor};
  padding: 16px 24px;
  border-radius: 12px;
  align-items: center;
  width: 80%;
  max-width: 400px;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
`;

const ButtonText = styled.span`
  color: ${props => props.color};
  font-weight: 600;
  font-size: 16px;
`;

export default HomeScreen;