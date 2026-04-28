import React from 'react';
import styles from './Table.module.css';

const Table = ({ headers, children, className = '', containerClassName = '' }) => {
  return (
    <div className={`${styles.container} ${containerClassName}`}>
      <table className={`${styles.table} ${className}`}>
        <thead className={styles.thead}>
          <tr>
            {headers.map((header, index) => {
              const label = typeof header === 'object' ? header.label : header;
              const headerClassName = typeof header === 'object' ? header.className : '';
              const style = typeof header === 'object' ? header.style : {};
              
              return (
                <th 
                  key={index} 
                  className={`${styles.th} ${headerClassName}`}
                  style={style}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {children}
        </tbody>
      </table>
    </div>
  );
};

export const TableRow = ({ children, className = '', onClick }) => (
  <tr 
    className={`${styles.tr} ${onClick ? styles.clickable : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className = '', colSpan }) => (
  <td className={`${styles.td} ${className}`} colSpan={colSpan}>
    {children}
  </td>
);

export default Table;