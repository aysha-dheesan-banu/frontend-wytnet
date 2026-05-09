const PROJECT1_URL = 'http://localhost:8000';
const CLIENT_ID = 'client_xRleoxpBuyHaFScBx2bFQA'; // ← replace with your actual client_id from Project 1 admin panel
const REDIRECT_URI = 'http://localhost:5173/dashboard.html'; // ← your callback page

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('sso-login-btn');
    const statusDiv = document.getElementById('status');

    // Check if we are returning from OAuth (callback has ?code=)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
        // Exchange code for JWT
        statusDiv.classList.remove('hidden');
        statusDiv.textContent = 'Completing login...';

        fetch(`${PROJECT1_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: CLIENT_ID,
                client_secret: 'QmeXxUynHJmprGu2J1TLi40WtaOSa4xgIWOZHcQY5jU', // ← from Project 1 admin panel
                redirect_uri: REDIRECT_URI,
            }),
        })
        .then(r => r.json())
        .then(data => {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                
                // Fetch user profile to show in dashboard
                fetch(`${PROJECT1_URL}/oauth/userinfo`, {
                    headers: { 'Authorization': `Bearer ${data.access_token}` }
                })
                .then(res => res.json())
                .then(user => {
                    localStorage.setItem('user', JSON.stringify(user));
                    statusDiv.textContent = 'Login successful! Redirecting...';
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 800);
                });
            } else {
                statusDiv.textContent = 'Login failed. Please try again.';
            }
        })
        .catch(() => {
            statusDiv.textContent = 'Connection error. Please try again.';
        });
        return;
    }

    // Sign in button click — redirect to Project 1 OAuth
    loginBtn.addEventListener('click', () => {
        const authUrl = new URL(`${PROJECT1_URL}/oauth/authorize`);
        authUrl.searchParams.set('client_id', CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid profile email');

        window.location.href = authUrl.toString();
    });
});