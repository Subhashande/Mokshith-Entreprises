import React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

const Select = ({ 
  label, 
  options = [], 
  error, 
  helperText, 
  className = '', 
  fullWidth = true,
  ...props 
}) => {
  const containerClass = fullWidth ? styles.selectContainer : styles.selectContainerAuto;
  
  return (
    <div className={`${containerClass} ${className}`}>
      {label && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select 
          className={`${styles.select} ${error ? styles.selectError : ''}`}
          {...props}
        >
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className={styles.icon}>
          <ChevronDown size={20} />
        </div>
      </div>
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

export default Select;