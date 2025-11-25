// client/js/main.js

// === Hằng số cho URL Backend ===
const API_BASE_URL = 'http://localhost:5000/api/auth';


// =======================================================
// HÀM KIỂM TRA ĐỘ MẠNH MẬT KHẨU
// Trả về Object trạng thái (true/false cho từng điều kiện)
// =======================================================
function getPasswordStrengthStatus(password) {
    return {
        checkLength: password.length >= 8,
        checkUpper: /[A-Z]/.test(password),
        checkLower: /[a-z]/.test(password),
        checkNumber: /[0-9]/.test(password),
        checkSpecial: /[^A-Za-z0-9]/.test(password)
    };
}


// =======================================================
// HÀM CẬP NHẬT POPUP HIỂN THỊ TRẠNG THÁI REAL-TIME
// =======================================================
function updatePasswordPopup(password) {
    const popup = document.getElementById('passwordCheckPopup');
    
    // Nếu popup không tồn tại, thoát
    if (!popup) return;

    const status = getPasswordStrengthStatus(password);
    
    // Ẩn popup nếu mật khẩu rỗng
    if (password.length === 0) {
        popup.classList.remove('visible');
        return;
    }

    // Hiển thị popup
    popup.classList.add('visible');

    // Cập nhật trạng thái từng điều kiện (valid/invalid)
    for (const key in status) {
        const liElement = document.getElementById(key); // Lấy li#checkLength, li#checkUpper, ...
        if (liElement) {
            liElement.classList.toggle('valid', status[key]);
            liElement.classList.toggle('invalid', !status[key]);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Lấy các phần tử form và input
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchLinks = document.querySelectorAll('.switch-link');
    const registerPasswordInput = document.getElementById('registerPassword');
    
    // =======================================================
    // 1. Logic chuyển đổi giữa Login và Register Form
    // =======================================================
    if (switchLinks) {
        switchLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-target');

                if (target === 'register') {
                    loginForm.classList.add('hidden');
                    registerForm.classList.remove('hidden');
                } else if (target === 'login') {
                    registerForm.classList.add('hidden');
                    loginForm.classList.remove('hidden');
                }
            });
        });
    }

    // =======================================================
    // 2. Xử lý nhập mật khẩu theo thời gian thực (Real-time check)
    // =======================================================
    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', (e) => {
            updatePasswordPopup(e.target.value);
        });
        
        // Hiện popup khi focus
        registerPasswordInput.addEventListener('focus', (e) => {
            updatePasswordPopup(e.target.value);
        });

        // Ẩn popup khi mất focus (nếu đã hợp lệ)
        registerPasswordInput.addEventListener('blur', () => {
             const status = getPasswordStrengthStatus(registerPasswordInput.value);
             const allValid = Object.values(status).every(v => v === true);
             if (allValid) {
                document.getElementById('passwordCheckPopup').classList.remove('visible');
             }
        });
    }


    // =======================================================
    // 3. Xử lý sự kiện Đăng nhập (LOG IN)
    // =======================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch(`${API_BASE_URL}/login`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    window.location.href = 'dashboard.html';
                } else {
                    alert(data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại Username và Password.');
                }
            } catch (error) {
                console.error('Lỗi kết nối:', error);
                alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra Server Node.js (port 5000).');
            }
        });
    }

    // =======================================================
    // 4. Xử lý sự kiện Đăng ký (REGISTER) - Chặn gửi nếu không hợp lệ
    // =======================================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // KIỂM TRA 1: Khớp mật khẩu
            if (password !== confirmPassword) {
                alert('Lỗi: Mật khẩu xác nhận không khớp!');
                return;
            }

            // KIỂM TRA 2: Độ mạnh mật khẩu (CHẶN TẠI FRONTEND)
            const status = getPasswordStrengthStatus(password);
            const allValid = Object.values(status).every(v => v === true);

            if (!allValid) {
                // Hiển thị popup và dừng form
                updatePasswordPopup(password); // Hiện popup để người dùng thấy lỗi
                alert("Mật khẩu không đủ mạnh. Vui lòng làm theo các điều kiện trên màn hình.");
                return; // DỪNG GỬI REQUEST
            }

            try {
                const response = await fetch(`${API_BASE_URL}/register`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Đăng ký thành công! Vui lòng Đăng nhập.'); 
                    loginForm.classList.remove('hidden');
                    registerForm.classList.add('hidden');
                } else {
                    alert(data.message || 'Đăng ký thất bại. Tên người dùng hoặc Email đã tồn tại.');
                }
            } catch (error) {
                console.error('Lỗi kết nối:', error);
                alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra Server Node.js (port 5000).');
            }
        });
    }
});