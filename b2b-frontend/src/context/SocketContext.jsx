import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { logout as logoutAction } from '../modules/auth/authSlice.js';
import { useNavigate } from 'react-router-dom';
import { routes } from '../routes/routeConfig.js';
import { showGlobalToast } from './NotificationContext.jsx';

const SocketContext = createContext(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    // Return a dummy object with no-op functions to prevent crashing
    // while the provider is initializing or if it's accidentally used outside
    return {
      socket: null,
      isConnected: false,
      emit: () => {},
      on: () => () => {}
    };
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, sessionId } = useSelector((state) => state.auth);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const sessionRegisteredRef = useRef(false);
  const isDev = import.meta.env.DEV;

  const logDebug = useCallback((...args) => {
    if (isDev) {
      console.log(...args);
    }
  }, [isDev]);

  const logError = useCallback((...args) => {
    if (isDev) {
      console.error(...args);
    }
  }, [isDev]);

  // Handle force logout
  const handleForceLogout = useCallback((data) => {
    const message = 'Your account was logged in from another device.';
    
    // Clear auth state
    dispatch(logoutAction());
    
    showGlobalToast(message, 'error', 5000);
    
    // Redirect to login
    if (window.location.pathname !== routes.LOGIN) {
      navigate(routes.LOGIN, { replace: true });
    }
  }, [dispatch, navigate]);

  useEffect(() => {
    let socketInstance = null;

    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      sessionRegisteredRef.current = false;
      return;
    }

    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const fallbackSocketUrl = window.location.origin.includes('vercel.app')
      ? 'https://mokshith-entreprises.onrender.com'
      : 'http://localhost:5000';

    const SOCKET_URL = envSocketUrl || fallbackSocketUrl;
    
    socketInstance = io(SOCKET_URL, {
      auth: {
        token: token,
        userId: user._id || user.id
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketInstance.on('connect', () => {
      logDebug('Socket connected');
      setIsConnected(true);
      socketInstance.emit('join', user._id || user.id);
      
      // Register session with backend once per connection.
      if (token && !sessionRegisteredRef.current) {
        socketInstance.emit('register_session', { token, sessionId });
        sessionRegisteredRef.current = true;
      }
    });

    socketInstance.on('session_registered', ({ success }) => {
      if (success) {
        logDebug('Session registered with socket');
      }
    });

    socketInstance.on('session_error', ({ message }) => {
      logError('Session registration error:', message);
    });

    // Handle force logout
    socketInstance.on('force_logout', handleForceLogout);

    socketInstance.on('disconnect', (reason) => {
      logDebug('Socket disconnected:', reason);
      setIsConnected(false);
      sessionRegisteredRef.current = false;
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        socketInstance.connect();
      }
    });

    socketInstance.on('reconnect_attempt', (attempt) => {
      // Reconnection in progress
    });

    socketInstance.on('reconnect_failed', () => {
      logError('Socket reconnection failed');
    });

    socketInstance.on('connect_error', (err) => {
      logError('Socket connection error:', err.message);
    });

    setSocket(socketInstance);
    setIsConnected(socketInstance.connected);

    return () => {
      if (socketInstance) {
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('reconnect_attempt');
        socketInstance.off('reconnect_failed');
        socketInstance.off('connect_error');
        socketInstance.off('session_registered');
        socketInstance.off('session_error');
        socketInstance.off('force_logout');
        socketInstance.disconnect();
      }
    };
  }, [user?._id, user?.id, token, sessionId, handleForceLogout, logDebug, logError]);

  const emit = useCallback((event, data) => {
    if (socket) {
      socket.emit(event, data);
    }
  }, [socket]);

  const on = useCallback((event, handler) => {
    if (socket) {
      socket.on(event, handler);
    }
    return () => {
      if (socket) {
        socket.off(event, handler);
      }
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit, on }}>
      {children}
    </SocketContext.Provider>
  );
};
