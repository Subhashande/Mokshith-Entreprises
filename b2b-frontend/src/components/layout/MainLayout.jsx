import React, { useEffect } from 'react';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import styles from './MainLayout.module.css';

const MainLayout = ({ children }) => {
  const { on } = useSocket();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    // 📡 Real-time Updates: Payment Success
    const offPayment = on('payment:success', (data) => {
      showToast(` Payment Success: ₹${data.amount.toLocaleString()} for Order #${data.orderId}`, 'success');
      // If we are on the payment page, we might want to refresh or navigate
    });

    //  Real-time Updates: Delivery Assigned
    const offDelivery = on('delivery:assigned', (data) => {
      showToast(` Delivery Agent Assigned for Order #${data.orderId}`, 'info');
    });

    return () => {
      if (offPayment) offPayment();
      if (offDelivery) offDelivery();
    };
  }, [on, showToast]);

  return (
    <div className="main-layout flex flex-col min-h-screen bg-gray-50/30">
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      
      <Navbar />
      <main id="main-content" className="flex-1" tabIndex="-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;