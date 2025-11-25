// client/js/dashboard.js
// Dashboard client-side script
// - Mục đích: kiểm tra token, hiển thị user info, dark mode, user menu/logout, sidebar navigation.


// =======================
// I. HÀM TIỆN ÍCH CHUNG
// =======================

/**
 * Giải mã payload từ JWT (chỉ giải mã phần payload, không verify)
 * @param {string|null} token - JWT token
 * @returns {Object|null} payload JSON hoặc null nếu lỗi
 */
function parseJwt(token) {
    try {
        if (!token) return null;
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Lỗi giải mã JWT:", e);
        return null;
    }
}

/**
 * An toàn: lấy element theo id và log nếu không tìm thấy.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function getEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`getEl: Không tìm thấy phần tử có id="${id}"`);
    return el;
}

// =======================
// II. KHỞI TẠO & LẤY ELEMENTS
// =======================
document.addEventListener('DOMContentLoaded', () => {
    // BODY & THEME
    const body = document.body;
    const darkModeToggle = getEl('darkModeToggle');

    // USER MENU
    const userIcon = getEl('userIcon');
    const userMenuPopup = getEl('userMenuPopup');
    const logoutButton = getEl('logoutButton');
    const displayEmail = getEl('displayEmail');
    const displayUsername = getEl('displayUsername');

    // SIDEBAR & CONTENT
    const navItems = document.querySelectorAll('.sidebar-item');
    const contentTitle = document.querySelector('.main h2');
    const filesListBody = document.querySelector('.files-table tbody');

    // Lấy token từ localStorage và payload user
    const token = localStorage.getItem('token');
    const userPayload = parseJwt(token);

    // =======================
    // III. LOGIC BẢO MẬT (Token check)
    // - Nếu không có token hoặc payload không hợp lệ -> chuyển về index.html
    // =======================
    if (!token || !userPayload) {
        // Ghi log nguyên nhân để debug (nếu cần)
        console.warn('Auth check failed: token missing or invalid payload. Redirecting to login.');
        window.location.href = 'index.html';
        return; // dừng khởi tạo tiếp
    }

    // =======================
    // IV. THEME / DARK MODE
    // - Lưu theme vào localStorage
    // - applyTheme có thể tái sử dụng khi load hoặc đổi
    // =======================
    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.textContent = '🌙';
        } else {
            body.classList.remove('dark-mode');
            if (darkModeToggle) darkModeToggle.textContent = '☀️';
        }
        localStorage.setItem('theme', theme);
    }

    // Load theme đã lưu (mặc định 'light')
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Bật/tắt theme khi click
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
            applyTheme(currentTheme === 'light' ? 'dark' : 'light');
        });
    }

    // =======================
    // V. USER INFO, MENU & LOGOUT
    // - Hiển thị email/username từ payload
    // - Toggle popup, đóng khi click ngoài, logout
    // =======================
    // Hiển thị thông tin user (nếu phần tử tồn tại)
    if (userPayload) {
        if (displayEmail) displayEmail.textContent = userPayload.email || 'Email không có trong Token';
        if (displayUsername) displayUsername.textContent = userPayload.username || `ID: ${userPayload.id || 'Không rõ'}`;
    }

    // Toggle hiển thị popup menu khi click vào user icon
    if (userIcon && userMenuPopup) {
        userIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // tránh sự kiện bubble đóng popup ngay
            userMenuPopup.classList.toggle('visible');
        });
    }

    // Logout: xóa token và redirect về login
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }

    // Đóng popup khi click ở ngoài
    document.addEventListener('click', (e) => {
        if (!userMenuPopup) return;
        const isVisible = userMenuPopup.classList.contains('visible');
        const clickedInsidePopup = userMenuPopup.contains(e.target);
        const clickedOnIcon = e.target === userIcon || (userIcon && userIcon.contains && userIcon.contains(e.target));
        if (isVisible && !clickedInsidePopup && !clickedOnIcon) {
            userMenuPopup.classList.remove('visible');
        }
    });

    // =======================
    // VI. SIDEBAR NAVIGATION & CONTENT LOADING
    // - loadContent(type) chịu trách nhiệm render placeholder (và sẽ được mở rộng để fetch API sau)
    // - SEO: cập nhật title (nếu cần) hoặc heading
    // =======================
    /**
     * Tải nội dung cho page type (ví dụ: 'dashboard', 'myfiles', ...)
     * Hiện tại: hiển thị placeholder trong bảng files
     * Sau này: thay innerHTML bằng fetch + render dynamic
     * @param {string} type
     */
    function loadContent(type) {
        // 1) Reset active state của sidebar
        navItems.forEach(nav => nav.classList.remove('active'));

        // 2) Gán active cho item tương ứng (nếu có)
        const activeItem = document.querySelector(`.sidebar-item[data-page="${type}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            if (contentTitle) contentTitle.textContent = activeItem.textContent.trim();
        } else {
            if (contentTitle) contentTitle.textContent = type.toUpperCase();
        }

        // 3) Hiển thị placeholder đang tải
        if (filesListBody) {
            filesListBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center;">
                        Đang tải dữ liệu cho mục: ${String(type).toUpperCase()}...
                    </td>
                </tr>
            `;
        }
    }

    // Gắn event listener cho các item sidebar
    if (navItems && navItems.length) {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const type = item.dataset.page || 'dashboard';
                loadContent(type);
            });
        });
    }

    // Load mặc định khi mở trang (dashboard)
    loadContent('dashboard');


});
