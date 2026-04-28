import React from 'react';
import { Package } from 'lucide-react';
import styles from './EmptyState.module.css';

const EmptyState = ({ 
  icon: Icon = Package, 
  title = 'No items found', 
  description = 'Try adjusting your filters or search criteria',
  actions 
}) => {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <Icon className={styles.icon} aria-hidden="true" />
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};

export default EmptyState;
