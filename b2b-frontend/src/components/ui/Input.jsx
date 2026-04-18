import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
  return (
    <div className={`input-container ${className}`} style={{ width: '100%', marginBottom: '1rem' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem', 
          fontSize: '0.875rem', 
          fontWeight: '500',
          color: 'var(--text-muted)'
        }}>
          {label}
        </label>
      )}
      <input 
        className="premium-input"
        {...props}
      />
      {error && (
        <span style={{ 
          display: 'block', 
          marginTop: '0.25rem', 
          fontSize: '0.75rem', 
          color: 'var(--error)'
        }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
