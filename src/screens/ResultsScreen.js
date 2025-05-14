import React from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const ResultsScreen = () => {
  const { theme: COLORS } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get result from location state (React Router) or use default
  const result = location.state?.result || { label: 'לא זוהה' };
  
  return (
    <Container backgroundColor={COLORS.background}>
      <Content>
        <Header>
          <Title color={COLORS.text}>תוצאות זיהוי</Title>
        </Header>
        
        <ResultCard backgroundColor={COLORS.card}>
          <ResultLabel color={COLORS.textSecondary}>The word identified:</ResultLabel>
          <ResultValueContainer backgroundColor={COLORS.primaryLight}>
            <ResultValue color={COLORS.primary}>{result.label}</ResultValue>
          </ResultValueContainer>
          
          {result.confidence !== undefined && (
            <ConfidenceContainer>
              <ConfidenceLabel color={COLORS.textSecondary}>Confidence level:</ConfidenceLabel>
              <ConfidenceValue color={COLORS.text}>
                {Math.round(result.confidence * 100)}%
              </ConfidenceValue>
            </ConfidenceContainer>
          )}
        </ResultCard>
        
        <Button 
          backgroundColor={COLORS.primary}
          onClick={() => navigate('/')}
        >
          <ButtonText color={COLORS.card}>Return to the main screen</ButtonText>
        </Button>
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
  justify-content: center;
  align-items: center;
  padding: 24px;
  flex: 1;
`;

const Header = styled.div`
  align-items: center;
  text-align: center;
  margin-bottom: 32px;
  width: 100%;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.color};
  text-align: center;
`;

const ResultCard = styled.div`
  background-color: ${props => props.backgroundColor};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  align-items: center;
  margin-bottom: 32px;
  text-align: center;
`;

const ResultLabel = styled.p`
  font-size: 16px;
  color: ${props => props.color};
  margin-bottom: 16px;
  text-align: center;
`;

const ResultValueContainer = styled.div`
  background-color: ${props => props.backgroundColor};
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  width: 100%;
  text-align: center;
`;

const ResultValue = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.color};
  text-align: center;
`;

const ConfidenceContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const ConfidenceLabel = styled.p`
  font-size: 14px;
  color: ${props => props.color};
  margin-right: 8px;
`;

const ConfidenceValue = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.color};
`;

const Button = styled.button`
  background-color: ${props => props.backgroundColor};
  padding: 16px 24px;
  border-radius: 12px;
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

export default ResultsScreen;