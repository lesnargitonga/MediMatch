import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ margin: 0 }}>404 — Page not found</h2>
      <p className="muted">The page you’re looking for doesn’t exist or was moved.</p>
      <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
        <Link to="/" className="btn btn-primary">Go Home</Link>
        <Link to="/listings" className="btn">Browse Listings</Link>
      </div>
    </section>
  );
}
