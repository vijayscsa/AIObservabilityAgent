import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Check } from 'lucide-react';
import './Login.css';

// Valid credentials
const VALID_CREDENTIALS = {
    username: 'dpeuser01',
    password: 'Password@123'
};

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
            // Store auth state
            if (rememberMe) {
                localStorage.setItem('aiops_authenticated', 'true');
                localStorage.setItem('aiops_user', username);
            } else {
                sessionStorage.setItem('aiops_authenticated', 'true');
                sessionStorage.setItem('aiops_user', username);
            }
            onLogin(username);
        } else {
            setError('Invalid username or password. Please try again.');
        }

        setIsLoading(false);
    };

    return (
        <div className="login-container">
            {/* Left Panel - Branding */}
            <div className="login-branding">
                <div className="branding-content">
                    <div className="logo-container">
                        <img src="/logo.png" alt="Logo" className="brand-logo" />
                    </div>
                    <h1 className="brand-title">AI for FR</h1>
                    <p className="brand-subtitle">Commonwealth Bank of Australia</p>

                    <div className="features-list">
                        <div className="feature-item">
                            <Check size={18} className="feature-icon" />
                            <span>AI-Powered Financial Analysis</span>
                        </div>
                        <div className="feature-item">
                            <Check size={18} className="feature-icon" />
                            <span>Sector Performance Tracking</span>
                        </div>
                        <div className="feature-item">
                            <Check size={18} className="feature-icon" />
                            <span>Automated Report Generation</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="login-form-panel">
                <div className="login-header">
                    <span className="online-status">
                        <span className="status-dot"></span>
                        Online
                    </span>
                    <button className="header-login-btn">Log on</button>
                </div>

                <div className="login-form-container">
                    <h2 className="login-title">Log on to AI for FR</h2>
                    <p className="login-subtitle">Enter your credentials to access your account.</p>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">Email or Username</label>
                            <div className="input-wrapper">
                                <User size={18} className="input-icon" />
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="remember-me">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="checkbox-custom"></span>
                                Remember me
                            </label>
                            <a href="#" className="forgot-password">Forgot password?</a>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="loading-spinner"></span>
                            ) : (
                                'Log on'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
