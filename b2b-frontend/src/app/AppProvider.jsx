import { Provider } from 'react-redux';
import { store } from './store';
import { SocketProvider } from '../context/SocketContext';
import { NotificationProvider } from '../context/NotificationContext';

const AppProvider = ({ children }) => {
  return (
    <Provider store={store}>
      <NotificationProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </NotificationProvider>
    </Provider>
  );
};

export default AppProvider;
