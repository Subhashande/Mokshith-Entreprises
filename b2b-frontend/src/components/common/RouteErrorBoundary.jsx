import React, { Component } from 'react';
import logger from '../../utils/logger';
import styles from './RouteErrorBoundary.module.css';

/**
 * Route-level error boundary
 * Catches errors within specific routes/sections
 * Provides fallback UI and error reporting
 */
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('[RouteErrorBoundary] Error caught:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      route: this.props.routeName || 'Unknown'
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback, routeName = 'this section' } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        return fallback({ 
          error: this.state.error, 
          onReset: this.handleReset,
          onReload: this.handleReload 
        });
      }

      // Default fallback UI
      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.iconWrapper}>
              <svg 
                className={styles.icon}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            <h2 className={styles.title}>Something went wrong</h2>
            
            <p className={styles.message}>
              An unexpected error occurred in {routeName}. 
              {this.state.error?.message && (
                <span className={styles.errorDetail}>
                  {this.state.error.message}
                </span>
              )}
            </p>

            <div className={styles.actions}>
              <button 
                onClick={this.handleReset}
                className={styles.buttonPrimary}
              >
                Try Again
              </button>
              <button 
                onClick={this.handleReload}
                className={styles.buttonSecondary}
              >
                Reload Page
              </button>
            </div>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details className={styles.errorDetails}>
                <summary className={styles.errorSummary}>Error Details (Dev Only)</summary>
                <pre className={styles.errorStack}>
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
