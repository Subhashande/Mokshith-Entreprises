import React from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ 
  label, 
  options = [], 
  error, 
  helperText, 
  className = '', 
  fullWidth = true,
  ...props 
}) => {
  return (
    <div className={`select-container ${className}`} style={{ width: fullWidth ? '100%' : 'auto', marginBottom: '1.5rem' }}>
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative group">
        <select 
          className={`
            w-full px-5 py-4 rounded-2xl border-2 transition-all duration-300 outline-none appearance-none cursor-pointer
            ${error 
              ? 'border-red-100 bg-red-50/30 focus:border-red-500' 
              : 'border-gray-100 bg-gray-50/50 focus:border-blue-500 focus:bg-white'
            }
            ${props.disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
          `}
          {...props}
        >
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
          <ChevronDown size={20} />
        </div>
      </div>
      {error && (
        <span className="block mt-2 text-xs font-bold text-red-500 flex items-center gap-1.5 animate-in slide-in-from-top-1">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          {error}
        </span>
      )}
      {helperText && !error && (
        <p className="mt-2 text-xs font-bold text-gray-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Select;