function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

// Initialize Showdown converter
const converter = new showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true
});

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

// Check for authentication token and display username
document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('pinguToken');

    if (!token) {
        alert('Please log in to access the chat');
        window.location.href = 'index.html';
        return;
    }

    console.log('Token found:', token);
    const usernameDisplay = document.getElementById('username-display');
    const userData = decodeJwt(token);
    if (usernameDisplay && userData && userData.username) {
        usernameDisplay.textContent = userData.username;
    }
});

// Function to get miako token
async function getMiakoToken() {
    const token = localStorage.getItem('pinguToken');
    if (!token) {
        throw new Error('No authentication token');
    }

    // Check if we have a cached miako token
    const cachedToken = localStorage.getItem('miakoToken');
    const tokenExpiry = localStorage.getItem('miakoTokenExpiry');

    if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        return cachedToken;
    }

    // Get new token
    const response = await fetch('https://pingu-help-workers-api.pinguverse.workers.dev/api/miako/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to get miako token: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.token) {
        throw new Error('Invalid miako token response');
    }

    // Cache the token for 15 minutes (900000 milliseconds)
    localStorage.setItem('miakoToken', data.token);
    localStorage.setItem('miakoTokenExpiry', (Date.now() + 900000).toString());

    return data.token;
}

// Contact bot API function
async function contactBot(message) {
    const pinguToken = localStorage.getItem('pinguToken');
    const miakoToken = await getMiakoToken();

    const response = await fetch('https://pingu-help-workers-api.pinguverse.workers.dev/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pinguToken}`
        },
        body: JSON.stringify({
            message: message,
            token: miakoToken
        })
    });

    if (!response.ok) {
        // If token is expired or invalid, try to get a new one
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('miakoToken');
            localStorage.removeItem('miakoTokenExpiry');
            const newMiakoToken = await getMiakoToken();
            const retryResponse = await fetch('https://pingu-help-workers-api.pinguverse.workers.dev/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pinguToken}`
                },
                body: JSON.stringify({
                    message: message,
                    token: newMiakoToken
                })
            });
            if (!retryResponse.ok) {
                throw new Error(`HTTP error! status: ${retryResponse.status}`);
            }
            const retryData = await retryResponse.json();
            return retryData.response || "I'm sorry, I didn't understand that. Could you rephrase your question?";
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || "I'm sorry, I didn't understand that. Could you rephrase your question?";
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (message === '') {
        return;
    }

    // Add user message to chat
    const chatMessages = document.getElementById('chat-messages');
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user';
    userMessageDiv.innerHTML = `
        <div class="message-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        </div>
        <div class="message-bubble">
            <div>${converter.makeHtml(escapeHtml(message))}</div>
        </div>
    `;
    chatMessages.appendChild(userMessageDiv);

    // Clear input
    input.value = '';

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Show typing indicator
    showTypingIndicator();

    // Call contactBot function
    contactBot(message)
        .then(response => {
            hideTypingIndicator();
            showAssistantResponse(response);
        })
        .catch(error => {
            hideTypingIndicator();
            showAssistantResponse("Sorry, I encountered an error. Please try again.");
            console.error("Error:", error);
        });
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v4"></path>
                <path d="M12 16h.01"></path>
            </svg>
        </div>
        <div class="message-bubble">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function showAssistantResponse(response) {
    const chatMessages = document.getElementById('chat-messages');
    const assistantMessageDiv = document.createElement('div');
    assistantMessageDiv.className = 'message assistant';

    assistantMessageDiv.innerHTML = `
        <div class="message-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v4"></path>
                <path d="M12 16h.01"></path>
            </svg>
        </div>
        <div class="message-bubble">
            <div>${converter.makeHtml(response)}</div>
        </div>
    `;
    chatMessages.appendChild(assistantMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleSignOut() {
    localStorage.removeItem('pinguToken');
    localStorage.removeItem('pinguUsername');
    alert('Signed out successfully');
    window.location.href = 'index.html';
}

function escapeHtml(text) {
    const map = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
    };

    return text.replace(/[&<>"]/g, function (m) { return map[m]; });
}