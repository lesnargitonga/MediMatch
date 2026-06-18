import React, { useState } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
	const nav = useNavigate();
	const { refresh } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			await API.post('/auth/login', { email, password }, { withCredentials: true });
			await refresh();
			toast.success('Welcome back!');
			nav('/');
		} catch (err: any) {
			const msg = err?.response?.data?.error || err?.message || 'Login failed';
			setError(msg);
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="auth">
			<div className="lx-aurora" aria-hidden />
			<div className="auth-shell">
				<aside className="auth-brand">
					<div className="auth-kicker"><span className="lx-pulse" /> Coordinator access</div>
					<h1>Coordinate care at<br /><span className="hl">national scale.</span></h1>
					<p>Sign in to manage listings, run redistribution and act on ranked, verified recommendations across the network.</p>
					<div className="auth-stats">
						<div><b>50</b><span>Nairobi facilities</span></div>
						<div><b>96%</b><span>Demand coverage</span></div>
						<div><b>90.3%</b><span>Would adopt</span></div>
					</div>
				</aside>
				<div className="auth-card">
					<div className="auth-h">Sign in</div>
					<div className="auth-sub">Welcome back to MediMatch</div>
					<form onSubmit={handleLogin}>
						<div className="auth-field">
							<label>Email</label>
							<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
						</div>
						<div className="auth-field">
							<label>Password</label>
							<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required autoComplete="current-password" />
						</div>
						{error && <div className="auth-error">{error}</div>}
						<button type="submit" className="auth-submit" disabled={loading}>
							{loading ? 'Signing in…' : 'Sign in →'}
						</button>
					</form>
					<div className="auth-foot">
						Don't have an account? <Link to="/register">Create one</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
