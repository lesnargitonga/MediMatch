import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import './styles.css';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { Toaster } from 'react-hot-toast';
import API from './services/api';

// NProgress configuration
NProgress.configure({ showSpinner: false, trickleSpeed: 120 });

// Axios progress hooks
let pending = 0;
API.interceptors.request.use(cfg => { pending++; NProgress.start(); return cfg; });
API.interceptors.response.use(
  res => { pending = Math.max(0, pending - 1); if (pending === 0) NProgress.done(); return res; },
  err => { pending = Math.max(0, pending - 1); if (pending === 0) NProgress.done(); return Promise.reject(err); }
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="listings" element={<Listings />} />
          <Route path="listings/:id" element={<ListingDetail />} />
          <Route path="register" element={<Auth />} />
          <Route path="login" element={<Auth />} />
          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
