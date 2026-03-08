function handleSignInClick() {
    const zip = prompt('Please enter your ZIP code to continue:');
    if (zip === '10001') {
        document.getElementById('login-modal').style.display = 'flex';
    } else if (zip !== null) {
        alert('We are currently only supporting demo data for ZIP code 10001. Try that instead!');
    }
}

function handleSearch(event) {
    event.preventDefault();
    const zip = document.getElementById('location').value;
    if (zip === '10001') {
        document.getElementById('login-modal').style.display = 'flex';
    } else {
        alert('We are currently only supporting demo data for ZIP code 10001. Try that instead!');
    }
}

async function authLogin(email, password) {
    const response = await fetch('https://pingu-help-workers-api.pinguverse.workers.dev/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: email, password })
    });
    return response.json();
}

async function authRegister(email, password, fullName) {
    const response = await fetch('https://pingu-help-workers-api.pinguverse.workers.dev/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: email, email, password, fullName })
    });
    return response.json();
}

async function handleStep1() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Attempt to login first
        let loginResult = await authLogin(email, password);

        if (loginResult.success) {
            // Login successful, redirect to chat
            console.log('Authentication successful. Token:', loginResult.token);
            localStorage.setItem('pinguToken', loginResult.token);
            localStorage.setItem('pinguUsername', email);
            alert('Login successful!');
            window.location.href = 'app.html';
        } else {
            // Login failed, move to step 2 to get full name for registration
            showStep2();
        }
    } catch (err) {
        console.error('An error occurred during authentication:', err);
        alert('A network error occurred connecting to the auth service. Please check your connection.');
    }
}

async function handleStep2() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('full-name').value;

    try {
        // Attempt to register the user with full name
        const registerResult = await authRegister(email, password, fullName);

        if (registerResult.success) {
            // Registration successful, attempt login to get token
            const loginResult = await authLogin(email, password);

            if (loginResult.success) {
                console.log('Authentication successful. Token:', loginResult.token);
                localStorage.setItem('pinguToken', loginResult.token);
                localStorage.setItem('pinguUsername', email);
                alert('Account created and login successful!');
                window.location.href = 'app.html';
            } else {
                alert('Login failed after registration: ' + (loginResult.error || 'Unknown error'));
            }
        } else {
            alert('Registration failed: ' + (registerResult.error || registerResult.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('An error occurred during registration:', err);
        alert('A network error occurred connecting to the auth service. Please check your connection.');
    }
}

function showStep2() {
    // Hide step 1, show step 2
    document.getElementById('step1-form').style.display = 'none';
    document.getElementById('step2-form').style.display = 'block';
    // Update step indicators
    document.getElementById('step1-indicator').classList.remove('active');
    document.getElementById('step2-indicator').classList.add('active');
}

function goBackToStep1() {
    // Hide step 2, show step 1
    document.getElementById('step2-form').style.display = 'none';
    document.getElementById('step1-form').style.display = 'block';
    // Update step indicators
    document.getElementById('step2-indicator').classList.remove('active');
    document.getElementById('step1-indicator').classList.add('active');
}

function closeModal() {
    document.getElementById('login-modal').style.display = 'none';
}

// Decode JWT token to extract user information
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT token:', error);
        return null;
    }
}

// Update navigation based on login status
document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('pinguToken');
    const authSection = document.getElementById('auth-section');

    if (token) {
        const userData = decodeJwt(token);
        if (userData && userData.username) {
            authSection.innerHTML = `
                <span class="username-display">${userData.username}</span>
                <button class="btn btn-primary" onclick="handleSignOut()">Sign Out</button>
            `;
        }
    }
});

// Handle sign out
function handleSignOut() {
    localStorage.removeItem('pinguToken');
    localStorage.removeItem('pinguUsername');
    alert('Signed out successfully');
    window.location.reload();
}

// Close the modal if user clicks outside of it
window.onclick = function (event) {
    const modal = document.getElementById('login-modal');
    if (event.target === modal) {
        closeModal();
    }
}