import React from 'react';
import styles from './Input.module.css';

const Input = ({ label, error, helperText, className = '', fullWidth = true, ...props }) => {
  const containerClass = fullWidth ? styles.inputContainer : styles.inputContainerAuto;
  
  return (
    <div className={`${containerClass} ${className}`}>
      {label && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      <input 
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        {...props}
      />
      {error && (
        <span className={styles.errorMessage}>
          <span className={styles.errorDot}></span>
          {error}
        </span>
      )}
      {helperText && !error && (
        <p className={styles.helperText}>
          <span className={styles.helperDot}></span>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
