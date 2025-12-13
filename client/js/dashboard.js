// API Config
const API_URL = 'http://localhost:5500/api';

// Global variables
let currentView = 'myfiles';
let currentSubView = null;
let currentEditingFileId = null;

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const userIcon = document.getElementById('userIcon');
    const userMenuPopup = document.getElementById('userMenuPopup');
    const logoutButton = document.getElementById('logoutButton');
    const displayEmail = document.getElementById('displayEmail');
    const displayUsername = document.getElementById('displayUsername');
    const uploadButton = document.getElementById('uploadButton');
    const fileInput = document.getElementById('fileInput');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const filesTableBody = document.getElementById('filesTableBody');
    const contentTitle = document.getElementById('contentTitle');
    const sharedTabs = document.getElementById('sharedTabs');

    // Display user info
    displayEmail.textContent = localStorage.getItem('email') || 'No email';
    displayUsername.textContent = localStorage.getItem('username') || 'User';

    // Dark mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '🌙';
    }

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        darkModeToggle.textContent = isDark ? '🌙' : '☀️';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // User menu
    userIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenuPopup.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
        if (!userMenuPopup.contains(e.target) && e.target !== userIcon) {
            userMenuPopup.classList.remove('visible');
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Upload
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', uploadFile);

    // Sidebar navigation
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.page;
            
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            if (view === 'shared') {
                sharedTabs.style.display = 'flex';
                loadContent('shared', 'by-you');
            } else {
                sharedTabs.style.display = 'none';
                loadContent(view);
            }
        });
    });

    // Shared tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const subView = btn.dataset.tab;
            loadContent('shared', subView);
        });
    });

    // Initial load
    loadContent('myfiles');
});

// Load content
async function loadContent(view, subView = null) {
    currentView = view;
    currentSubView = subView;

    const contentTitle = document.getElementById('contentTitle');
    const filesTableBody = document.getElementById('filesTableBody');

    // Update title
    if (view === 'myfiles') {
        contentTitle.textContent = 'My Files';
    } else if (view === 'shared') {
        contentTitle.textContent = subView === 'by-you' ? 'Shared by You' : 'Shared to You';
    } else if (view === 'bin') {
        contentTitle.textContent = 'Bin';
    }

    // Show loading
    filesTableBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 40px;">
                ⏳ Loading...
            </td>
        </tr>
    `;

    // Fetch files
    try {
        let endpoint = '';
        if (view === 'myfiles') {
            endpoint = '/files/myfiles';
        } else if (view === 'shared') {
            endpoint = subView === 'by-you' ? '/files/shared-by-you' : '/files/shared-to-you';
        } else if (view === 'bin') {
            endpoint = '/files/bin';
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            displayFiles(data.files, view);
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Load content error:', error);
        filesTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: red;">
                    ❌ Error: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Display files
function displayFiles(files, view) {
    const filesTableBody = document.getElementById('filesTableBody');
    const userId = localStorage.getItem('userId');

    if (!files || files.length === 0) {
        filesTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px;">
                    📁 No files found
                </td>
            </tr>
        `;
        return;
    }

    filesTableBody.innerHTML = files.map(file => {
        const isOwner = file.owner._id === userId || file.owner === userId;
        let actions = '';

        if (view === 'myfiles') {
            actions = `
                <button class="action-btn download-btn" onclick="downloadFile('${file._id}', '${file.originalName}')">
                    ⬇️ Download
                </button>
                <button class="action-btn edit-btn" onclick="editFile('${file._id}')">
                    ✏️ Edit
                </button>
                ${isOwner ? `
                    <button class="action-btn share-btn" onclick="shareFile('${file._id}')">
                        🔗 Share
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteFile('${file._id}', '${file.originalName}')">
                        🗑️ Delete
                    </button>
                ` : ''}
            `;
        } else if (view === 'shared') {
            actions = `
                <button class="action-btn view-btn" onclick="viewFile('${file._id}')">
                    👁️ View
                </button>
            `;
        } else if (view === 'bin') {
            actions = `
                <button class="action-btn restore-btn" onclick="restoreFile('${file._id}')">
                    ♻️ Restore
                </button>
                <button class="action-btn delete-permanent-btn" onclick="deletePermanently('${file._id}', '${file.originalName}')">
                    ❌ Delete Forever
                </button>
            `;
        }

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span>📄</span>
                        <span>${file.originalName}</span>
                    </div>
                </td>
                <td>${formatDate(file.uploadedAt)}</td>
                <td>${file.owner?.username || 'Unknown'}</td>
                <td>
                    <div class="file-actions">
                        ${actions}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Upload file
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file!');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        uploadButton.disabled = true;
        uploadButton.textContent = '⏳ Uploading...';

        const response = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ File uploaded successfully!');
            fileInput.value = '';
            loadContent('myfiles');
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Upload failed: ' + error.message);
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload';
    }
}

// Download file
async function downloadFile(fileId, fileName) {
    try {
        const response = await fetch(`${API_URL}/files/download/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('✅ Downloaded:', fileName);

    } catch (error) {
        console.error('Download error:', error);
        alert('❌ Download failed: ' + error.message);
    }
}

// Edit file (My Files only)
async function editFile(fileId) {
    try {
        const response = await fetch(`${API_URL}/files/view/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            currentEditingFileId = fileId;
            document.getElementById('fileContentEditor').value = data.file.content;
            document.getElementById('editModal').classList.add('active');
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Edit file error:', error);
        alert('❌ Cannot edit file: ' + error.message);
    }
}

// View file (Shared only - read-only)
async function viewFile(fileId) {
    try {
        const response = await fetch(`${API_URL}/files/view/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            alert('File Content (Read-only):\n\n' + data.file.content);
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('View file error:', error);
        alert('❌ Cannot view file: ' + error.message);
    }
}

// Save edited file
async function saveEditedFile() {
    if (!currentEditingFileId) return;

    const content = document.getElementById('fileContentEditor').value;

    try {
        const response = await fetch(`${API_URL}/files/save/${currentEditingFileId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ File saved successfully!');
            closeEditModal();
            loadContent(currentView, currentSubView);
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Save file error:', error);
        alert('❌ Save failed: ' + error.message);
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditingFileId = null;
}

// Delete file (move to bin)
async function deleteFile(fileId, fileName) {
    if (!confirm(`Move "${fileName}" to Bin?`)) return;

    try {
        const response = await fetch(`${API_URL}/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Moved to Bin!');
            loadContent(currentView, currentSubView);
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Delete error:', error);
        alert('❌ Delete failed: ' + error.message);
    }
}

// Restore file from bin
async function restoreFile(fileId) {
    try {
        const response = await fetch(`${API_URL}/files/restore/${fileId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ File restored!');
            loadContent('bin');
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Restore error:', error);
        alert('❌ Restore failed: ' + error.message);
    }
}

// Delete permanently
async function deletePermanently(fileId, fileName) {
    if (!confirm(`DELETE FOREVER "${fileName}"?\n\nThis action CANNOT be undone!`)) return;

    try {
        const response = await fetch(`${API_URL}/files/permanent/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Deleted permanently!');
            loadContent('bin');
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Permanent delete error:', error);
        alert('❌ Delete failed: ' + error.message);
    }
}

// Share file
async function shareFile(fileId) {
    const email = prompt('Enter email to share with:');
    if (!email) return;

    try {
        const response = await fetch(`${API_URL}/files/share/${fileId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userEmail: email })
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ File shared with ${email}!`);
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Share error:', error);
        alert('❌ Share failed: ' + error.message);
    }
}