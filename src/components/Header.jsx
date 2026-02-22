import { Menu, Zap } from 'lucide-react';

export default function Header({ onOpenSidebar }) {
    return (
        <header className="mobile-header">
            <button
                onClick={onOpenSidebar}
                style={{
                    background: 'none', border: 'none', color: 'var(--text-primary)',
                    cursor: 'pointer', padding: 8, display: 'flex'
                }}
            >
                <Menu size={24} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: 'linear-gradient(135deg,#6c63ff,#38bdf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Zap size={14} color="#fff" fill="#fff" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.4px' }}>
                    HybridSpace
                </span>
            </div>

            <div style={{ width: 40 }} /> {/* Spacer for centering the logo better */}
        </header>
    );
}
