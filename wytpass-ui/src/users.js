const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const tableBody = document.getElementById('users-table-body');
    const userModal = document.getElementById('user-modal');
    const deleteModal = document.getElementById('delete-modal');
    const userForm = document.getElementById('user-form');
    
    // UI Elements for modals
    const modalTitle = document.getElementById('modal-title');
    const pwdHint = document.getElementById('pwd-hint');
    const idInput = document.getElementById('user-id');
    const emailInput = document.getElementById('user-email-input');
    const nameInput = document.getElementById('user-name-input');
    const pwdInput = document.getElementById('user-password-input');
    const activeInput = document.getElementById('user-active-input');
    
    let currentUserIdToDelete = null;

    // --- State ---
    let users = [];
    let currentFilter = 'all';
    let searchQuery = '';

    // --- Core Functions ---
    async function fetchUsers() {
        try {
            const res = await fetch(`${API_BASE}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                users = await res.json();
                applyFiltersAndRender();
            } else if (res.status === 401) {
                window.location.href = '/';
            } else {
                showToast('Failed to load users', 'error');
            }
        } catch (e) {
            showToast('Connection error', 'error');
        }
    }

    function applyFiltersAndRender() {
        let filtered = users.filter(user => {
            const matchesSearch = !searchQuery || 
                user.email.toLowerCase().includes(searchQuery) || 
                (user.full_name || '').toLowerCase().includes(searchQuery);
            
            if (currentFilter === 'active') return matchesSearch && user.is_active;
            if (currentFilter === 'suspended') return matchesSearch && !user.is_active;
            if (currentFilter === 'unverified') return matchesSearch && !user.email_verified;
            return matchesSearch;
        });

        renderTable(filtered);
        document.getElementById('user-count-label').textContent = `Showing ${filtered.length} users`;
    }

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 100px;">No users found matching your criteria</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(user => {
            const initials = (user.full_name || user.email).substring(0, 2).toUpperCase();
            const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
            
            // Mock provider/sessions for visual parity with screenshot
            const provider = user.email.includes('google') ? 'google' : 'password';
            const sessions = Math.floor(Math.random() * 50); // In real app, fetch from backend
            
            const rolesHtml = (user.roles || []).map(role => 
                `<span class="role-badge ${role === 'super_admin' ? 'super' : ''}" style="margin-right: 4px;">${role.replace('_', ' ')}</span>`
            ).join('') || '<span style="color:var(--text-muted)">—</span>';

            return `
                <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 16px 24px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="user-avatar">${initials}</div>
                            <div>
                                <div style="font-weight: 600; color: white;">${escapeHTML(user.full_name || 'Anonymous')}</div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">ID: ${user.id.substring(0,8)}...</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 16px 24px; color: var(--text-muted);">${escapeHTML(user.email)}</td>
                    <td style="padding: 16px 24px;">
                        <span class="badge ${user.is_active ? 'active' : 'inactive'}">
                            ${user.is_active ? 'Active' : 'Suspended'}
                        </span>
                    </td>
                    <td style="padding: 16px 24px;">${rolesHtml}</td>
                    <td style="padding: 16px 24px; text-transform: capitalize; color: var(--text-muted);">${provider}</td>
                    <td style="padding: 16px 24px; text-align: center; font-weight: 600;">${sessions}</td>
                    <td style="padding: 16px 24px; text-align: center; font-weight: 600; color: var(--primary);">${user.connected_apps || 0}</td>
                    <td style="padding: 16px 24px; text-align: right; color: var(--text-muted);">${createdDate}</td>
                </tr>
            `;
        }).join('');
    }

    // --- Search & Filter Listeners ---
    document.getElementById('user-search').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        applyFiltersAndRender();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFiltersAndRender();
        });
    });

    // --- Modal Logic ---
    function openUserModal(userId = null) {
        userForm.reset();
        idInput.value = '';
        
        if (userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            modalTitle.textContent = 'Edit User';
            pwdHint.textContent = '(leave blank to keep unchanged)';
            pwdInput.required = false;
            
            idInput.value = user.id;
            emailInput.value = user.email;
            nameInput.value = user.full_name || '';
            activeInput.checked = user.is_active;
            
            emailInput.disabled = true; // Typically don't allow changing email easily
        } else {
            modalTitle.textContent = 'Add User';
            pwdHint.textContent = '(required)';
            pwdInput.required = true;
            emailInput.disabled = false;
        }
        
        userModal.classList.add('active');
    }

    function closeUserModal() {
        userModal.classList.remove('active');
    }

    function openDeleteModal(userId, email) {
        currentUserIdToDelete = userId;
        document.getElementById('delete-user-email').textContent = email;
        deleteModal.classList.add('active');
    }

    function closeDeleteModal() {
        deleteModal.classList.remove('active');
        currentUserIdToDelete = null;
    }

    // --- Event Listeners ---
    document.getElementById('add-user-btn').addEventListener('click', () => openUserModal());
    document.getElementById('cancel-modal-btn').addEventListener('click', closeUserModal);
    document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);

    // Save User (Create or Update)
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isEdit = !!idInput.value;
        const url = isEdit ? `${API_BASE}/api/users/${idInput.value}` : `${API_BASE}/api/users`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const payload = {
            email: emailInput.value,
            full_name: nameInput.value,
            is_active: activeInput.checked
        };
        
        if (pwdInput.value) {
            payload.password = pwdInput.value;
        }

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
                showToast(`User successfully ${isEdit ? 'updated' : 'created'}`, 'success');
                closeUserModal();
                fetchUsers();
            } else {
                const data = await res.json();
                showToast(data.detail || 'Operation failed', 'error');
            }
            
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        } catch (err) {
            showToast('Connection error', 'error');
        }
    });

    // Delete User
    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        if (!currentUserIdToDelete) return;
        
        try {
            const btn = document.getElementById('confirm-delete-btn');
            btn.textContent = 'Deleting...';
            btn.disabled = true;

            const res = await fetch(`${API_BASE}/api/users/${currentUserIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showToast('User deleted successfully', 'success');
                closeDeleteModal();
                fetchUsers();
            } else {
                showToast('Failed to delete user', 'error');
            }
            
            btn.textContent = 'Delete';
            btn.disabled = false;
        } catch (err) {
            showToast('Connection error', 'error');
        }
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

    // Logout User
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
    });

    // Init
    fetchUsers();
});
