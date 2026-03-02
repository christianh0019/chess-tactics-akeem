import { useState, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { supabase } from '../lib/supabase';

// Piece SVG URLs from the Lichess open-source piece set
const PIECE_SVGS: Record<string, string> = {
    wK: 'https://www.chess.com/chess-themes/pieces/neo/150/wk.png',
    wQ: 'https://www.chess.com/chess-themes/pieces/neo/150/wq.png',
    wR: 'https://www.chess.com/chess-themes/pieces/neo/150/wr.png',
    wB: 'https://www.chess.com/chess-themes/pieces/neo/150/wb.png',
    wN: 'https://www.chess.com/chess-themes/pieces/neo/150/wn.png',
    wP: 'https://www.chess.com/chess-themes/pieces/neo/150/wp.png',
    bK: 'https://www.chess.com/chess-themes/pieces/neo/150/bk.png',
    bQ: 'https://www.chess.com/chess-themes/pieces/neo/150/bq.png',
    bR: 'https://www.chess.com/chess-themes/pieces/neo/150/br.png',
    bB: 'https://www.chess.com/chess-themes/pieces/neo/150/bb.png',
    bN: 'https://www.chess.com/chess-themes/pieces/neo/150/bn.png',
    bP: 'https://www.chess.com/chess-themes/pieces/neo/150/bp.png',
};

const PALETTE_PIECES = [
    ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'],
    ['bK', 'bQ', 'bR', 'bB', 'bN', 'bP'],
];

export default function CreatorPage() {
    const [boardWidth] = useState(480);
    const [game, setGame] = useState(new Chess('8/8/8/8/8/8/8/8 w - - 0 1'));
    const [mode, setMode] = useState<'setup' | 'sequence'>('setup');
    const [startingFen, setStartingFen] = useState('8/8/8/8/8/8/8/8 w - - 0 1');
    const [solution, setSolution] = useState<string[]>([]);
    const [dragPiece, setDragPiece] = useState<string | null>(null); // "wN", "bQ", etc. from palette
    const [dropHighlight, setDropHighlight] = useState<string | null>(null);

    // Tactic metadata
    const [tacticTitle, setTacticTitle] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [defaultWrongMessage, setDefaultWrongMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const dragSourceRef = useRef<string | null>(null); // "palette" or square like "e4"

    // ─── Setup Mode: piece placed from palette via drag ───
    const placePieceOnSquare = (pieceCode: string, square: string) => {
        const gameCopy = new Chess(game.fen());
        gameCopy.put({
            type: pieceCode[1].toLowerCase() as any,
            color: pieceCode[0] as any,
        }, square as any);
        setGame(gameCopy);
        setStartingFen(gameCopy.fen());
    };

    const removePieceFromSquare = (square: string) => {
        const gameCopy = new Chess(game.fen());
        gameCopy.remove(square as any);
        setGame(gameCopy);
        setStartingFen(gameCopy.fen());
    };

    // ─── Handle piece drop ON the board (board-to-board in setup, legal in sequence) ───
    const handlePieceDrop = ({ sourceSquare, targetSquare, piece }: { sourceSquare: string; targetSquare: string; piece: string }) => {
        if (mode === 'setup') {
            const gameCopy = new Chess(game.fen());
            gameCopy.remove(sourceSquare as any);
            gameCopy.put({ type: piece[1].toLowerCase() as any, color: piece[0] as any }, targetSquare as any);
            setGame(gameCopy);
            setStartingFen(gameCopy.fen());
            return true;
        } else {
            // Sequence recording
            const gameCopy = new Chess(game.fen());
            try {
                const move = gameCopy.move({
                    from: sourceSquare,
                    to: targetSquare,
                    promotion: 'q',
                });
                if (move) {
                    setGame(gameCopy);
                    setSolution(prev => [...prev, move.san]);
                    return true;
                }
            } catch { }
        }
        return false;
    };

    const toggleMode = (newMode: 'setup' | 'sequence') => {
        if (newMode === 'sequence' && mode === 'setup') {
            setGame(new Chess(startingFen));
            setSolution([]);
        }
        setMode(newMode);
    };

    const undoMove = () => {
        if (solution.length === 0) return;
        const gameCopy = new Chess(game.fen());
        gameCopy.undo();
        setGame(gameCopy);
        setSolution(prev => prev.slice(0, -1));
    };

    const setTurn = (turn: 'w' | 'b') => {
        const parts = game.fen().split(' ');
        parts[1] = turn;
        try {
            const newGame = new Chess(parts.join(' '));
            setGame(newGame);
            setStartingFen(parts.join(' '));
        } catch { }
    };

    const clearBoard = () => {
        const empty = new Chess('8/8/8/8/8/8/8/8 w - - 0 1');
        setGame(empty);
        setStartingFen(empty.fen());
    };

    const exportTactic = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        try {
            const { error } = await supabase.from('tactics').insert([{
                id: `tactic_${Math.random().toString(36).substr(2, 9)}`,
                title: tacticTitle,
                fen: startingFen,
                turn: game.turn(),
                solution,
                success_message: successMessage,
                default_wrong_message: defaultWrongMessage,
                wrong_move_traps: [],
            }]);
            if (error) throw error;
            setSaveMessage({ text: '✓ Tactic saved to database!', type: 'success' });
            setTacticTitle('');
            setSuccessMessage('');
            setDefaultWrongMessage('');
            setSolution([]);
            setMode('setup');
        } catch (err: any) {
            setSaveMessage({ text: err.message || 'Failed to save.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // ─── squareRenderer: intercept HTML5 drops from the palette ───
    const squareRenderer = ({ square, squareColor: _squareColor, children }: any) => {
        const isHighlighted = dropHighlight === square;
        return (
            <div
                style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: isHighlighted ? 'rgba(59,130,246,0.4)' : undefined }}
                onDragOver={(e) => {
                    if (mode === 'setup') {
                        e.preventDefault();
                        setDropHighlight(square);
                    }
                }}
                onDragLeave={() => setDropHighlight(null)}
                onDrop={(e) => {
                    if (mode !== 'setup') return;
                    e.preventDefault();
                    setDropHighlight(null);
                    const incoming = dragPiece || e.dataTransfer.getData('piece');
                    const fromSquare = dragSourceRef.current;

                    if (incoming && fromSquare === 'palette') {
                        placePieceOnSquare(incoming, square);
                    } else if (fromSquare && fromSquare !== 'palette' && fromSquare !== square) {
                        // Board-to-board move — let react-chessboard handle via onPieceDrop
                    }
                    setDragPiece(null);
                    dragSourceRef.current = null;
                }}
                onDoubleClick={() => {
                    if (mode === 'setup') removePieceFromSquare(square);
                }}
            >
                {children}
            </div>
        );
    };

    return (
        <div className="page-container animate-fade-in">
            {/* Header */}
            <header className="page-header">
                <div>
                    <h1>Tactic Creator</h1>
                    <p className="page-subtitle">Build new tactics for Akeem's curriculum.</p>
                </div>
                <div className="tactic-selector-container">
                    <button
                        onClick={() => toggleMode('setup')}
                        style={{ padding: '0.5rem 1.25rem', background: mode === 'setup' ? 'var(--accent-primary)' : 'var(--bg-glass)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: mode === 'setup' ? 'bold' : 'normal', transition: 'all 0.2s' }}
                    >
                        1 · Setup Board
                    </button>
                    <button
                        onClick={() => toggleMode('sequence')}
                        style={{ marginLeft: '8px', padding: '0.5rem 1.25rem', background: mode === 'sequence' ? 'var(--accent-warning)' : 'var(--bg-glass)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: mode === 'sequence' ? 'bold' : 'normal', transition: 'all 0.2s' }}
                    >
                        2 · Record Moves
                    </button>
                </div>
            </header>

            <div className="main-content" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* Left: Board + Palette */}
                <section className="board-section glass-panel" style={{ padding: '1.5rem', flex: '0 0 auto' }}>
                    {mode === 'setup' && (
                        <>
                            {/* Controls row */}
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paste FEN</label>
                                    <input
                                        value={startingFen}
                                        onChange={e => {
                                            setStartingFen(e.target.value);
                                            try { setGame(new Chess(e.target.value)); } catch { }
                                        }}
                                        style={{ padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--accent-primary)', fontFamily: 'monospace', fontSize: '0.8rem', borderRadius: '4px', minWidth: '200px' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To Move</label>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {(['w', 'b'] as const).map(c => (
                                            <button key={c} onClick={() => setTurn(c)} style={{ padding: '0.4rem 0.75rem', background: game.turn() === c ? (c === 'w' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)') : 'rgba(255,255,255,0.1)', color: game.turn() === c ? (c === 'w' ? '#111' : '#fff') : '#aaa', border: `2px solid ${game.turn() === c ? 'var(--accent-primary)' : 'transparent'}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                {c === 'w' ? '♔ White' : '♚ Black'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'transparent' }}>-</label>
                                    <button onClick={clearBoard} style={{ padding: '0.4rem 0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        {/* Piece Palette — only show in setup mode */}
                        {mode === 'setup' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drag</p>
                                {PALETTE_PIECES.map((row, rowIdx) => (
                                    <div key={rowIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {row.map(pieceCode => (
                                            <div
                                                key={pieceCode}
                                                draggable
                                                onDragStart={(e) => {
                                                    setDragPiece(pieceCode);
                                                    dragSourceRef.current = 'palette';
                                                    e.dataTransfer.setData('piece', pieceCode);
                                                    e.dataTransfer.effectAllowed = 'copy';
                                                }}
                                                onDragEnd={() => {
                                                    setDragPiece(null);
                                                    dragSourceRef.current = null;
                                                }}
                                                title={pieceCode}
                                                style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    cursor: 'grab',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '6px',
                                                    background: dragPiece === pieceCode ? 'rgba(99,102,241,0.3)' : (rowIdx === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)'),
                                                    border: dragPiece === pieceCode ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                                                    transition: 'all 0.15s',
                                                    userSelect: 'none',
                                                }}
                                            >
                                                <img
                                                    src={PIECE_SVGS[pieceCode]}
                                                    alt={pieceCode}
                                                    style={{ width: '36px', height: '36px', pointerEvents: 'none' }}
                                                    draggable={false}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>Dbl-click<br />to remove</p>
                            </div>
                        )}

                        {/* Chessboard */}
                        <div style={{ width: boardWidth }}>
                            <Chessboard
                                options={{
                                    boardOrientation: game.turn() === 'w' ? 'white' : 'black',
                                    id: 'creator-board',
                                    position: game.fen(),
                                    allowDragging: true,
                                    darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
                                    lightSquareStyle: { backgroundColor: 'var(--board-light)' },
                                    dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(59, 130, 246, 0.5)' },
                                    onPieceDrop: handlePieceDrop as any,
                                    squareRenderer: squareRenderer,
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* Right: Metadata Panel */}
                <aside className="glass-panel" style={{ flex: '1', minWidth: '280px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ marginBottom: '0.25rem' }}>Tactic Info</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
                        <input
                            value={tacticTitle}
                            onChange={e => setTacticTitle(e.target.value)}
                            placeholder="e.g. The Greek Gift Sacrifice"
                            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Message</label>
                        <textarea
                            value={successMessage}
                            onChange={e => setSuccessMessage(e.target.value)}
                            placeholder="Akeem's praise when they get it right…"
                            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', minHeight: '70px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wrong Move Hint</label>
                        <textarea
                            value={defaultWrongMessage}
                            onChange={e => setDefaultWrongMessage(e.target.value)}
                            placeholder="Akeem's hint when they pick a wrong move…"
                            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', minHeight: '70px', resize: 'vertical' }}
                        />
                    </div>

                    {mode === 'sequence' && (
                        <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Recorded Solution</h4>
                                <div style={{ fontFamily: 'monospace', color: 'var(--accent-warning)', fontSize: '0.9rem', minHeight: '24px', wordBreak: 'break-all' }}>
                                    {solution.length > 0 ? solution.join(' → ') : <span style={{ color: 'var(--text-muted)' }}>Make moves on the board…</span>}
                                </div>
                            </div>
                            <button
                                onClick={undoMove}
                                disabled={solution.length === 0}
                                style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.08)', color: solution.length ? 'white' : '#555', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: solution.length ? 'pointer' : 'not-allowed' }}
                            >
                                ↩ Undo Last Move
                            </button>
                        </div>
                    )}

                    {saveMessage && (
                        <div style={{ padding: '0.75rem', borderRadius: '4px', background: saveMessage.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: saveMessage.type === 'error' ? '#ef4444' : '#22c55e', fontSize: '0.9rem', textAlign: 'center' }}>
                            {saveMessage.text}
                        </div>
                    )}

                    <button
                        onClick={exportTactic}
                        disabled={isSaving || mode !== 'sequence' || solution.length === 0}
                        style={{ marginTop: 'auto', padding: '0.75rem', background: (mode === 'sequence' && solution.length > 0) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', cursor: (mode === 'sequence' && solution.length > 0 && !isSaving) ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '1rem', opacity: isSaving ? 0.7 : 1, transition: 'all 0.2s' }}
                    >
                        {isSaving ? 'Saving…' : '🚀 Publish to Database'}
                    </button>
                </aside>
            </div>
        </div>
    );
}
