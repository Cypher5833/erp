document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordField = document.getElementById('password');
    const togglePassword = document.querySelector('.toggle-password');
    const forgotPassword = document.getElementById('forgotPassword');

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordField.type === 'password' ? 'text' : 'password';
        passwordField.type = type;
        togglePassword.querySelector('.eye-icon').style.backgroundImage = 
            type === 'password' 
                ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M15 12a3 3 0 11-6 0 3 3 0 016 0z\' /%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z\' /%3E%3C/svg%3E")'
                : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21\' /%3E%3C/svg%3E")';
    });    // Handle form submission with Firebase
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = loginForm.email.value;
        const password = loginForm.password.value;
        const remember = loginForm.remember.checked;

        // Check for default credentials
        if (email === "ashish@aju.com" && password === "ashish@123") {
            window.location.href = 'dashboard.html';
            return;
        }

        try {
            // Sign in with Firebase
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Get the ID token
            const idToken = await user.getIdToken();

            // If remember me is checked, set persistence to LOCAL
            if (remember) {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            } else {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
            }

            // Send token to backend for verification
            const response = await fetch('login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: idToken,
                    remember: remember
                })
            });

            const data = await response.json();            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                showError(data.error);
            }
        } catch (error) {
            let errorMessage = 'An error occurred during login';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Invalid email or password';
                    break;
            }
            showError(errorMessage);
        }
    });

    // Handle forgot password
    forgotPassword.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = loginForm.email.value;

        if (!email) {
            showError('Please enter your email address');
            return;
        }

        try {
            await firebase.auth().sendPasswordResetEmail(email);
            showMessage('Password reset email sent. Please check your inbox.', 'success');
        } catch (error) {
            showError('Failed to send password reset email. Please try again.');
        }
    });

    // Show error message
    function showError(message) {
        showMessage(message, 'error');
    }

    // Show message with type
    function showMessage(message, type = 'error') {
        let messageDiv = document.querySelector('.message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            loginForm.insertBefore(messageDiv, loginForm.firstChild);
        }
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }
});
