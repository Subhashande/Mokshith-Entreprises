import React from 'react';

const Skeleton = ({ className, variant = 'rect' }) => {
  const baseClass = "animate-pulse bg-slate-200";
  const variantClass = variant === 'circle' ? 'rounded-full' : 'rounded-2xl';
  
  return (
    <div className={`${baseClass} ${variantClass} ${className}`}></div>
  );
};

export default Skeleton;
