// API Config
const API_URL = window.location.origin + '/api';

// Global variables
let currentView = 'myfiles';
let currentSubView = null;
let currentEditingFileId = null;
let allFiles = []; // Store all files for search

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

    // Load storage info
    loadStorageInfo();

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

// Load storage info
async function loadStorageInfo() {
    try {
        const response = await fetch(`${API_URL}/auth/storage`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            updateStorageDisplay(data.storage);
        }

    } catch (error) {
        console.error('Load storage error:', error);
        document.getElementById('storageText').textContent = 'Không thể tải';
    }
}

// Update storage display
function updateStorageDisplay(storage) {
    const storageBarFill = document.getElementById('storageBarFill');
    const storageText = document.getElementById('storageText');

    const percentage = storage.percentage;
    
    // Update bar width
    storageBarFill.style.width = `${percentage}%`;
    
    // Update bar color based on usage
    storageBarFill.classList.remove('warning', 'danger');
    if (percentage >= 90) {
        storageBarFill.classList.add('danger');
    } else if (percentage >= 75) {
        storageBarFill.classList.add('warning');
    }

    // Update text
    storageText.textContent = `${storage.usedGB} GB / ${storage.limitGB} GB (${percentage}%)`;
    
    // Show percentage in bar if enough space
    if (percentage > 15) {
        storageBarFill.textContent = `${percentage}%`;
    } else {
        storageBarFill.textContent = '';
    }
}

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
            allFiles = data.files; // Store for search
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
function displayFiles(files, view, searchTerm = '') {
    const filesTableBody = document.getElementById('filesTableBody');
    const userId = localStorage.getItem('userId');

    if (!files || files.length === 0) {
        const message = searchTerm 
            ? `🔍 Không tìm thấy kết quả cho "${searchTerm}"` 
            : '📁 No files found';
        
        filesTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="no-results-row">
                    ${message}
                </td>
            </tr>
        `;
        return;
    }

    // Check if file is editable
    function isTextFile(file) {
        const textMimeTypes = [
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'application/json',
            'application/xml',
            'text/xml',
            'text/csv',
            'text/markdown'
        ];
        
        return textMimeTypes.includes(file.mimeType) || 
               file.originalName.match(/\.(txt|js|json|html|css|md|xml|csv|log)$/i);
    }

    // Check if file is Office format or PDF
    function isOfficeFile(file) {
        const officeMimeTypes = [
            'application/pdf', // PDF
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'application/vnd.ms-powerpoint' // .ppt
        ];
        
        return officeMimeTypes.includes(file.mimeType) ||
               file.originalName.match(/\.(pdf|docx?|xlsx?|pptx?)$/i);
    }

    filesTableBody.innerHTML = files.map(file => {
        const isOwner = file.owner._id === userId || file.owner === userId;
        const canEdit = isTextFile(file);
        const isOffice = isOfficeFile(file);
        let actions = '';

        if (view === 'myfiles') {
            actions = `
                <button class="action-btn download-btn" onclick="downloadFile('${file._id}', '${file.originalName}')">
                    ⬇️ Download
                </button>
                ${canEdit ? `
                    <button class="action-btn edit-btn" onclick="editFile('${file._id}')">
                        ✏️ Edit
                    </button>
                ` : ''}
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
                ${canEdit ? `
                    <button class="action-btn view-btn" onclick="viewFile('${file._id}')">
                        👁️ View
                    </button>
                ` : ''}
                <button class="action-btn download-btn" onclick="downloadFile('${file._id}', '${file.originalName}')">
                    ⬇️ Download
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

        // Get file icon based on type
        let fileIcon = '📄';
        if (file.mimeType.startsWith('image/')) fileIcon = '🖼️';
        else if (file.mimeType.startsWith('video/')) fileIcon = '🎥';
        else if (file.mimeType.startsWith('audio/')) fileIcon = '🎵';
        else if (file.mimeType.includes('pdf')) fileIcon = '📕';
        else if (file.mimeType.includes('word')) fileIcon = '📘';
        else if (file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet')) fileIcon = '📊';
        else if (file.mimeType.includes('zip') || file.mimeType.includes('rar')) fileIcon = '📦';

        return `
            <tr ondblclick="handleFileDoubleClick('${file._id}', '${file.originalName.replace(/'/g, "\\'")}', ${canEdit}, ${isOffice})" 
                style="cursor: pointer;"
                title="Double-click để ${canEdit ? 'chỉnh sửa' : isOffice ? 'xem' : 'tải về'} file">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span>${fileIcon}</span>
                        <span>${searchTerm ? highlightText(file.originalName, searchTerm) : file.originalName}</span>
                        ${!canEdit && !isOffice ? '<span style="font-size: 11px; color: #999;">(Binary)</span>' : ''}
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

// Handle file double-click
function handleFileDoubleClick(fileId, fileName, isTextFile, isOfficeFile) {
    console.log('Double-click:', fileName, 'Text:', isTextFile, 'Office:', isOfficeFile);
    
    if (isTextFile) {
        // Text file - Open in modal editor
        editFile(fileId);
    } else if (isOfficeFile) {
        // Office file - Open in viewer
        openOfficeFile(fileId, fileName);
    } else {
        // Binary file - Just download
        const confirmDownload = confirm(`📄 "${fileName}" không thể xem trực tiếp.\n\nBạn có muốn tải về không?`);
        if (confirmDownload) {
            downloadFile(fileId, fileName);
        }
    }
}

// Search files
function searchFiles() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (!searchTerm) {
        // No search term, show all files
        displayFiles(allFiles, currentView);
        return;
    }

    // Filter files by multiple criteria
    const filteredFiles = allFiles.filter(file => {
        const nameMatch = file.originalName.toLowerCase().includes(searchTerm);
        const ownerMatch = file.owner?.username?.toLowerCase().includes(searchTerm);
        const dateMatch = formatDate(file.uploadedAt).toLowerCase().includes(searchTerm);
        
        return nameMatch || ownerMatch || dateMatch;
    });

    // Display filtered results with highlight
    displayFiles(filteredFiles, currentView, searchTerm);

    // Log search for analytics (optional)
    console.log(`🔍 Search: "${searchTerm}" - Found: ${filteredFiles.length} files`);
}

// Helper function to highlight search term
function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    displayFiles(allFiles, currentView);
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
            
            // Update storage display
            if (data.storageInfo) {
                updateStorageDisplay(data.storageInfo);
            }
            
            loadContent('myfiles');
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Upload failed: ' + error.message);
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = '📤 Upload';
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
            // Check file type
            if (data.fileType === 'office') {
                // Office file - Open in Office Online
                openOfficeFile(fileId, data.file.originalName);
            } else if (data.fileType === 'text' && data.file.canEdit) {
                // Text file - Open in modal
                currentEditingFileId = fileId;
                document.getElementById('fileContentEditor').value = data.file.content;
                document.getElementById('editModal').classList.add('active');
            } else {
                alert('❌ This file type cannot be edited.');
            }
        } else {
            alert('❌ ' + (data.message || 'Cannot edit this file.'));
        }

    } catch (error) {
        console.error('Edit file error:', error);
        alert('❌ Cannot edit file: ' + error.message);
    }
}

// Open Office file in viewer
async function openOfficeFile(fileId, fileName) {
    try {
        console.log('Opening Office file:', fileName);

        // Get public link
        const response = await fetch(`${API_URL}/files/public-link/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        // Extract the file URL from Office viewer URL
        const fileUrl = decodeURIComponent(data.viewerUrl.split('src=')[1]);
        
        // Use Google Docs Viewer (works with localhost via ngrok or public URL)
        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        
        // Open in new window with larger size
        const width = 1200;
        const height = 800;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        window.open(
            viewerUrl, 
            'FileViewer',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
        
        console.log('✅ File opened in viewer');

    } catch (error) {
        console.error('Open Office file error:', error);
        alert('❌ Không thể mở file: ' + error.message + '\n\nĐể xem file Office, bạn cần:\n1. Sử dụng ngrok để tạo public URL\n2. Hoặc deploy lên server public');
    }
}

// View file (Shared only - read-only)
async function viewFile(fileId) {
    try {
        const response = await fetch(`${API_URL}/files/view/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success && data.file.canEdit) {
            // Show content in a modal or alert
            const modal = document.getElementById('editModal');
            document.getElementById('fileContentEditor').value = data.file.content;
            document.getElementById('fileContentEditor').disabled = true; // Read-only
            modal.classList.add('active');
            
            // Hide save button, show close button
            const saveBtn = modal.querySelector('.btn-primary');
            if (saveBtn) saveBtn.style.display = 'none';
        } else {
            alert('❌ ' + (data.message || 'This file cannot be viewed as text.'));
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
    const modal = document.getElementById('editModal');
    const editor = document.getElementById('fileContentEditor');
    const saveBtn = modal.querySelector('.btn-primary');
    
    modal.classList.remove('active');
    editor.disabled = false; // Reset to editable
    if (saveBtn) saveBtn.style.display = 'block'; // Show save button again
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