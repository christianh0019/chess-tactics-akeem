export default function SettingsPage() {
    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p className="page-subtitle">Manage your training preferences and account.</p>
                </div>
            </header>

            <div className="glass-panel p-6 mt-6">
                <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Preferences</h2>
                <p style={{ color: 'var(--text-muted)' }}>Additional settings and board options will be added here in the future.</p>
            </div>
        </div>
    );
}
