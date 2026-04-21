import React from 'react';
import PublicNavbar from '../common/PublicNavbar';
import Footer from '../common/Footer';

const PublicLayout = ({ children }) => {
  return (
    <div className="public-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PublicNavbar />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
