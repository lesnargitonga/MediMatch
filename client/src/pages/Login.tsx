import React, { useState } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Login() {
	const nav = useNavigate();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [newPassword, setNewPassword] = useState('');
	const [pwError, setPwError] = useState('');
	const [pwSuccess, setPwSuccess] = useState('');



			async function handleLogin(e: React.FormEvent) {
				e.preventDefault();
				setError(null);
				try {
					// Backend login endpoint (cookie-based)
					await API.post('/auth/login', { email, password }, { withCredentials: true });
					toast.success('Welcome back!');
					// You should use AuthContext for redirect after login in the new flow
					nav('/');
				} catch (err: any) {
					const msg = err?.response?.data?.error || err?.message || 'Login failed';
					setError(msg);
					toast.error(msg);
				}
			}



	async function handleChangePassword(e: React.FormEvent) {
		e.preventDefault();
		setPwError('');
		setPwSuccess('');
		try {
			// Backend password change endpoint (cookie-based)
			await API.put('/auth/me', { password: newPassword }, { withCredentials: true });
			setPwSuccess('Password changed successfully');
			setNewPassword('');
		} catch (err: any) {
			const msg = err?.response?.data?.error || err?.message || 'Password change failed';
			setPwError(msg);
		}
	}

	return (
		<div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
			<div className="heading">Login</div>
			<form onSubmit={handleLogin}>
				<input
					type="email"
					value={email}
					onChange={e => setEmail(e.target.value)}
					placeholder="Email"
					style={{ width: '100%', marginBottom: 12 }}
				/>
				<input
					type="password"
					value={password}
					onChange={e => setPassword(e.target.value)}
					placeholder="Password"
					style={{ width: '100%', marginBottom: 12 }}
				/>
				{error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
				<button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
			</form>
			<hr style={{ margin: '32px 0' }} />
			<form onSubmit={handleChangePassword}>
				<h3>Change Password</h3>
				<input
					type="password"
					value={newPassword}
					onChange={e => setNewPassword(e.target.value)}
					placeholder="New Password"
					style={{ width: '100%', marginBottom: 12 }}
				/>
				<button type="submit" style={{ width: '100%' }}>Change Password</button>
				{pwError && <div style={{ color: 'red', marginTop: 12 }}>{pwError}</div>}
				{pwSuccess && <div style={{ color: 'green', marginTop: 12 }}>{pwSuccess}</div>}
			</form>
		</div>
	);
}
