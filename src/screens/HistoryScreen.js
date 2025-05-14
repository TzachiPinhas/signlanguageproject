import React from 'react';
import styled from 'styled-components';
import { auth } from '../firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';

const HistoryScreen = () => {
  const { theme: COLORS } = useTheme();
  const currentUser = auth.currentUser;
  
  // Extract username from email (part before @)
  const username = currentUser ? currentUser.email.substring(0, currentUser.email.indexOf('@')) : 'User';

  return (
    <Container backgroundColor={COLORS.background}>
      <ScrollContent>
        <Header>
          <Title color={COLORS.text}>History</Title>
          <Subtitle color={COLORS.textSecondary}>
            Welcome, {username}
          </Subtitle>
        </Header>

        <Card backgroundColor={COLORS.card}>
          <Placeholder color={COLORS.textSecondary}>
            Here you will see all translated signs.
          </Placeholder>
        </Card>
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
  flex-grow: 1;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-vertical: 24px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${props => props.color};
`;

const Subtitle = styled.p`
  font-size: 16px;
  margin-bottom: 24px;
  color: ${props => props.color};
`;

const Card = styled.div`
  background-color: ${props => props.backgroundColor};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Placeholder = styled.p`
  font-size: 16px;
  text-align: center;
  padding: 24px;
  color: ${props => props.color};
`;

export default HistoryScreen;