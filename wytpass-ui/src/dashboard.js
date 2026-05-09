const PROJECT1_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');

    if (!token) {
        window.location.href = '/';
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
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    // Show user email from JWT
    const payload = parseJwt(token);
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('user-details').classList.remove('hidden');
    document.getElementById('user-email').textContent =
        payload?.email || payload?.sub || 'Unknown User';

    // Fetch connected apps from Project 1
    try {
        const res = await fetch(`${PROJECT1_URL}/oauth/userinfo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            localStorage.removeItem('access_token');
            window.location.href = '/';
            return;
        }
    } catch(e) {
        console.error('Could not verify token', e);
    }

    // Load connected apps
    loadConnectedApps(token);

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
    });

    async function loadConnectedApps(token) {
        try {
            const res = await fetch(`${PROJECT1_URL}/v1/users/me/connected-apps`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const userDetails = document.getElementById('user-details');

            if (res.ok) {
                const apps = await res.json();

                if (apps.length === 0) {
                    userDetails.insertAdjacentHTML('afterend', `
                        <div style="margin-top:24px; color: var(--text-muted); font-size:15px;">
                            No apps connected yet.
                        </div>
                    `);
                    return;
                }

                const appsHtml = `
                    <div style="margin-top: 32px;">
                        <div class="label" style="margin-bottom:16px;">Connected Apps</div>
                        ${apps.map(app => `
                            <div style="background: var(--card-bg); border: 1px solid var(--border);
                                border-radius: 16px; padding: 20px 24px; margin-bottom: 12px;
                                display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <div style="font-weight:600; font-size:15px; color: var(--text-main);">
                                        ${app.app_name}
                                    </div>
                                    <div style="font-size:13px; color: var(--text-muted); margin-top:4px;">
                                        Scopes: ${app.scopes.join(', ')} &nbsp;·&nbsp; Last used: ${app.last_used || 'recently'}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 12px;">
                                    <a href="${app.url}" target="_blank"
                                        style="padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(var(--primary-rgb),0.3);
                                        background: rgba(var(--primary-rgb),0.1); color: var(--primary); font-size:13px;
                                        cursor:pointer; font-weight:500; text-decoration:none; display: flex; align-items: center;">
                                        Launch App
                                    </a>
                                    <button onclick="revokeApp('${app.client_id}')"
                                        style="padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.3);
                                        background: rgba(239,68,68,0.1); color: #f87171; font-size:13px;
                                        cursor:pointer; font-weight:500;">
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                userDetails.insertAdjacentHTML('afterend', appsHtml);
            }
        } catch(e) {
            console.error('Could not load connected apps', e);
        }
    }
});

// Revoke app access
async function revokeApp(clientId) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${PROJECT1_URL}/oauth/revoke-app`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ client_id: clientId })
        });
        if (res.ok) {
            window.location.reload();
        }
    } catch(e) {
        console.error('Revoke failed', e);
    }
}