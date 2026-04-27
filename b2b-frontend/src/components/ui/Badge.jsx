import React from 'react';

const Badge = ({ 
  children, 
  variant = 'blue', 
  size = 'md', 
  className = '',
  dot = false,
  ...props 
}) => {
  const variants = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  };

  const dotColors = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    gray: 'bg-gray-400',
    violet: 'bg-violet-500',
    orange: 'bg-orange-500'
  };

  return (
    <span 
      className={`
        inline-flex items-center font-black uppercase tracking-wider border rounded-full
        ${variants[variant] || variants.blue}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[variant] || dotColors.blue} animate-pulse`}></span>
      )}
      {children}
    </span>
  );
};

export default Badge;