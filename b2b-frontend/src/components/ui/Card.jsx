import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`premium-card ${className}`}
      style={{ padding: '1.5rem' }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
