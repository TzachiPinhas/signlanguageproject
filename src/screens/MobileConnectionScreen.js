// filepath: c:\Users\tzach\Desktop\ReactWeb\signlanguageproject\src\screens\MobileConnectionScreen.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const MobileConnectionScreen = () => {
  const { theme: COLORS } = useTheme();
  const navigate = useNavigate();
  
  // Hard-coded URL that we know works, now with mobile parameter
  const baseUrl = 'http://192.168.3.138:3000';
  const connectionUrl = `${baseUrl}?mobile=true`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(connectionUrl)
      .then(() => {
        alert('URL copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy URL: ', err);
      });
  };

  const navigateToHome = () => {
    navigate('/home');
  };

  return (
    <Container backgroundColor={COLORS.background}>
      <Content>
        <Header>
          <Title color={COLORS.text}>Connect from Mobile Device</Title>
          <Subtitle color={COLORS.textSecondary}>
            Scan this QR code or use the URL to access the app from your mobile device
          </Subtitle>
        </Header>
        
        <QRCodeCard backgroundColor={COLORS.card}>
          <QRCodeContainer>
            <QRCodeSVG 
              value={connectionUrl} 
              size={320}
              level="H"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </QRCodeContainer>
          
          <InstructionText color={COLORS.textSecondary}>
            Open your phone's camera app and point it at the QR code to access the app
          </InstructionText>
          
          <AddressContainer>
            <AddressLabel color={COLORS.textSecondary}>
              Or access directly at:
            </AddressLabel>
            <AddressUrlContainer>
              <AddressUrl color={COLORS.primary}>{connectionUrl}</AddressUrl>
              <CopyButton onClick={copyToClipboard} title="Copy to clipboard">📋</CopyButton>
            </AddressUrlContainer>
          </AddressContainer>
        </QRCodeCard>
        
        <BackButton 
          onClick={navigateToHome}
          color={COLORS.primary}
        >
          ← Back to Home
        </BackButton>
      </Content>
    </Container>
  );
};

// Styled components
const Container = styled.div`
  background-color: ${props => props.backgroundColor};
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const QRCodeCard = styled.div`
  background-color: ${props => props.backgroundColor};
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    padding: 24px;
    border-radius: 12px;
  }
`;

const QRCodeContainer = styled.div`
  background-color: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const InstructionText = styled.p`
  font-size: 16px;
  text-align: center;
  margin-bottom: 24px;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    font-size: 14px;
    margin-bottom: 20px;
  }
`;

const AddressContainer = styled.div`
  width: 100%;
`;

const AddressLabel = styled.p`
  font-size: 16px;
  margin-bottom: 8px;
  color: ${props => props.color};
  text-align: center;
  font-weight: 500;
`;

const AddressUrlContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
`;

const AddressUrl = styled.div`
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  text-align: center;
  color: ${props => props.color};
  
  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.color};
  font-size: 16px;
  font-weight: 500;
  padding: 8px 16px;
  cursor: pointer;
  align-self: center;
  
  &:hover {
    text-decoration: underline;
  }
`;

export default MobileConnectionScreen;