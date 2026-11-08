import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    AlertTriangle,
    MessageSquare,
    Server,
    Settings,
    Bell,
    Search,
    Menu,
    X,
    Activity,
    LogOut,
    User
} from 'lucide-react';
import Dashboard from './components/Dashboard/Dashboard';
import Incidents from './components/Incidents/Incidents';
import Chat from './components/Chat/Chat';
import Services from './components/Services/Services';
import AlertBanner from './components/Alerts/AlertBanner';
import Login from './components/Login/Login';
import useWebSocket from './hooks/useWebSocket';
import './styles/App.css';

// Check if user is authenticated
function checkAuth() {
    return localStorage.getItem('aiops_authenticated') === 'true' ||
        sessionStorage.getItem('aiops_authenticated') === 'true';
}

// Get current user
function getUser() {
    return localStorage.getItem('aiops_user') ||
        sessionStorage.getItem('aiops_user') ||
        'User';
}

function AppContent({ onLogout, user }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const location = useLocation();

    // WebSocket connection for real-time updates
    const { isConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:8005/ws');

    // Handle incoming WebSocket messages
    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === 'broadcast') {
                if (lastMessage.channel === 'incidents') {
                    // Handle incident updates
                    const incident = lastMessage.data;
                    if (incident.urgency === 'high' && incident.status === 'triggered') {
                        setCriticalAlerts(prev => [...prev, incident]);

                        // Auto-dismiss after 10 seconds
                        setTimeout(() => {
                            setCriticalAlerts(prev => prev.filter(a => a.id !== incident.id));
                        }, 10000);
                    }
                }
            }
        }
    }, [lastMessage]);

    // Subscribe to channels on connect
    useEffect(() => {
        if (isConnected) {
            sendMessage({
                type: 'subscribe',
                channels: ['incidents', 'services', 'alerts']
            });
        }
    }, [isConnected, sendMessage]);

    const dismissAlert = useCallback((alertId) => {
        setCriticalAlerts(prev => prev.filter(a => a.id !== alertId));
    }, []);

    const handleLogout = () => {
        onLogout();
    };

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
        { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
        { to: '/services', icon: Server, label: 'Services' },
    ];

    return (
        <div className="app">
            {/* Critical Alerts Banner */}
            {criticalAlerts.length > 0 && (
                <AlertBanner
                    alerts={criticalAlerts}
                    onDismiss={dismissAlert}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <Activity size={24} />
                        </div>
                        {sidebarOpen && <span className="logo-text">AIOps</span>}
                    </div>
                    <button
                        className="btn-icon sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'nav-item-active' : ''}`
                            }
                        >
                            <Icon size={20} className="nav-icon" />
                            {sidebarOpen && <span className="nav-label">{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        {sidebarOpen && (
                            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${sidebarOpen ? '' : 'main-content-expanded'}`}>
                {/* Top Bar */}
                <header className="topbar glass">
                    <div className="topbar-left">
                        <h1 className="page-title">
                            {navItems.find(item => item.to === location.pathname)?.label || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="topbar-right">
                        <div className="search-box">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search incidents, services..."
                                className="search-input"
                            />
                        </div>

                        <button className="btn-icon notification-btn" aria-label="Notifications">
                            <Bell size={20} />
                            {notifications.length > 0 && (
                                <span className="notification-badge">{notifications.length}</span>
                            )}
                        </button>

                        <button className="btn-icon" aria-label="Settings">
                            <Settings size={20} />
                        </button>

                        {/* User Menu */}
                        <div className="user-menu-container">
                            <button
                                className="user-menu-btn"
                                onClick={() => setShowUserMenu(!showUserMenu)}
                            >
                                <div className="user-avatar">
                                    <User size={16} />
                                </div>
                                <span className="user-name">{user}</span>
                            </button>
                            {showUserMenu && (
                                <>
                                    {/* Overlay to close menu when clicking outside */}
                                    <div
                                        className="user-menu-overlay"
                                        onClick={() => setShowUserMenu(false)}
                                    />
                                    <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                                        <div className="user-dropdown-header">
                                            <div className="user-avatar-large">
                                                <User size={24} />
                                            </div>
                                            <div className="user-info">
                                                <span className="user-display-name">{user}</span>
                                                <span className="user-role">Administrator</span>
                                            </div>
                                        </div>
                                        <div className="user-dropdown-divider"></div>
                                        <button
                                            className="user-dropdown-item"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleLogout();
                                            }}
                                        >
                                            <LogOut size={16} />
                                            <span>Log out</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="page-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/incidents" element={<Incidents />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/services" element={<Services />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
    const [user, setUser] = useState(getUser());

    const handleLogin = (username) => {
        setIsAuthenticated(true);
        setUser(username);
    };

    const handleLogout = () => {
        // Clear all auth data
        localStorage.removeItem('aiops_authenticated');
        localStorage.removeItem('aiops_user');
        sessionStorage.removeItem('aiops_authenticated');
        sessionStorage.removeItem('aiops_user');

        // Update state
        setIsAuthenticated(false);
        setUser('');

        // Force reload to clear any cached state
        window.location.href = '/';
    };

    // Show login page if not authenticated
    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <BrowserRouter>
            <AppContent onLogout={handleLogout} user={user} />
        </BrowserRouter>
    );
}

export default App;

