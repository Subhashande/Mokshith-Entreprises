import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Toast from '../components/feedback/Toast.jsx';

const NotificationContext = createContext();
const GLOBAL_TOAST_EVENT = 'app:toast';

export const showGlobalToast = (message, type = 'info', duration = 4000) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(GLOBAL_TOAST_EVENT, {
      detail: { message, type, duration },
    })
  );
};

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    setToast({ message, type, duration });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    const handleGlobalToast = (event) => {
      const { message, type = 'info', duration = 4000 } = event.detail || {};
      if (message) {
        setToast({ message, type, duration });
      }
    };

    window.addEventListener(GLOBAL_TOAST_EVENT, handleGlobalToast);

    return () => {
      window.removeEventListener(GLOBAL_TOAST_EVENT, handleGlobalToast);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          duration={toast.duration} 
          onClose={hideToast} 
        />
      )}
    </NotificationContext.Provider>
  );
};
