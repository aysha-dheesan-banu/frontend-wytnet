const PROJECT1_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client_id');
    const redirectUri = urlParams.get('redirect_uri');
    const state = urlParams.get('state');
    const scope = urlParams.get('scope') || 'openid profile email';

    const token = localStorage.getItem('access_token');
    const userEmailElem = document.getElementById('user-email');
    const userAvatarElem = document.getElementById('user-avatar');
    const trustBtn = document.getElementById('trust-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const spinner = trustBtn.querySelector('.spinner');
    const btnText = trustBtn.querySelector('.btn-text');

    // If no token, show login form first
    if (!token) {
        showLoginForm();
        return;
    }

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64).split('').map(c =>
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join('')
            );
            const payload = JSON.parse(jsonPayload);
            console.log('Parsed JWT Payload:', payload);
            return payload;
        } catch (e) {
            console.error('JWT Parse Error:', e);
            return null;
        }
    }

    // Has token — verify it and show consent screen
    console.log('Found token in localStorage, length:', token.length);
    await showConsentScreen(token);

    async function showLoginForm() {
        console.log('Showing login form');
        const card = document.querySelector('.login-card');
        card.innerHTML = `
            <div class="login-header">
                <img src="/logo.png" alt="WytPass Logo" class="logo">
                <h1>Welcome Back</h1>
                <p>Enter your credentials to access your account</p>
            </div>

            <div style="margin-bottom: 20px; text-align: left;">
                <div class="input-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: var(--text-muted);">Email Address</label>
                    <input id="email-input" type="email" placeholder="name@company.com" 
                        style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);
                        background:var(--input-bg);color:var(--text-main);font-size:15px;box-sizing:border-box;">
                </div>

                <div class="input-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: var(--text-muted);">Password</label>
                    <input id="pass-input" type="password" placeholder="••••••••"
                        style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);
                        background:var(--input-bg);color:var(--text-main);font-size:15px;box-sizing:border-box;">
                </div>
            </div>
            
            <div id="login-error" style="color:#f87171;font-size:14px;margin-bottom:12px;display:none;"></div>
            
            <button id="login-submit-btn" style="width:100%;padding:14px;background:linear-gradient(135deg,var(--primary),var(--secondary));
                border:none;border-radius:12px;color:white;font-size:16px;font-weight:600;cursor:pointer;">
                Sign In
            </button>

            <div class="login-footer" style="margin-top: 24px; text-align: center; font-size: 14px; color: var(--text-muted);">
                <p>Don't have an account? <a href="#" style="color: var(--primary); text-decoration: none; font-weight: 600;">Sign up</a></p>
            </div>
        `;

        document.getElementById('login-submit-btn').addEventListener('click', async () => {
            const email = document.getElementById('email-input').value;
            const password = document.getElementById('pass-input').value;
            const errDiv = document.getElementById('login-error');

            try {
                const res = await fetch(`${PROJECT1_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password }),
                });

                const data = await res.json();

                if (res.ok && data.access_token) {
                    console.log('Login successful, setting token');
                    localStorage.setItem('access_token', data.access_token);
                    const authUrl = new URL(`${PROJECT1_URL}/oauth/authorize`);
                    // Forward all original query parameters
                    const params = new URLSearchParams(window.location.search);
                    params.forEach((value, key) => {
                        authUrl.searchParams.set(key, value);
                    });
                    window.location.href = authUrl.toString();
                } else {
                    errDiv.style.display = 'block';
                    errDiv.textContent = data.detail || 'Invalid credentials';
                }
            } catch (e) {
                errDiv.style.display = 'block';
                errDiv.textContent = 'Connection error. Is Project 1 running?';
            }
        });
    }

    async function showConsentScreen(token) {
        console.log('Showing consent screen');
        // Show user email from JWT immediately as primary truth
        const payload = parseJwt(token);
        if (payload) {
            const email = payload.email || payload.sub;
            console.log('Email from JWT:', email);
            if (userEmailElem) userEmailElem.textContent = email;
            if (userAvatarElem) userAvatarElem.textContent = email.charAt(0).toUpperCase();
        }

        // Add a "Switch Account" option in case identity is wrong
        const userInfoBox = document.querySelector('.user-info-box');
        if (userInfoBox && !document.getElementById('switch-account')) {
            userInfoBox.insertAdjacentHTML('afterend', `
                <div style="text-align: right; margin-top: -24px; margin-bottom: 24px; font-size: 13px;">
                    <a href="#" id="switch-account" style="color: var(--primary); text-decoration: none;">Not you? Switch account</a>
                </div>
            `);
            document.getElementById('switch-account').addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('access_token');
                window.location.reload();
            });
        }

        // Fetch user info from backend for verification/updates
        try {
            const res = await fetch(`${PROJECT1_URL}/oauth/userinfo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                console.log('Userinfo from backend:', user);
                if (userEmailElem) userEmailElem.textContent = user.email;
                if (userAvatarElem) userAvatarElem.textContent = user.email.charAt(0).toUpperCase();
            } else if (res.status === 401) {
                console.warn('Session expired (401). Redirecting to login...');
                localStorage.removeItem('access_token');
                window.location.reload(); // This will trigger showLoginForm()
                return;
            } else {
                console.warn('Userinfo fetch failed:', res.status);
            }
        } catch(e) {
            console.error('Userinfo fetch error:', e);
        }

        // Fetch app name
        try {
            const appRes = await fetch(`${PROJECT1_URL}/oauth/client-info?client_id=${clientId}`);
            if (appRes.ok) {
                const appData = await appRes.json();
                const appNameElem = document.querySelector('.app-request strong');
                if (appNameElem) appNameElem.textContent = appData.app_name;
            }
        } catch(e) {}

        // Trust button
        if (trustBtn) {
            trustBtn.addEventListener('click', () => {
                if (!PROJECT1_URL || PROJECT1_URL.includes('localhost')) {
                    console.warn('Warning: PROJECT1_URL is set to localhost in production!');
                }
                
                console.log('Trusting app, redirecting to:', PROJECT1_URL);
                
                try {
                    const authUrl = new URL(`${PROJECT1_URL}/oauth/authorize`);
                    // Forward all original query parameters
                    const params = new URLSearchParams(window.location.search);
                    params.forEach((value, key) => {
                        authUrl.searchParams.set(key, value);
                    });
                    
                    // CRITICAL: Add the token and confirmation flag
                    authUrl.searchParams.set('confirm', 'true');
                    authUrl.searchParams.set('token', token);
                    
                    window.location.href = authUrl.toString();
                } catch (e) {
                    alert('Redirect Error: ' + e.message);
                    console.error('Redirect Error:', e);
                }
            });
        }

        // Cancel button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.location.href = redirectUri
                    ? `${redirectUri}?error=access_denied`
                    : '/';
            });
        }
    }
});