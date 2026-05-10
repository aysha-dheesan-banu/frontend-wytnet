const isProd = window.location.hostname === 'wytnet.com';
const API_BASE = isProd ? 'https://api.wytnet.com' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');
const PREMIUM_DASHBOARD = 'http://localhost:3000'; // Temporary revert for dev

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const authBtn = document.getElementById('auth-btn');
    const btnText = authBtn.querySelector('.btn-text');
    const spinner = authBtn.querySelector('.spinner');
    const oauthContext = document.getElementById('oauth-context');
    const clientNameSpan = document.getElementById('client-name');
    
    // Toggle Elements
    const toggleAuth = document.getElementById('toggle-auth');
    const toggleText = document.getElementById('toggle-text');
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const nameGroup = document.getElementById('name-group');
    const rememberGroup = document.getElementById('remember-group');

    let isLogin = true;

    // Check for OAuth parameters
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client_id');
    const redirectUri = urlParams.get('redirect_uri');

    if (clientId && redirectUri) {
        oauthContext.classList.remove('hidden');
        clientNameSpan.textContent = 'External Application';
    }

    // Toggle between Login and Signup using event delegation
    document.querySelector('.login-footer').addEventListener('click', (e) => {
        if (e.target.id === 'toggle-auth') {
            e.preventDefault();
            isLogin = !isLogin;
            
            if (isLogin) {
                formTitle.textContent = 'Welcome Back';
                formSubtitle.textContent = 'Enter your credentials to access your account';
                btnText.textContent = 'Sign In';
                toggleText.innerHTML = `Don't have an account? <a href="#" id="toggle-auth">Sign up</a>`;
                nameGroup.classList.add('hidden');
                rememberGroup.classList.remove('hidden');
            } else {
                formTitle.textContent = 'Create Account';
                formSubtitle.textContent = 'Join WytPass to manage your apps and identity';
                btnText.textContent = 'Create Account';
                toggleText.innerHTML = `Already have an account? <a href="#" id="toggle-auth">Sign in</a>`;
                nameGroup.classList.remove('hidden');
                rememberGroup.classList.add('hidden');
            }
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted. isLogin:', isLogin);

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('name').value;

        console.log('Credentials:', { email, isLogin, hasName: !!fullName });

        setLoading(true);

        try {
            if (isLogin) {
                if (clientId && redirectUri) {
                    console.log('Starting OAuth Login Flow');
                    const authorizeUrl = new URL(`${API_BASE}/oauth/authorize`);
                    authorizeUrl.searchParams.append('client_id', clientId);
                    authorizeUrl.searchParams.append('redirect_uri', redirectUri);
                    authorizeUrl.searchParams.append('email', email);
                    authorizeUrl.searchParams.append('password', password);
                    authorizeUrl.searchParams.append('confirm', 'true');

                    showToast('Authorizing...', 'info');
                    window.location.href = authorizeUrl.toString();
                } else {
                    console.log('Starting Standard Login Flow');
                    const response = await fetch(`${API_BASE}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        showToast('Login successful! Redirecting...', 'success');
                        localStorage.setItem('access_token', data.access_token);
                        localStorage.setItem('refresh_token', data.refresh_token);

                        setTimeout(() => {
                            const payload = parseJwt(data.access_token);
                            const roles = payload?.roles || [];
                            const isAdmin = roles.includes('admin') || roles.includes('super_admin') || email === 'admin@example.com';

                            if (isAdmin) {
                                console.log('Admin detected, redirecting to premium dashboard with token');
                                window.location.href = `${PREMIUM_DASHBOARD}/login?token=${data.access_token}`;
                            } else {
                                const redirect = urlParams.get('redirect');
                                if (redirect) window.location.href = `/${redirect}`;
                                else window.location.href = '/dashboard.html';
                            }
                        }, 1000);
                    } else {
                        console.error('Login failed:', data);
                        showToast(data.detail || 'Login failed', 'error');
                        setLoading(false);
                    }
                }
            } else {
                console.log('Starting Registration Flow');
                const response = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email, 
                        password, 
                        full_name: fullName 
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    console.log('Registration success:', data);
                    showToast('Account created! You can now sign in.', 'success');
                    
                    // Switch back to login view automatically
                    isLogin = true;
                    formTitle.textContent = 'Welcome Back';
                    formSubtitle.textContent = 'Enter your credentials to access your account';
                    btnText.textContent = 'Sign In';
                    toggleText.innerHTML = `Don't have an account? <a href="#" id="toggle-auth">Sign up</a>`;
                    nameGroup.classList.add('hidden');
                    rememberGroup.classList.remove('hidden');
                    
                    setLoading(false);
                } else {
                    console.error('Registration failed:', data);
                    showToast(data.detail || 'Registration failed', 'error');
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Auth connection error:', error);
            showToast('Connection error. Is the server running?', 'error');
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            authBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            authBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        if (type === 'error') toast.style.borderLeftColor = '#ef4444';
        if (type === 'success') toast.style.borderLeftColor = '#10b981';

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }
});
