import React from 'react';

const Table = ({ headers, children, className = '', containerClassName = '' }) => {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-100 ${containerClassName}`}>
      <table className={`w-full text-left border-collapse ${className}`}>
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            {headers.map((header, index) => {
              const label = typeof header === 'object' ? header.label : header;
              const className = typeof header === 'object' ? header.className : '';
              const style = typeof header === 'object' ? header.style : {};
              
              return (
                <th 
                  key={index} 
                  className={`py-4 px-6 text-sm font-bold text-gray-600 uppercase tracking-wider ${className}`}
                  style={style}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export const TableRow = ({ children, className = '', onClick }) => (
  <tr 
    className={`hover:bg-gray-50/50 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className = '', colSpan }) => (
  <td className={`py-4 px-6 text-sm text-gray-700 ${className}`} colSpan={colSpan}>
    {children}
  </td>
);

export default Table;