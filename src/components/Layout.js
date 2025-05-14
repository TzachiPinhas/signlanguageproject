import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const Layout = ({ children }) => {
  const { theme } = useTheme();
  const location = useLocation();
  
  // Check if current route is active
  const isActive = (path) => {
    // Special cases for home path
    if (path === '/home' && (location.pathname === '/' || location.pathname === '/home')) {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <LayoutContainer>
      <PageContent>{children}</PageContent>
      <BottomNav backgroundColor={theme.card}>
        <NavItem to="/home" active={isActive('/home')}>
          <NavIconContainer active={isActive('/home')} activeBgColor={theme.primaryLight}>
            <NavIcon>🔄</NavIcon>
            <NavLabel active={isActive('/home')} activeColor={theme.primary} inactiveColor={theme.textSecondary}>
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
  height: 100vh;
`;

const PageContent = styled.main`
  flex: 1;
  overflow-y: auto;
`;

const BottomNav = styled.nav`
  display: flex;
  justify-content: space-around;
  align-items: center;
  background-color: ${props => props.backgroundColor};
  height: 70px;
  box-shadow: 0px -3px 10px rgba(0, 0, 0, 0.1);
  
  @media (min-width: 768px) {
    max-width: 600px;
    margin: 0 auto;
    border-radius: 16px 16px 0 0;
  }
`;

const NavItem = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  flex: 1;
  justify-content: center;
`;

const NavIconContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 16px;
  border-radius: 16px;
  background-color: ${props => props.active ? props.activeBgColor : 'transparent'};
`;

const NavIcon = styled.span`
  font-size: 22px;
  margin-bottom: 4px;
  ${props => props.active && 'transform: scale(1.1);'}
`;

const NavLabel = styled.span`
  font-size: 12px;
  font-weight: ${props => props.active ? '600' : '400'};
  color: ${props => props.active ? props.activeColor : props.inactiveColor};
`;

export default Layout;