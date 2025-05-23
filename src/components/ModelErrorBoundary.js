import React, { Component } from 'react';
import styled from 'styled-components';

/**
 * Error Boundary component to catch and display errors during model loading
 * Prevents crash of the entire application when model errors occur
 */
class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Model loading error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Send to analytics or logging service if available
    if (window.gtag) {
      window.gtag('event', 'error', {
        'event_category': 'model',
        'event_label': error.message,
        'value': error.name
      });
    }
  }
  
  handleRetry = () => {
    // Reset error state
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null 
    });
    
    // Call the retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      // Default to page reload if no retry handler
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Format the error message for better readability
      const formatErrorMessage = (error) => {
        if (!error) return 'Unknown error';
        
        // Common errors and their user-friendly descriptions
        if (error.message?.includes('WebGL') || error.message?.includes('GPU')) {
          return 'Graphics acceleration error. Your device may not support WebGL required for the model.';
        }
        
        if (error.message?.includes('memory') || error.message?.includes('allocation')) {
          return 'Memory error. Your device may not have enough memory to load the model.';
        }
        
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          return 'Network error. Could not connect to the model server.';
        }
        
        return error.message || String(error);
      };
      
      // Render fallback UI
      return (
        <ErrorContainer>
          <ErrorContent>
            <ErrorTitle>Model Loading Error</ErrorTitle>
            
            <ErrorMessage>
              {formatErrorMessage(this.state.error)}
            </ErrorMessage>
            
            {this.props.fallback ? (
              this.props.fallback(this.state.error, this.handleRetry)
            ) : (
              <div>
                <RetryButton onClick={this.handleRetry}>
                  Try Again
                </RetryButton>
                
                <AlternativeAction onClick={this.props.onUseAlternative || this.handleRetry}>
                  {this.props.alternativeText || 'Use Simplified Version'}
                </AlternativeAction>
              </div>
            )}
            
            {this.props.showDetails && (
              <ErrorDetails>
                <details>
                  <summary>Technical Details</summary>
                  <pre>{this.state.error && this.state.error.toString()}</pre>
                  <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                </details>
              </ErrorDetails>
            )}
          </ErrorContent>
        </ErrorContainer>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

// Styled components for the error UI
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  margin: 20px;
  max-width: 500px;
  margin: 0 auto;
`;

const ErrorContent = styled.div`
  text-align: center;
`;

const ErrorTitle = styled.h3`
  color: #d32f2f;
  margin-bottom: 16px;
`;

const ErrorMessage = styled.p`
  color: #333;
  margin-bottom: 24px;
  line-height: 1.5;
`;

const RetryButton = styled.button`
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-right: 10px;
  
  &:hover {
    background-color: #1976d2;
  }
`;

const AlternativeAction = styled.button`
  background-color: transparent;
  color: #555;
  border: 1px solid #ccc;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const ErrorDetails = styled.div`
  margin-top: 20px;
  text-align: left;
  font-size: 12px;
  color: #777;
  
  details {
    margin-top: 10px;
  }
  
  summary {
    cursor: pointer;
    color: #777;
    margin-bottom: 10px;
  }
  
  pre {
    background: #f5f5f5;
    padding: 10px;
    overflow-x: auto;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
  }
`;

export default ModelErrorBoundary;
