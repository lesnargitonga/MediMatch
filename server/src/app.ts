
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import usersRouter from './routes/users.routes';
import listingsRouter from './routes/listings.routes';
import matchesRouter from './routes/matches.routes';
import systemRouter from './routes/system.routes';
import adminRouter from './routes/admin.routes';
import chatRouter from './routes/chat.routes';
import ratingsRouter from './routes/ratings.routes';
import notificationsRouter from './routes/notifications.routes';
import favoritesRouter from './routes/favorites.routes';

const app = express();

// Security headers
app.use(helmet());
app.use(cookieParser());

// Disable weak caching for API responses so polling endpoints (like unread counts)
// always return fresh data. Also disable ETag generation to avoid 304 responses
// that can interfere with client-side polling logic.
app.set('etag', false);
app.use((req, res, next) => {
	if (req.path.startsWith('/api/')) {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
		res.setHeader('Pragma', 'no-cache');
		res.setHeader('Expires', '0');
		res.setHeader('Surrogate-Control', 'no-store');
	}
	next();
});

// CORS allowlist (comma-separated origins in CORS_ORIGIN), fallback to * in dev
const allowlist = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const devOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
const corsOptions: cors.CorsOptions = {
	origin: (origin, cb) => {
		if (!origin || devOrigins.includes(origin)) return cb(null, true);
		if (allowlist.length && allowlist.includes(origin)) return cb(null, true);
		return cb(new Error('Not allowed by CORS'), false);
	},
	credentials: true
};
app.use(cors(corsOptions));

// Rate limit (disabled if DISABLE_RATE_LIMIT=true)
if (process.env.DISABLE_RATE_LIMIT !== 'true') {
	const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
	const rateMax = Number(process.env.RATE_LIMIT_MAX || 200);
	app.use(rateLimit({ windowMs: rateWindowMs, max: rateMax, standardHeaders: true, legacyHeaders: false }));
}
app.use(express.json());

// Dev diagnostic: log every incoming request method + path
if (process.env.NODE_ENV !== 'production') {
	app.use((req, _res, next) => {
		console.log(`[req] ${req.method} ${req.url}`);
		next();
	});
}

app.use('/api/auth', usersRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api', systemRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
app.use('/api', ratingsRouter);
app.use('/api', notificationsRouter);
app.use('/api', favoritesRouter);
// Messaging disabled for anonymous mode

// Kept for backward-compat (also provided by system router)
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Lightweight test page for quick API checks (helps when client isn't running)
app.get('/', (req, res) => {
	res.type('html').send(`
		<!doctype html>
		<html>
		<head>
			<meta charset="utf-8" />
			<title>MediMatch API Test</title>
			<style>body{font-family:Arial,Helvetica,sans-serif;padding:16px}button{margin:6px}</style>
		</head>
		<body>
			<h1>MediMatch — Quick API Test</h1>
			<p>Use the buttons below to call API endpoints on this server.</p>
			<div>
				<button id="health">Health</button>
				<button id="register">Register</button>
				<button id="login">Login</button>
				<button id="listings">Get Listings</button>
			</div>
			<pre id="out" style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border:1px solid #ddd;margin-top:12px;max-height:400px;overflow:auto"></pre>
			<script>
				const out = document.getElementById('out');
				document.getElementById('health').onclick = async () => {
					const r = await fetch('/api/health'); out.textContent = await r.text();
				};
				document.getElementById('register').onclick = async () => {
					const body = { email: 'test@example.com', password: 'Password123', name: 'Test User' };
					const r = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
					out.textContent = await r.text();
				};
				document.getElementById('login').onclick = async () => {
					const body = { email: 'test@example.com', password: 'Password123' };
					const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
					out.textContent = await r.text();
				};
				document.getElementById('listings').onclick = async () => {
					const r = await fetch('/api/listings'); out.textContent = await r.text();
				};
			</script>
		</body>
		</html>
	`);
});

export default app;
