function handleSearch(event) {
    event.preventDefault();
    const zip = document.getElementById('location').value;
    if (zip === '10001') {
        document.getElementById('login-modal').style.display = 'flex';
    } else {
        alert('We are currently only supporting demo data for ZIP code 10001. Try that instead!');
    }
}

async function authLogin(username, password) {
    const response = await fetch('https://pingu-help-workers-api.pinguverse.workers.dev/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });
    return response.json();
}

async function authRegister(username, password) {
    const response = await fetch('https://pingu-help-workers-api.pinguverse.workers.dev/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });
    return response.json();
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Attempt to login first
        let loginResult = await authLogin(email, password);

        if (!loginResult.success) {
            // If login fails, seamlessly attempt to register the user
            const registerResult = await authRegister(email, password);

            if (registerResult.success) {
                // If registration works, attempt login again to get the token
                loginResult = await authLogin(email, password);

                if (!loginResult.success) {
                    alert('Login failed after registration: ' + (loginResult.error || 'Unknown error'));
                    return;
                }
            } else {
                alert('Registration failed: ' + (registerResult.error || registerResult.message || 'Unknown error'));
                return;
            }
        }

        // Login is successful here
        console.log('Authentication successful. Token:', loginResult.token);
        alert('Login successful!');
        closeModal();
    } catch (err) {
        console.error('An error occurred during authentication:', err);
        alert('A network error occurred connecting to the auth service. Please check your connection.');
    }
}

function closeModal() {
    document.getElementById('login-modal').style.display = 'none';
}

// Close the modal if user clicks outside of it
window.onclick = function (event) {
    const modal = document.getElementById('login-modal');
    if (event.target === modal) {
        closeModal();
    }
}