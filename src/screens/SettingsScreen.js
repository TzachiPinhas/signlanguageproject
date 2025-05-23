import React, { useState } from 'react';
import styled from 'styled-components';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';
import ModelStorageManager from '../components/ModelStorageManager';

const SettingsScreen = () => {
  const { isDarkMode, toggleDarkMode, theme: COLORS } = useTheme();
  const [saveToGallery, setSaveToGallery] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Toggle Dark Mode
  const handleToggleDarkMode = (e) => {
    toggleDarkMode(e.target.checked);
  };

  // Toggle save to gallery setting
  const toggleSaveToGallery = () => setSaveToGallery(previousState => !previousState);

  // Handle user logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Navigation will automatically redirect to Login screen due to our auth state listener in App.js
    } catch (error) {
      alert('Logout Error: ' + error.message);
      console.error('Logout error:', error);
    }
  };

  // Confirm logout
  const confirmLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      handleLogout();
    }
  };

  return (
    <Container backgroundColor={COLORS.background}>
      <ScrollContent>
        <Header>
          <Title color={COLORS.text}>Settings</Title>
        </Header>

        <SettingsSection>
          <SectionTitle color={COLORS.text}>General</SectionTitle>
          
          <SettingCard backgroundColor={COLORS.card}>
            <SettingRow>
              <SettingInfo>
                <SettingName color={COLORS.text}>Dark mode</SettingName>
                <SettingDescription color={COLORS.textSecondary}>Change the app's theme</SettingDescription>
              </SettingInfo>
              <Switch 
                type="checkbox"
                checked={isDarkMode}
                onChange={handleToggleDarkMode}
                trackColor={isDarkMode ? COLORS.primary : COLORS.inactive}
                backgroundColor={COLORS.card}
              />
            </SettingRow>
          </SettingCard>
        </SettingsSection>

        <SettingsSection>
          <SectionTitle color={COLORS.text}>Camera</SectionTitle>
          
          <SettingCard backgroundColor={COLORS.card}>
            <SettingRow>
              <SettingInfo>
                <SettingName color={COLORS.text}>Save video to gallery</SettingName>
                <SettingDescription color={COLORS.textSecondary}>Automatically save recordings to your device</SettingDescription>
              </SettingInfo>
              <Switch 
                type="checkbox"
                checked={saveToGallery}
                onChange={toggleSaveToGallery}
                trackColor={saveToGallery ? COLORS.primary : COLORS.inactive}
                backgroundColor={COLORS.card}
              />
            </SettingRow>
          </SettingCard>
        </SettingsSection>

        <SettingsSection>
          <SectionTitle color={COLORS.text}>Information</SectionTitle>
          
          <SettingCard backgroundColor={COLORS.card}>
            <LinkRow onClick={() => setShowAboutModal(true)}>
              <LinkText color={COLORS.primary}>About the app</LinkText>
            </LinkRow>
            
            <Divider backgroundColor={COLORS.divider} />
            
            <LinkRow>
              <LinkText color={COLORS.primary}>Terms of use</LinkText>
            </LinkRow>
            
            <Divider backgroundColor={COLORS.divider} />
            
            <LinkRow>
              <LinkText color={COLORS.primary}>Privacy policy</LinkText>
            </LinkRow>
          </SettingCard>
        </SettingsSection>        <SettingsSection>
          <SectionTitle color={COLORS.text}>Advanced</SectionTitle>
          <ModelStorageManager />
        </SettingsSection>

        <SettingsSection>
          <SectionTitle color={COLORS.text}>Account</SectionTitle>
          
          <SettingCard backgroundColor={COLORS.card}>
            <LogoutButton 
              backgroundColor={COLORS.error} 
              onClick={confirmLogout}
            >
              <LogoutText color={COLORS.card}>Sign Out</LogoutText>
            </LogoutButton>
          </SettingCard>
        </SettingsSection>

        <VersionContainer>
          <VersionText color={COLORS.textMuted}>Version 1.0.0</VersionText>
        </VersionContainer>

        {/* About App Modal */}
        {showAboutModal && (
          <ModalOverlay>
            <ModalContent backgroundColor={COLORS.card}>
              <ModalTitle color={COLORS.text}>About This App</ModalTitle>
              
              <ModalText color={COLORS.textSecondary}>
                This app helps users recognize and translate sign language using AI and video processing. Built with React and Firebase.
              </ModalText>
              
              <ModalButton
                backgroundColor={COLORS.primary}
                onClick={() => setShowAboutModal(false)}
              >
                <ModalButtonText color={COLORS.card}>Close</ModalButtonText>
              </ModalButton>
            </ModalContent>
          </ModalOverlay>
        )}
      </ScrollContent>
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

const ScrollContent = styled.div`
  padding: 24px;
`;

const Header = styled.div`
  align-items: center;
  text-align: center;
  margin-vertical: 24px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.color};
`;

const SettingsSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-horizontal: 4px;
  color: ${props => props.color};
`;

const SettingCard = styled.div`
  background-color: ${props => props.backgroundColor};
  border-radius: 16px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const SettingRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
`;

const SettingInfo = styled.div`
  flex: 1;
`;

const SettingName = styled.h3`
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  color: ${props => props.color};
`;

const SettingDescription = styled.p`
  font-size: 12px;
  max-width: 90%;
  color: ${props => props.color};
`;

const Switch = styled.input`
  height: 24px;
  width: 48px;
  position: relative;
  appearance: none;
  border-radius: 12px;
  background-color: ${props => props.checked ? props.trackColor : '#ccc'};
  transition: background-color 0.3s;
  cursor: pointer;
  
  &:before {
    content: '';
    position: absolute;
    height: 20px;
    width: 20px;
    left: ${props => props.checked ? '24px' : '2px'};
    top: 2px;
    border-radius: 50%;
    background-color: white;
    transition: left 0.3s;
  }
`;

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background-color: ${props => props.backgroundColor};
`;

const LinkRow = styled.div`
  padding: 16px 24px;
  align-items: center;
  text-align: center;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const LinkText = styled.p`
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.color};
`;

const VersionContainer = styled.div`
  align-items: center;
  text-align: center;
  margin-vertical: 24px;
  margin-bottom: 24px;
`;

const VersionText = styled.p`
  font-size: 12px;
  color: ${props => props.color};
`;

const LogoutButton = styled.button`
  background-color: ${props => props.backgroundColor};
  padding: 16px;
  align-items: center;
  text-align: center;
  border-radius: 8px;
  margin: 24px;
  border: none;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

const LogoutText = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.color};
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  width: 80%;
  max-width: 400px;
  background-color: ${props => props.backgroundColor};
  padding: 24px;
  border-radius: 16px;
  align-items: center;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
  text-align: center;
  color: ${props => props.color};
`;

const ModalText = styled.p`
  font-size: 16px;
  line-height: 24px;
  text-align: center;
  margin-bottom: 24px;
  padding-horizontal: 8px;
  color: ${props => props.color};
`;

const ModalButton = styled.button`
  background-color: ${props => props.backgroundColor};
  padding-vertical: 16px;
  padding-horizontal: 24px;
  border-radius: 8px;
  align-items: center;
  width: 50%;
  border: none;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

const ModalButtonText = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.color};
`;

export default SettingsScreen;
