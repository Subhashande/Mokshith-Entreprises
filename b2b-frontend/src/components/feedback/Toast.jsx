import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import styles from './Toast.module.css';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle style={{ color: 'var(--success)' }} size={20} aria-hidden="true" />,
    error: <AlertCircle style={{ color: 'var(--error)' }} size={20} aria-hidden="true" />,
    info: <Info style={{ color: 'var(--primary)' }} size={20} aria-hidden="true" />
  };

  const ariaLabels = {
    success: 'Success notification',
    error: 'Error notification',
    info: 'Information notification'
  };

  return (
    <div 
      className={`${styles.container} ${styles[type]}`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-label={ariaLabels[type]}
    >
      <div className={styles.icon}>{icons[type]}</div>
      <div className={styles.message}>{message}</div>
      <button 
        className={styles.close} 
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;