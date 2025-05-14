import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const NetworkInfo = () => {
  const { theme: COLORS } = useTheme();
  const [localIpAddress, setLocalIpAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Function to get the local IP address using WebRTC
    const getLocalIpAddress = async () => {
      setIsLoading(true);
      try {
        // Method 1: Using WebRTC to find the local IP (most reliable)
        const getLocalIpViaWebRTC = () => {
          return new Promise((resolve, reject) => {
            try {
              // Create a temporary RTCPeerConnection to get local IPs
              const peerConnection = new RTCPeerConnection({ 
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
              });
              
              // Create a data channel to force candidate gathering
              peerConnection.createDataChannel('');
              
              // Set a timeout in case it takes too long
              const timeoutId = setTimeout(() => {
                peerConnection.close();
                resolve(null); // Resolve with null if taking too long
              }, 3000);
              
              let ipFound = false;
              
              // Listen for ICE candidates
              peerConnection.onicecandidate = (event) => {
                if (!event.candidate || ipFound) return;
                
                // Look for IPv4 candidates (local network IPs)
                const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
                const ipMatch = event.candidate.candidate.match(ipRegex);
                
                if (ipMatch && ipMatch[1] && !ipMatch[1].startsWith('127.')) {
                  clearTimeout(timeoutId);
                  ipFound = true;
                  peerConnection.close();
                  console.log("Detected local IP via WebRTC:", ipMatch[1]);
                  resolve(ipMatch[1]);
                }
              };
              
              // Create an offer to start candidate gathering
              peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .catch(err => {
                  peerConnection.close();
                  reject(err);
                });
              
              // When ICE gathering is complete, if no IP was found, resolve with null
              peerConnection.onicegatheringstatechange = () => {
                if (peerConnection.iceGatheringState === 'complete' && !ipFound) {
                  clearTimeout(timeoutId);
                  peerConnection.close();
                  resolve(null);
                }
              };
              
            } catch (err) {
              console.error("WebRTC IP detection failed:", err);
              resolve(null);
            }
          });
        };
        
        // Try to detect IP via WebRTC
        const detectedIp = await getLocalIpViaWebRTC();
        
        if (detectedIp) {
          setLocalIpAddress(detectedIp);
          setError('');
        } else {
          // Fallback to current hostname if WebRTC method fails
          const currentHost = window.location.hostname;
          setLocalIpAddress(currentHost === 'localhost' ? '127.0.0.1' : currentHost);
        }
      } catch (err) {
        console.error('Error getting local IP address:', err);
        setError('Unable to detect local IP. Try checking your network settings.');
        
        // Fallback to current hostname
        const currentHost = window.location.hostname;
        setLocalIpAddress(currentHost);
      } finally {
        setIsLoading(false);
      }
    };
    
    getLocalIpAddress();
    
    return () => {
      // Clean up any resources if needed
    };
  }, []);

  const getFullUrl = () => {
    const protocol = window.location.protocol;
    const port = window.location.port;
    return `${protocol}//${localIpAddress}${port ? `:${port}` : ''}`;
  };

  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getFullUrl())
      .then(() => {
        alert('URL copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy URL: ', err);
      });
  };

  return (
    <Container backgroundColor={COLORS.card}>
      <Title color={COLORS.text}>Network Access</Title>
      
      {isLoading ? (
        <LoadingText color={COLORS.textSecondary}>Detecting local network address...</LoadingText>
      ) : error ? (
        <ErrorText>{error}</ErrorText>
      ) : (
        <>
          <InfoText color={COLORS.textSecondary}>
            To access this app from other devices on your network:
          </InfoText>
          
          <NetworkUrlContainer>
            <NetworkUrl color={COLORS.primary}>{getFullUrl()}</NetworkUrl>
            <CopyButton onClick={copyToClipboard} title="Copy to clipboard">📋</CopyButton>
          </NetworkUrlContainer>
          
          <InstructionsText color={COLORS.textSecondary}>
            Make sure both devices are connected to the same WiFi network.
          </InstructionsText>
          
          <QRCodeButton 
            onClick={toggleQRCode}
            backgroundColor={COLORS.primary}
            color="#FFF"
          >
            {showQRCode ? 'Hide QR Code' : 'Show QR Code for Mobile Access'}
          </QRCodeButton>
          
          {showQRCode && (
            <QRCodeContainer>
              <QRCodeSVG 
                value={getFullUrl()} 
                size={200}
                level="H"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
              <QRCodeInstructions color={COLORS.textSecondary}>
                Scan this QR code with your mobile device's camera
              </QRCodeInstructions>
            </QRCodeContainer>
          )}
          
          <Divider />
          
          <HelpTitle color={COLORS.text}>Can't connect?</HelpTitle>
          <HelpList>
            <HelpListItem color={COLORS.textSecondary}>
              Ensure both devices are on the same WiFi network
            </HelpListItem>
            <HelpListItem color={COLORS.textSecondary}>
              Your firewall may be blocking access - check firewall settings
            </HelpListItem>
            <HelpListItem color={COLORS.textSecondary}>
              Try using the command "ipconfig" in Command Prompt to find your IPv4 address
            </HelpListItem>
            <HelpListItem color={COLORS.textSecondary}>
              If using a VPN, try disconnecting it
            </HelpListItem>
          </HelpList>
          
          <FindIpButton
            onClick={() => window.open("https://www.whatismyip.com/", "_blank")}
            backgroundColor="transparent"
            color={COLORS.primary}
          >
            Need help finding your IP?
          </FindIpButton>
        </>
      )}
    </Container>
  );
};

// Styled components
const Container = styled.div`
  background-color: ${props => props.backgroundColor};
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.color};
`;

const InfoText = styled.p`
  font-size: 14px;
  margin-bottom: 12px;
  color: ${props => props.color};
`;

const NetworkUrlContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  padding: 10px;
`;

const NetworkUrl = styled.div`
  font-size: 18px;
  font-weight: 500;
  flex: 1;
  word-break: break-all;
  color: ${props => props.color};
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0 8px;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
`;

const InstructionsText = styled.p`
  font-size: 14px;
  margin-bottom: 20px;
  color: ${props => props.color};
`;

const QRCodeButton = styled.button`
  background-color: ${props => props.backgroundColor};
  color: ${props => props.color};
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
  transition: opacity 0.3s;
  
  &:hover {
    opacity: 0.9;
  }
`;

const QRCodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px 0 20px;
  padding: 16px;
  background-color: white;
  border-radius: 8px;
`;

const QRCodeInstructions = styled.p`
  font-size: 12px;
  margin-top: 12px;
  color: ${props => props.color};
  text-align: center;
`;

const LoadingText = styled.p`
  font-size: 14px;
  color: ${props => props.color};
  margin: 16px 0;
`;

const ErrorText = styled.p`
  color: #e74c3c;
  font-size: 14px;
  margin: 16px 0;
`;

const Divider = styled.hr`
  border: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin: 20px 0;
`;

const HelpTitle = styled.h3`
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: ${props => props.color};
`;

const HelpList = styled.ul`
  padding-left: 20px;
  margin-bottom: 16px;
`;

const HelpListItem = styled.li`
  font-size: 14px;
  margin-bottom: 6px;
  color: ${props => props.color};
`;

const FindIpButton = styled.button`
  background-color: ${props => props.backgroundColor};
  color: ${props => props.color};
  border: none;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  display: block;
  margin-top: 8px;
`;

export default NetworkInfo;