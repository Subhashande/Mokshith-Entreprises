import React from 'react';
import styles from './Button.module.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  loading = false, 
  fullWidth = false, 
  ...props 
}) => {
  // Ensure invalid DOM props are not passed to the button element
  const { 
    active,
    icon,
    helperText,
    fullWidth: _fullWidth,
    variant: _variant,
    loading: _loading,
    ...validProps 
  } = props;

  const classNames = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button 
      className={classNames}
      disabled={loading || validProps.disabled}
      {...validProps}
    >
      {loading ? (
        <span className={styles.spinner}>
          <svg className={styles.spinnerIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className={styles.spinnerCircle} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className={styles.spinnerPath} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  );
};

export default Button;
