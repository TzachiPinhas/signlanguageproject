import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';
import styled from 'styled-components';

const LoginScreen = () => {
  const { theme: COLORS } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Handle login with email and password
  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      await signInWithEmailAndPassword(auth, email, password);
      // If successful, navigation handled by auth state listener in App.js
    } catch (error) {
      setError('Login failed: ' + error.message.replace('Firebase: ', ''));
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle user sign up with email
  const handleEmailSignUp = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    if (password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      await createUserWithEmailAndPassword(auth, email, password);
      alert('Account created successfully!');
      // If successful, navigation handled by auth state listener in App.js
    } catch (error) {
      setError('Sign up failed: ' + error.message.replace('Firebase: ', ''));
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container backgroundColor={COLORS.background}>
      <Title color={COLORS.text}>Sign Language App</Title>
      <Subtitle color={COLORS.textSecondary}>Login or Sign Up</Subtitle>
      
      <InputContainer>
        <Input
          backgroundColor={COLORS.card}
          borderColor={COLORS.border}
          color={COLORS.text}
          placeholder="Email"
          placeholderTextColor={COLORS.textMuted}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <Input
          backgroundColor={COLORS.card}
          borderColor={COLORS.border}
          color={COLORS.text}
          placeholder="Password"
          placeholderTextColor={COLORS.textMuted}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </InputContainer>
      
      {error ? (
        <ErrorContainer>
          <ErrorText>{error}</ErrorText>
        </ErrorContainer>
      ) : null}
      
      <ButtonContainer>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <LoginButton 
              backgroundColor={COLORS.primary}
              onClick={handleEmailLogin}
            >
              <ButtonText>Login</ButtonText>
            </LoginButton>
            
            <SignUpButton 
              backgroundColor={COLORS.accent}
              onClick={handleEmailSignUp}
            >
              <ButtonText>Sign Up</ButtonText>
            </SignUpButton>
          </>
        )}
      </ButtonContainer>
    </Container>
  );
};

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${props => props.backgroundColor};
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 10px;
  text-align: center;
  color: ${props => props.color};
`;

const Subtitle = styled.p`
  font-size: 18px;
  margin-bottom: 30px;
  text-align: center;
  color: ${props => props.color};
`;

const InputContainer = styled.div`
  width: 100%;
  max-width: 400px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  background-color: ${props => props.backgroundColor};
  border: 1px solid ${props => props.borderColor};
  color: ${props => props.color};
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  width: 100%;
  font-size: 16px;
  
  &::placeholder {
    color: ${props => props.placeholderTextColor};
    opacity: 0.7;
  }
`;

const ButtonContainer = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LoginButton = styled.button`
  background-color: ${props => props.backgroundColor};
  padding: 15px;
  border-radius: 10px;
  border: none;
  align-items: center;
  margin-bottom: 15px;
  width: 100%;
  cursor: pointer;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
`;

const SignUpButton = styled(LoginButton)`
  margin-top: 5px;
`;

const ButtonText = styled.span`
  color: white;
  font-weight: bold;
  font-size: 16px;
`;

const ErrorContainer = styled.div`
  background-color: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  width: 90%;
  max-width: 400px;
  text-align: center;
`;

const ErrorText = styled.p`
  color: red;
  text-align: center;
  font-weight: 500;
`;

const Loader = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px 0;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export default LoginScreen;