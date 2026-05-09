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

    // --- Core Functions ---
    async function fetchUsers() {
        try {
            const res = await fetch(`${API_BASE}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                users = await res.json();
                renderTable();
            } else if (res.status === 401) {
                window.location.href = '/';
            } else {
                showToast('Failed to load users', 'error');
            }
        } catch (e) {
            showToast('Connection error', 'error');
        }
    }

    function renderTable() {
        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px;">No users found</td></tr>`;
            return;
        }

        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>${escapeHTML(user.email)}</td>
                <td>${escapeHTML(user.full_name || '-')}</td>
                <td>
                    <span class="badge ${user.is_active ? 'active' : 'inactive'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <span style="font-weight: 600; color: var(--primary);">${user.connected_apps || 0}</span>
                </td>
                <td style="text-align: right;">
                    <button class="action-btn edit-btn" data-id="${user.id}" title="Edit User">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button class="action-btn delete delete-btn" data-id="${user.id}" data-email="${escapeHTML(user.email)}" title="Delete User">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        // Attach listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openUserModal(btn.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => openDeleteModal(btn.dataset.id, btn.dataset.email));
        });
    }

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
