const PROJECT1_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CLIENT_ID = 'client_xRleoxpBuyHaFScBx2bFQA'; 
const REDIRECT_URI = `${window.location.origin}/project-a/dashboard.html`; 

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('sso-login-btn');
    const statusDiv = document.getElementById('status');

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
        statusDiv.classList.remove('hidden');
        statusDiv.textContent = 'Completing login...';

        fetch(`${PROJECT1_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: CLIENT_ID,
                client_secret: 'QmeXxUynHJmprGu2J1TLi40WtaOSa4xgIWOZHcQY5jU', 
                redirect_uri: REDIRECT_URI,
            }),
        })
        .then(r => r.json())
        .then(data => {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
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

    loginBtn.addEventListener('click', () => {
        const authUrl = new URL(`${PROJECT1_URL}/oauth/authorize`);
        authUrl.searchParams.set('client_id', CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid profile email');

        window.location.href = authUrl.toString();
    });
});
