import React, { useState, useEffect } from 'react';
import Navbar from '../common/Navbar.jsx';
import Footer from '../common/Footer.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routeConfig.js';
import { MapPin, X } from 'lucide-react';

const MainLayout = ({ children }) => {
  const { on } = useSocket();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const [showLocationNotice, setShowLocationNotice] = useState(false);
  const [isNotBangalore, setIsNotBangalore] = useState(false);

  useEffect(() => {
    const checkLocation = () => {
      const loc = localStorage.getItem('mokshith_location') || '';
      const isBangalore = loc.toLowerCase().includes('bangalore');
      
      if (!isBangalore && loc !== '') {
        setIsNotBangalore(true);
        setShowLocationNotice(true);
      } else {
        setIsNotBangalore(false);
        const hasSeenNotice = localStorage.getItem('bangalore_notice_seen');
        if (!hasSeenNotice) {
          setShowLocationNotice(true);
        }
      }
    };

    checkLocation();

    // Listen for custom location update events
    window.addEventListener('locationUpdated', checkLocation);
    return () => window.removeEventListener('locationUpdated', checkLocation);
  }, []);

  const closeNotice = () => {
    localStorage.setItem('bangalore_notice_seen', 'true');
    setShowLocationNotice(false);
  };

  useEffect(() => {
    // 📡 Real-time Updates: Payment Success
    const offPayment = on('payment:success', (data) => {
      showToast(`🎉 Payment Success: ₹${data.amount.toLocaleString()} for Order #${data.orderId}`, 'success');
      // If we are on the payment page, we might want to refresh or navigate
    });

    // 🚚 Real-time Updates: Delivery Assigned
    const offDelivery = on('delivery:assigned', (data) => {
      showToast(`🚚 Delivery Agent Assigned for Order #${data.orderId}`, 'info');
    });

    return () => {
      if (offPayment) offPayment();
      if (offDelivery) offDelivery();
    };
  }, [on, showToast]);

  return (
    <div className="main-layout flex flex-col min-h-screen bg-white">
      <Navbar />
      
      {/* SINGLE SOURCE OF TRUTH BANNER */}
      <div className="bg-[#16A34A] text-white py-2 px-4 flex items-center justify-center gap-3 sticky top-[70px] z-50 shadow-md">
        <MapPin size={12} className="fill-white/20" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Currently serving in Bangalore only</span>
      </div>

      <main className="flex-1 w-full flex flex-col items-center">
        <div className="w-full">
          {children}
        </div>
      </main>
      <Footer />

      {/* LOCATION MODAL */}
      {showLocationNotice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
            {!isNotBangalore && (
              <button onClick={closeNotice} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            )}
            
            <div className={`w-20 h-20 ${isNotBangalore ? 'bg-amber-50' : 'bg-emerald-50'} rounded-full flex items-center justify-center mb-6`}>
              <MapPin size={40} className={isNotBangalore ? 'text-amber-600' : 'text-emerald-600'} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              {isNotBangalore ? 'Location Not Deliverable' : 'Serving Bangalore!'}
            </h2>
            <p className="text-slate-500 font-medium mb-8">
              {isNotBangalore 
                ? 'Mokshith B2B currently operates exclusively in Bangalore. Please change your location to Bangalore to continue shopping.'
                : 'Mokshith B2B currently operates exclusively in Bangalore. We are working hard to expand to other cities soon.'
              }
            </p>
            
            <button 
              onClick={isNotBangalore ? () => window.dispatchEvent(new CustomEvent('openLocationPicker')) : closeNotice}
              className={`w-full ${isNotBangalore ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'} text-white font-black py-4 rounded-2xl transition-all shadow-lg uppercase tracking-widest text-xs`}
            >
              {isNotBangalore ? 'Change Location' : 'Start Shopping'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;