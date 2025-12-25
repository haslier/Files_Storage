// ✅ API Config - Auto-detect production or local
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5500/api'
    : 'https://files-storage-c4s8.onrender.com/api';

console.log('🌐 Environment:', window.location.hostname);
console.log('🔗 API URL:', API_URL);

// Password validation rules
const passwordRules = {
    length: { regex: /.{8,}/, id: 'req-length' },
    uppercase: { regex: /[A-Z]/, id: 'req-uppercase' },
    lowercase: { regex: /[a-z]/, id: 'req-lowercase' },
    number: { regex: /[0-9]/, id: 'req-number' },
    special: { regex: /[!@#$%^&*(),.?":{}|<>]/, id: 'req-special' }
};

// Check password strength in real-time
function checkPasswordStrength() {
    const password = document.getElementById('regPassword').value;
    const registerBtn = document.getElementById('registerBtn');
    let allValid = true;

    // Check each rule
    for (const [key, rule] of Object.entries(passwordRules)) {
        const element = document.getElementById(rule.id);
        const isValid = rule.regex.test(password);
        
        if (isValid) {
            element.classList.add('valid');
            element.classList.remove('invalid');
            element.querySelector('.checkbox').textContent = '☑';
        } else {
            element.classList.remove('valid');
            element.classList.add('invalid');
            element.querySelector('.checkbox').textContent = '☐';
            allValid = false;
        }
    }

    // Enable/disable register button
    registerBtn.disabled = !allValid;
}

// Show/Hide forms
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    // Reset password requirements
    const password = document.getElementById('regPassword');
    password.value = '';
    checkPasswordStrength();
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('email', data.user.email);
            
            alert('✅ Login successful!');
            window.location.href = 'dashboard.html';
        } else {
            // Handle rate limit error
            if (response.status === 429) {
                const retryAfter = data.retryAfter || 300;
                const minutes = Math.floor(retryAfter / 60);
                const seconds = retryAfter % 60;
                alert(`❌ ${data.message}\n\nPlease wait ${minutes} minutes ${seconds} seconds`);
            } else {
                alert('❌ ' + data.message);
            }
        }

    } catch (error) {
        console.error('Login error:', error);
        alert('❌ Error: ' + error.message);
    }
}

// Handle Register
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    // Final validation check
    let allValid = true;
    for (const rule of Object.values(passwordRules)) {
        if (!rule.regex.test(password)) {
            allValid = false;
            break;
        }
    }

    if (!allValid) {
        alert('❌ The password is not strong enough. Please check the requirements.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Registration successful! Please login.');
            showLogin();
            // Clear form
            document.getElementById('regUsername').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            checkPasswordStrength(); // Reset validation UI
        } else {
            alert('❌ ' + data.message);
        }

    } catch (error) {
        console.error('Register error:', error);
        alert('❌ Error: ' + error.message);
    }
}

// Check if already logged in
if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
}