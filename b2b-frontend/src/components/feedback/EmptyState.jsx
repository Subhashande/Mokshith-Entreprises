import React from 'react';
import { Package } from 'lucide-react';

const EmptyState = ({ 
  icon: Icon = Package, 
  title = "No data found", 
  description = "There are no items to display at the moment.",
  action,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
        <Icon className="text-slate-300" size={32} />
      </div>
      <h3 className="text-lg font-black text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 font-medium max-w-xs mx-auto mb-6">{description}</p>
      {action}
    </div>
  );
};

export default EmptyState;
