const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const tableBody = document.getElementById('clients-table-body');
    const clientModal = document.getElementById('client-modal');
    const deleteModal = document.getElementById('delete-modal');
    const clientForm = document.getElementById('client-form');
    
    // UI Elements for modals
    const modalTitle = document.getElementById('modal-title');
    const idInput = document.getElementById('client-id');
    const appNameInput = document.getElementById('app-name-input');
    const redirectUrisInput = document.getElementById('redirect-uris-input');
    
    const credsSection = document.getElementById('credentials-section');
    const displayClientId = document.getElementById('display-client-id');
    const displayClientSecret = document.getElementById('display-client-secret');
    const displayTestToken = document.getElementById('display-test-token');
    const testTokenDisplay = document.getElementById('test-token-display');
    const curlExample = document.getElementById('curl-example');
    const generateTokenBtn = document.getElementById('generate-test-token-btn');
    const downloadConfigBtn = document.getElementById('download-config-btn');
    const shareDevBtn = document.getElementById('share-dev-btn');
    
    let currentClientIdToDelete = null;

    // --- State ---
    let clients = [];

    // --- Core Functions ---
    async function fetchClients() {
        try {
            const res = await fetch(`${API_BASE}/api/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                clients = await res.json();
                renderTable();
            } else if (res.status === 401) {
                window.location.href = '/';
            } else {
                showToast('Failed to load apps', 'error');
            }
        } catch (e) {
            showToast('Connection error', 'error');
        }
    }

    function renderTable() {
        if (clients.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px;">No apps found</td></tr>`;
            return;
        }

        tableBody.innerHTML = clients.map(client => {
            let uris = [];
            try { uris = JSON.parse(client.redirect_uris); } catch(e) { uris = [client.redirect_uris]; }
            const urisHtml = uris.map(u => `<div style="font-family: monospace; font-size: 11px; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; display: inline-block; margin: 2px;">${escapeHTML(u)}</div>`).join('');
            
            return `
            <tr>
                <td><strong>${escapeHTML(client.app_name)}</strong></td>
                <td><span style="font-family: monospace; font-size: 12px; color: var(--text-muted);">${escapeHTML(client.client_id)}</span></td>
                <td>${urisHtml}</td>
                <td style="text-align: right;">
                    <button class="action-btn edit-btn" data-id="${client.id}" title="Edit App">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button class="action-btn delete delete-btn" data-id="${client.id}" data-name="${escapeHTML(client.app_name)}" title="Delete App">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        // Attach listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openClientModal(btn.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => openDeleteModal(btn.dataset.id, btn.dataset.name));
        });
    }

    // --- Modal Logic ---
    function openClientModal(clientId = null) {
        clientForm.reset();
        idInput.value = '';
        credsSection.style.display = 'none';
        
        if (clientId) {
            const client = clients.find(c => c.id === clientId);
            if (!client) return;
            modalTitle.textContent = 'Edit App';
            
            idInput.value = client.id;
            appNameInput.value = client.app_name;
            
            let uris = [];
            try { uris = JSON.parse(client.redirect_uris); } catch(e) { uris = [client.redirect_uris]; }
            redirectUrisInput.value = uris.join(', ');
            
            displayClientId.textContent = client.client_id;
            displayClientSecret.textContent = client.client_secret;
            
            // Generate initial test token and curl
            updateIntegrationDocs(client.client_id, client.client_secret, client.app_name);
            
            credsSection.style.display = 'block';
            testTokenDisplay.style.display = 'none';
            
        } else {
            modalTitle.textContent = 'Register App';
        }
        
        clientModal.classList.add('active');
    }

    function generateSampleToken(clientId) {
        // Generate a fake but realistic looking JWT
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
        const payload = btoa(JSON.stringify({
            sub: "dev_test_user",
            client_id: clientId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            scope: "openid profile email"
        })).replace(/=/g, "");
        const signature = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        return `${header}.${payload}.${signature}`;
    }

    function updateIntegrationDocs(clientId, clientSecret, appName) {
        // Update Curl Example
        if (curlExample) {
            curlExample.textContent = `curl -X POST ${API_BASE}/oauth/token \\
  -d "grant_type=authorization_code" \\
  -d "client_id=${clientId}" \\
  -d "client_secret=${clientSecret}" \\
  -d "code=YOUR_AUTH_CODE"`;
        }
        
        // Prepare token button
        if (generateTokenBtn) {
            generateTokenBtn.onclick = () => {
                const token = generateSampleToken(clientId);
                displayTestToken.textContent = token;
                testTokenDisplay.style.display = 'block';
                showToast('Test token generated', 'success');
            };
        }

        // Download Config
        downloadConfigBtn.onclick = () => {
            const config = {
                app_name: appName,
                client_id: clientId,
                client_secret: clientSecret,
                auth_url: `${API_BASE}/oauth/authorize`,
                token_url: `${API_BASE}/oauth/token`,
                instruction: "Keep these credentials safe. Do not share them publicly."
            };
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${appName.toLowerCase().replace(/\s+/g, '_')}_credentials.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Integration docs downloaded', 'success');
        };

        // Share with Developer
        shareDevBtn.onclick = () => {
            const message = `
🚀 WytPass SSO Integration Credentials for ${appName}

Client ID: ${clientId}
Client Secret: ${clientSecret}

Endpoints:
- Authorize: ${API_BASE}/oauth/authorize
- Token: ${API_BASE}/oauth/token

Integration Guide: ${API_BASE}/docs/integration
            `.trim();
            
            navigator.clipboard.writeText(message).then(() => {
                showToast('Credentials copied for developer!', 'success');
            });
        };
    }

    function closeClientModal() {
        clientModal.classList.remove('active');
    }

    function openDeleteModal(clientId, name) {
        currentClientIdToDelete = clientId;
        document.getElementById('delete-app-name').textContent = name;
        deleteModal.classList.add('active');
    }

    function closeDeleteModal() {
        deleteModal.classList.remove('active');
        currentClientIdToDelete = null;
    }

    // --- Event Listeners ---
    document.getElementById('add-client-btn').addEventListener('click', () => openClientModal());
    document.getElementById('cancel-modal-btn').addEventListener('click', closeClientModal);
    document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);

    // Save Client (Create or Update)
    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isEdit = !!idInput.value;
        const url = isEdit ? `${API_BASE}/api/clients/${idInput.value}` : `${API_BASE}/api/clients`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const uris = redirectUrisInput.value.split(',').map(s => s.trim()).filter(s => s);
        
        const payload = {
            app_name: appNameInput.value,
            redirect_uris: uris
        };

        try {
            const saveBtn = document.getElementById('save-modal-btn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newClient = await res.json();
                showToast(`App successfully ${isEdit ? 'updated' : 'registered'}`, 'success');
                
                if (!isEdit) {
                    // If it was a new registration, don't close, show credentials
                    modalTitle.textContent = 'App Registered Successfully!';
                    idInput.value = newClient.id;
                    displayClientId.textContent = newClient.client_id;
                    displayClientSecret.textContent = newClient.client_secret;
                    
                    updateIntegrationDocs(newClient.client_id, newClient.client_secret, newClient.app_name);
                    credsSection.style.display = 'block';
                    if (testTokenDisplay) testTokenDisplay.style.display = 'none';
                    
                    // Update the button text to "I've saved it"
                    const saveBtn = document.getElementById('save-modal-btn');
                    saveBtn.textContent = "I've saved it";
                    saveBtn.onclick = () => {
                        closeClientModal();
                        saveBtn.onclick = null;
                        saveBtn.textContent = 'Save App';
                    };
                } else {
                    closeClientModal();
                }
                fetchClients();
            } else {
                const data = await res.json();
                showToast(data.detail || 'Operation failed', 'error');
            }
            
            if (isEdit) {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }
        } catch (err) {
            showToast('Connection error', 'error');
            const saveBtn = document.getElementById('save-modal-btn');
            saveBtn.disabled = false;
        }
    });

    // Copy to clipboard functionality
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn')) {
            const targetId = e.target.dataset.copy;
            const text = document.getElementById(targetId).textContent;
            navigator.clipboard.writeText(text).then(() => {
                const originalText = e.target.textContent;
                e.target.textContent = 'Copied!';
                e.target.style.background = 'var(--primary)';
                e.target.style.color = 'white';
                setTimeout(() => {
                    e.target.textContent = originalText;
                    e.target.style.background = '';
                    e.target.style.color = '';
                }, 2000);
            });
        }
    });

    // Delete Client
    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        if (!currentClientIdToDelete) return;
        
        try {
            const btn = document.getElementById('confirm-delete-btn');
            btn.textContent = 'Deleting...';
            btn.disabled = true;

            const res = await fetch(`${API_BASE}/api/clients/${currentClientIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showToast('App deleted successfully', 'success');
                closeDeleteModal();
                fetchClients();
            } else {
                showToast('Failed to delete app', 'error');
            }
            
            btn.textContent = 'Delete';
            btn.disabled = false;
        } catch (err) {
            showToast('Connection error', 'error');
        }
    });
    
    // Logout User
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
    });

    // --- Utils ---
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
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

    // Init
    fetchClients();
});
