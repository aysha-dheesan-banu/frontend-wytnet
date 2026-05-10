const isProd = window.location.hostname === 'wytnet.com';
const API_BASE = isProd ? 'https://api.wytnet.com' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

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
    const descriptionInput = document.getElementById('description-input');
    const pkceInput = document.getElementById('pkce-input');
    const urisContainer = document.getElementById('redirect-uris-container');
    const addUriBtn = document.getElementById('add-uri-btn');
    
    const credsSection = document.getElementById('credentials-section');
    const displayClientId = document.getElementById('display-client-id');
    const displayClientSecret = document.getElementById('display-client-secret');
    
    let currentClientIdToDelete = null;

    // --- State ---
    let clients = [];
    let currentFilter = 'all';
    let searchQuery = '';

    // --- Core Functions ---
    async function fetchClients() {
        try {
            const res = await fetch(`${API_BASE}/api/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                clients = await res.json();
                applyFiltersAndRender();
            } else if (res.status === 401) {
                window.location.href = '/';
            } else {
                showToast('Failed to load apps', 'error');
            }
        } catch (e) {
            showToast('Connection error', 'error');
        }
    }

    function applyFiltersAndRender() {
        let filtered = clients.filter(client => {
            const matchesSearch = !searchQuery || 
                client.app_name.toLowerCase().includes(searchQuery) || 
                client.client_id.toLowerCase().includes(searchQuery);
            
            if (currentFilter === 'active') return matchesSearch && client.is_active;
            if (currentFilter === 'disabled') return matchesSearch && !client.is_active;
            return matchesSearch;
        });

        renderTable(filtered);
    }

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 100px;">No applications found matching your criteria</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(client => {
            const scopes = client.allowed_scopes || ['openid', 'profile', 'email'];
            const scopesHtml = scopes.map(s => `<span class="scope-tag" style="margin-right: 4px;">${s}</span>`).join('');
            const createdDate = client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A';
            const pkceStatus = client.require_pkce ? 'Required' : 'Optional';
            
            return `
                <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 16px 24px;">
                        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" class="edit-btn" data-id="${client.id}">
                            <div class="app-icon">
                                <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: white;">${escapeHTML(client.app_name)}</div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Confidential: ${client.is_confidential ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 16px 24px;">
                        <code style="font-size: 11px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;">${client.client_id}</code>
                    </td>
                    <td style="padding: 16px 24px;">${scopesHtml}</td>
                    <td style="padding: 16px 24px;">
                        <div style="display: flex; align-items: center; gap: 6px; color: ${client.require_pkce ? '#10b981' : 'var(--text-muted)'};">
                            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            ${pkceStatus}
                        </div>
                    </td>
                    <td style="padding: 16px 24px;">
                        <span class="badge ${client.is_active ? 'active' : 'inactive'}" style="padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                            ${client.is_active ? 'Active' : 'Disabled'}
                        </span>
                    </td>
                    <td style="padding: 16px 24px; text-align: right; color: var(--text-muted);">${createdDate}</td>
                </tr>
            `;
        }).join('');

        // Attach listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openClientModal(btn.dataset.id));
        });
    }

    // --- Search & Filter Listeners ---
    const searchInput = document.getElementById('client-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            applyFiltersAndRender();
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFiltersAndRender();
        });
    });

    // --- Modal Logic ---
    function addUriInput(value = '') {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <input type="text" class="redirect-uri-field" value="${escapeHTML(value)}" placeholder="https://app.example.com/callback" style="flex: 1; background: rgba(0,0,0,0.2); border: 1px solid var(--border); color: white; padding: 12px; border-radius: 8px;">
            <button type="button" class="remove-uri-btn" style="background: transparent; border: none; color: #f87171; cursor: pointer; padding: 0 10px;">✕</button>
        `;
        urisContainer.appendChild(div);
        
        div.querySelector('.remove-uri-btn').addEventListener('click', () => div.remove());
    }

    addUriBtn.addEventListener('click', () => addUriInput());

    function openClientModal(clientId = null) {
        clientForm.reset();
        idInput.value = '';
        credsSection.style.display = 'none';
        urisContainer.innerHTML = '';
        
        // Default scopes
        document.querySelectorAll('input[name="scopes"]').forEach(cb => {
            cb.checked = ['openid', 'profile', 'email'].includes(cb.value);
        });
        
        if (clientId) {
            const client = clients.find(c => c.id === clientId);
            if (!client) return;
            modalTitle.textContent = 'Edit OAuth Client';
            document.getElementById('save-modal-btn').textContent = 'Update client';
            
            idInput.value = client.id;
            appNameInput.value = client.app_name;
            descriptionInput.value = client.description || '';
            pkceInput.checked = client.require_pkce;
            
            // Scopes
            const clientScopes = client.allowed_scopes || [];
            document.querySelectorAll('input[name="scopes"]').forEach(cb => {
                cb.checked = clientScopes.includes(cb.value);
            });
            
            // Redirect URIs
            let uris = [];
            try { uris = JSON.parse(client.redirect_uris); } catch(e) { uris = Array.isArray(client.redirect_uris) ? client.redirect_uris : [client.redirect_uris]; }
            if (uris.length === 0) addUriInput();
            else uris.forEach(u => addUriInput(u));
            
            displayClientId.textContent = client.client_id;
            displayClientSecret.textContent = client.client_secret;
            credsSection.style.display = 'block';
            
        } else {
            modalTitle.textContent = 'Create OAuth Client';
            document.getElementById('save-modal-btn').textContent = 'Create client';
            addUriInput(); // Start with one empty URI field
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
        
        const uris = Array.from(document.querySelectorAll('.redirect-uri-field'))
            .map(input => input.value.trim())
            .filter(v => v);
            
        const scopes = Array.from(document.querySelectorAll('input[name="scopes"]:checked'))
            .map(cb => cb.value);
        
        const payload = {
            app_name: appNameInput.value,
            description: descriptionInput.value,
            require_pkce: pkceInput.checked,
            redirect_uris: uris,
            allowed_scopes: scopes
        };

        try {
            const saveBtn = document.getElementById('save-modal-btn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Processing...';
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
                showToast(`Client successfully ${isEdit ? 'updated' : 'created'}`, 'success');
                
                if (!isEdit) {
                    // Show credentials for new client
                    modalTitle.textContent = 'Client Created Successfully!';
                    idInput.value = newClient.id;
                    displayClientId.textContent = newClient.client_id;
                    displayClientSecret.textContent = newClient.client_secret;
                    credsSection.style.display = 'block';
                    
                    saveBtn.textContent = "Done";
                    saveBtn.onclick = () => {
                        closeClientModal();
                        saveBtn.onclick = null;
                        saveBtn.textContent = 'Create client';
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
            saveBtn.textContent = isEdit ? 'Update client' : 'Create client';
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
