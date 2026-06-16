import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

function RoleEffect() {
  const { user } = useAuth();
  useEffect(() => {
    const role = user?.role === 'admin' ? 'admin' : 'client';
    document.documentElement.setAttribute('data-role', role);
  }, [user]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="root">
        <RoleEffect />
        <div className="container">
          <header className="header">
            <Header />
          </header>
          <main>
            <Outlet />
          </main>
          <footer className="footer">
            <div>&copy; {new Date().getFullYear()} MediMatch — Geospatial redistribution command center.</div>
            <div className="muted-small">MediMatch is a Lesnar AI public-health prototype. Synthetic demo data only.</div>
          </footer>
        </div>
      </div>
    </AuthProvider>
  );
}
