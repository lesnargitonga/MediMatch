
import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import HealthBadge from './HealthBadge';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import toast from 'react-hot-toast';

export default function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  useEffect(() => {
    if (!user) return;
    
    const fetchUnreadCount = async () => {
      try {
        const res = await API.get('/notifications/unread-count');
        const newCount = res.data.count || 0;
        setUnreadCount(newCount);
        if (showDropdown && newCount !== unreadCount) {
          setLastFetchTime(Date.now());
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [user, showDropdown, unreadCount]);

  // Fetch notifications when dropdown opens and auto-refresh
  useEffect(() => {
    if (!showDropdown || !user) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const res = await API.get('/notifications?limit=10');
        setNotifications(res.data.notifications || []);
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to fetch notifications:', error);
        if (loading) {
          toast.error('Failed to load notifications');
        }
        setLoading(false);
      }
    };

    setLoading(true);
    fetchNotifications();
    
    // Auto-refresh while dropdown is open
    const interval = setInterval(fetchNotifications, 5000);

    return () => clearInterval(interval);
  }, [showDropdown, user, lastFetchTime]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      nav(notification.link);
      setShowDropdown(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    nav('/');
  };

  const dashboardTab = new URLSearchParams(location.search).get('demoTab');
  const navClass = (active: boolean) => `subtle ${active ? 'active' : ''}`;

  return (
    <div className="header-bar">
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="logo-wrap">
            <img src="/images/logo.svg" alt="MediMatch" />
            <a href="/" className="logo-text" style={{ textDecoration:'none' }}>MediMatch</a>
          </div>
          <div className="nav">
            <NavLink to="/dashboard" className={() => navClass(location.pathname === '/dashboard' && !['map', 'suggested'].includes(dashboardTab || ''))}>Command</NavLink>
            <NavLink to="/dashboard?demoTab=map" className={() => navClass(location.pathname === '/dashboard' && dashboardTab === 'map')}>Map</NavLink>
            <NavLink to="/dashboard?demoTab=suggested" className={() => navClass(location.pathname === '/dashboard' && dashboardTab === 'suggested')}>Matches</NavLink>
            <NavLink to="/listings" className={({isActive}) => navClass(isActive)}>Listings</NavLink>
            <NavLink to="/admin" className={({isActive}) => navClass(isActive)}>Review</NavLink>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <HealthBadge />
          {user && (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                className="btn btn-outline"
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Notifications"
                style={{ position: 'relative', padding: '7px 10px', display: 'flex', alignItems: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Backdrop to prevent content interaction and fix overlap visuals */}
              {showDropdown && (
                <div
                  onClick={() => setShowDropdown(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.02)', zIndex: 99990 }}
                />
              )}

              {showDropdown && (
                <div style={{
                  position: 'fixed',
                  top: 80,
                  right: 20,
                  width: 450,
                  maxWidth: 'calc(100vw - 40px)',
                  backgroundColor: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  zIndex: 99999,
                  maxHeight: 'calc(100vh - 120px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ 
                    padding: '16px 20px', 
                    borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-color)',
                    flexShrink: 0
                  }}>
                    <strong style={{ fontSize: '1.1rem' }}>Notifications</strong>
                    {unreadCount > 0 && (
                      <button 
                        className="btn btn-ghost" 
                        style={{ fontSize: '0.85rem', padding: '6px 12px' }} 
                        onClick={(e) => { e.stopPropagation(); handleMarkAllAsRead(); }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                      <div style={{ padding: 40, textAlign: 'center' }} className="muted-small">
                        <div>Loading...</div>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center' }} className="muted-small">
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                        <div>No notifications yet</div>
                      </div>
                    ) : (
                      <div>
                        {notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            style={{
                              padding: '16px 20px',
                              borderBottom: '1px solid var(--border-color)',
                              cursor: notif.link ? 'pointer' : 'default',
                              backgroundColor: notif.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { 
                              if (notif.link) {
                                e.currentTarget.style.backgroundColor = notif.is_read ? 'rgba(0,0,0,0.03)' : 'rgba(59, 130, 246, 0.12)';
                              }
                            }}
                            onMouseLeave={(e) => { 
                              e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.08)'; 
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                {!notif.is_read && (
                                  <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#3b82f6',
                                    flexShrink: 0
                                  }} />
                                )}
                                <strong style={{ fontSize: '0.95rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.title}</strong>
                              </div>
                              <span className="muted-small" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {new Date(notif.created_at).toLocaleString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <div 
                              className="muted-small" 
                              style={{ 
                                fontSize: '0.9rem', 
                                lineHeight: 1.5, 
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                paddingLeft: !notif.is_read ? 16 : 0
                              }}
                            >
                              {notif.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{user.name || user.email}</div>
                {user.role === 'admin' && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Coordinator</div>}
              </div>
              <button className="btn btn-outline" style={{ padding: '7px 14px', fontSize: '0.88rem' }} onClick={handleLogout}>Sign out</button>
            </div>
          ) : null}
          <ThemeToggle />
        </div>
      </nav>
      <div className="brand-ribbon" />
    </div>
  );
}
