import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variantClass = variant === 'primary' ? 'premium-button-primary' : 'premium-button-secondary';
  
  return (
    <button 
      className={`premium-button ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
