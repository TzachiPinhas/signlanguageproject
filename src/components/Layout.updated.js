import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const Layout = ({ children }) => {
  const { theme } = useTheme();
  const location = useLocation();
  
  // Check if current route is active
  const isActive = (path) => {
    // Special cases for home path that redirect to camera
    if (path === '/camera' && (location.pathname === '/' || location.pathname === '/home')) {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <LayoutContainer>
      <PageContent>{children}</PageContent>      
      <BottomNav backgroundColor={theme.card}>
        <NavItem to="/camera" active={isActive('/camera')}>
          <NavIconContainer active={isActive('/camera')} activeBgColor={theme.primaryLight}>
            <NavIcon>🔄</NavIcon>
            <NavLabel active={isActive('/camera')} activeColor={theme.primary} inactiveColor={theme.textSecondary}>
              Translate
            </NavLabel>
          </NavIconContainer>
        </NavItem>
        
        <NavItem to="/history" active={isActive('/history')}>
          <NavIconContainer active={isActive('/history')} activeBgColor={theme.primaryLight}>
            <NavIcon>📚</NavIcon>
            <NavLabel active={isActive('/history')} activeColor={theme.primary} inactiveColor={theme.textSecondary}>
              History
            </NavLabel>
          </NavIconContainer>
        </NavItem>

        <NavItem to="/connect" active={isActive('/connect')}>
          <NavIconContainer active={isActive('/connect')} activeBgColor={theme.primaryLight}>
            <NavIcon>📱</NavIcon>
            <NavLabel active={isActive('/connect')} activeColor={theme.primary} inactiveColor={theme.textSecondary}>
              Connect Phone
            </NavLabel>
          </NavIconContainer>
        </NavItem>
        
        <NavItem to="/settings" active={isActive('/settings')}>
          <NavIconContainer active={isActive('/settings')} activeBgColor={theme.primaryLight}>
            <NavIcon>⚙️</NavIcon>
            <NavLabel active={isActive('/settings')} activeColor={theme.primary} inactiveColor={theme.textSecondary}>
              Settings
            </NavLabel>
          </NavIconContainer>
        </NavItem>
      </BottomNav>
    </LayoutContainer>
  );
};

// Styled components
const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const PageContent = styled.main`
  flex-grow: 1;
  margin-bottom: 60px; /* Space for bottom navigation */
  overflow: auto;
  
  @media (max-width: 768px) {
    margin-bottom: 70px;
  }
`;

const BottomNav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: ${props => props.backgroundColor};
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  
  @media (max-width: 768px) {
    height: 70px;
  }
`;

const NavItem = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 25%;
  height: 100%;
  text-decoration: none;
`;

const NavIconContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 4px;
  background-color: ${props => props.active ? props.activeBgColor : 'transparent'};
  transition: background-color 0.3s;
`;

const NavIcon = styled.div`
  font-size: 24px;
  margin-bottom: 4px;
  
  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

const NavLabel = styled.div`
  font-size: 12px;
  font-weight: ${props => props.active ? '700' : '400'};
  color: ${props => props.active ? props.activeColor : props.inactiveColor};
  transition: color 0.3s, font-weight 0.3s;
  
  @media (max-width: 768px) {
    font-size: 10px;
  }
`;

export default Layout;
