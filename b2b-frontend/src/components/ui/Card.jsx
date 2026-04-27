import React from 'react';

const Card = ({ children, className = '', title, subtitle, footer, ...props }) => {
  return (
    <div 
      className={`bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1 ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-8 py-6 border-b border-gray-50 bg-white/50 backdrop-blur-sm">
          {title && <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm font-bold text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-8">
        {children}
      </div>
      {footer && (
        <div className="px-8 py-6 bg-gray-50/30 border-t border-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
