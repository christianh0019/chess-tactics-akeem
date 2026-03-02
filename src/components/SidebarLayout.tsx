import { NavLink, Outlet } from 'react-router-dom';
import { Target, Settings, Crown, PenTool, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './SidebarLayout.css';

export default function SidebarLayout() {
    const { user, isAdmin, signOut } = useAuth();

    return (
        <div className="layout-container">
            <nav className="sidebar glass-panel">
                <div className="sidebar-brand">
                    <Crown className="brand-icon" size={28} />
                    <span className="brand-text">Akeem Chess</span>
                </div>

                <div className="sidebar-links">
                    <NavLink
                        to="/tactics"
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <Target size={20} />
                        <span>Tactics</span>
                    </NavLink>

                    {isAdmin && (
                        <NavLink
                            to="/creator"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <PenTool size={20} />
                            <span>Creator</span>
                        </NavLink>
                    )}

                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </NavLink>

                    <button onClick={signOut} className="sidebar-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: 'auto' }}>
                        <LogOut size={20} color="var(--text-muted)" />
                        <span style={{ color: 'var(--text-muted)' }}>Logout</span>
                    </button>
                </div>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar">
                            <span>{user?.email?.[0].toUpperCase() || 'U'}</span>
                        </div>
                        <div className="user-info" style={{ overflow: 'hidden' }}>
                            <span className="user-name" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {user?.email || 'Guest'}
                            </span>
                            <span className="user-role" style={{ color: isAdmin ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                                {isAdmin ? 'Admin' : 'Student'}
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="layout-content">
                <Outlet />
            </main>
        </div>
    );
}
