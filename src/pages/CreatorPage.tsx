import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { supabase } from '../lib/supabase';
import '../components/SidebarLayout.css'; // Re-use common layout styles

export default function CreatorPage() {
    const [boardWidth] = useState(500);
    const [game, setGame] = useState(new Chess());
    const [mode, setMode] = useState<'setup' | 'sequence'>('setup');

    // Tactic State
    const [tacticTitle, setTacticTitle] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [defaultWrongMessage, setDefaultWrongMessage] = useState('');
    const [solution, setSolution] = useState<string[]>([]);
    const [startingFen, setStartingFen] = useState('8/8/8/8/8/8/8/8 w - - 0 1');

    const handlePieceDrop = ({ sourceSquare, targetSquare, piece }: { sourceSquare: string, targetSquare: string | null, piece: any }) => {
        if (!targetSquare) return false;

        if (mode === 'setup') {
            // Setup mode essentially allows freely setting the board. 
            // Since react-chessboard doesn't easily expose the raw pieces array via drop alone, users can paste a FEN 
            // or just rely on sequence recording from a valid starting position.
            return true;
        } else {
            // Sequence mode: Play legal moves to build the solution array
            const gameCopy = new Chess(game.fen());
            try {
                const move = gameCopy.move({
                    from: sourceSquare,
                    to: targetSquare,
                    promotion: piece[1] ? piece[1].toLowerCase() : 'q',
                });

                if (move) {
                    setGame(gameCopy);
                    setSolution([...solution, move.san]);
                    return true;
                }
            } catch (e) {
                return false;
            }
        }
        return false;
    };

    const undoMove = () => {
        if (solution.length === 0) return;
        const gameCopy = new Chess(game.fen());
        gameCopy.undo();
        setGame(gameCopy);
        setSolution(solution.slice(0, -1));
    };

    const toggleMode = (newMode: 'setup' | 'sequence') => {
        if (newMode === 'sequence' && mode === 'setup') {
            // Lock in starting FEN for the sequence
            setGame(new Chess(startingFen));
            setSolution([]);
        }
        setMode(newMode);
    };

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const exportTactic = async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const exportedTactic = {
                id: `tactic_${Math.random().toString(36).substr(2, 9)}`,
                title: tacticTitle,
                fen: startingFen,
                turn: game.turn(),
                solution: solution,
                success_message: successMessage,
                default_wrong_message: defaultWrongMessage,
                wrong_move_traps: [] // Currently skipped in Creator view, could add later
            };

            const { error } = await supabase
                .from('tactics')
                .insert([exportedTactic]);

            if (error) throw error;

            setSaveMessage({ text: 'Tactic saved to Database!', type: 'success' });

            // Clear form
            setTacticTitle('');
            setSuccessMessage('');
            setDefaultWrongMessage('');
            setSolution([]);
            setMode('setup');

        } catch (error: any) {
            console.error('Failed to save tactic:', error);
            setSaveMessage({ text: error.message || 'Failed to save tactic to Database.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>Tactic Creator</h1>
                    <p className="page-subtitle">Build new tactics from scratch for Akeem's curriculum.</p>
                </div>

                <div className="tactic-selector-container">
                    <button
                        className={`tactic-select ${mode === 'setup' ? 'active-mode' : ''}`}
                        onClick={() => toggleMode('setup')}
                        style={{ background: mode === 'setup' ? 'var(--accent-primary)' : 'var(--bg-glass)' }}
                    >
                        Setup Board
                    </button>
                    <button
                        className={`tactic-select ${mode === 'sequence' ? 'active-mode' : ''}`}
                        onClick={() => toggleMode('sequence')}
                        style={{ marginLeft: '10px', background: mode === 'sequence' ? 'var(--accent-warning)' : 'var(--bg-glass)' }}
                    >
                        Record Sequence
                    </button>
                </div>
            </header>

            <div className="main-content" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <section className="board-section glass-panel" style={{ padding: '2rem', flex: '1', minWidth: '400px' }}>

                    {mode === 'setup' && (
                        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>FEN (Paste here to load a layout quickly):</label>
                            <input
                                value={startingFen}
                                onChange={e => {
                                    setStartingFen(e.target.value);
                                    try { setGame(new Chess(e.target.value)); } catch (e) { }
                                }}
                                style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-primary)', width: '100%', fontFamily: 'monospace' }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: boardWidth }}>
                            <Chessboard
                                options={{
                                    id: "creator-board",
                                    position: mode === 'setup' ? startingFen : game.fen(),
                                    allowDragging: true,
                                    darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
                                    lightSquareStyle: { backgroundColor: 'var(--board-light)' },
                                    dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(59, 130, 246, 0.5)' },
                                    onPieceDrop: handlePieceDrop
                                }}
                            />
                        </div>
                    </div>
                </section>

                <aside className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3>Tactic Metadata</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label>Title</label>
                        <input
                            value={tacticTitle}
                            onChange={e => setTacticTitle(e.target.value)}
                            placeholder="e.g. The Greek Gift"
                            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label>Success Message</label>
                        <textarea
                            value={successMessage}
                            onChange={e => setSuccessMessage(e.target.value)}
                            placeholder="Akeem's praise..."
                            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', minHeight: '60px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label>Default Wrong Message</label>
                        <textarea
                            value={defaultWrongMessage}
                            onChange={e => setDefaultWrongMessage(e.target.value)}
                            placeholder="Akeem's hint..."
                            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', minHeight: '60px' }}
                        />
                    </div>

                    {mode === 'sequence' && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <h4>Recorded Solution</h4>
                            <div style={{ fontFamily: 'monospace', color: 'var(--accent-warning)', margin: '0.5rem 0' }}>
                                [{solution.map(s => `"${s}"`).join(', ')}]
                            </div>
                            <button
                                onClick={undoMove}
                                disabled={solution.length === 0}
                                style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', cursor: solution.length ? 'pointer' : 'not-allowed' }}
                            >
                                Undo Last Move
                            </button>

                            {saveMessage && (
                                <div style={{
                                    padding: '0.75rem',
                                    marginBottom: '1rem',
                                    borderRadius: '4px',
                                    backgroundColor: saveMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                    color: saveMessage.type === 'error' ? '#ef4444' : '#22c55e',
                                    fontSize: '0.9rem',
                                    textAlign: 'center'
                                }}>
                                    {saveMessage.text}
                                </div>
                            )}

                            <button
                                onClick={exportTactic}
                                disabled={isSaving}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    width: '100%',
                                    fontWeight: 'bold',
                                    opacity: isSaving ? 0.7 : 1
                                }}
                            >
                                {isSaving ? 'Saving...' : 'Publish to Database'}
                            </button>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
