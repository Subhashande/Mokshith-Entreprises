import React from 'react';
import styles from './Loader.module.css';

const Loader = ({ text = 'Loading...', variant = 'spinner' }) => {
  if (variant === 'skeleton') {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonCard} />
      </div>
    );
  }

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      {text && <p className={styles.text}>{text}</p>}
      <span className="srOnly">Loading content, please wait...</span>
    </div>
  );
};

export default Loader;
