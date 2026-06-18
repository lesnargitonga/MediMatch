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
		<div style={{ maxWidth: 440, margin: '48px auto' }}>
			<div className="card fade-in-up">
				<div style={{ marginBottom: 24 }}>
					<div className="brand-accent" />
					<div className="heading" style={{ marginBottom: 4 }}>Sign in</div>
					<div className="muted" style={{ fontSize: '0.95rem' }}>Welcome back to MediMatch</div>
				</div>
				<form onSubmit={handleLogin}>
					<div className="form-group">
						<label>Email</label>
						<input
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							placeholder="you@example.com"
							required
							autoComplete="email"
						/>
					</div>
					<div className="form-group">
						<label>Password</label>
						<input
							type="password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="Your password"
							required
							autoComplete="current-password"
						/>
					</div>
					{error && <div className="text-danger" style={{ marginBottom: 12 }}>{error}</div>}
					<button
						type="submit"
						className="btn btn-primary"
						style={{ width: '100%', marginTop: 4 }}
						disabled={loading}
					>
						{loading ? 'Signing in…' : 'Sign in'}
					</button>
				</form>
				<div className="muted-small" style={{ marginTop: 20, textAlign: 'center' }}>
					Don't have an account?{' '}
					<Link to="/auth" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
						Create one
					</Link>
				</div>
			</div>
		</div>
	);
}
