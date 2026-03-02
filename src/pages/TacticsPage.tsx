import { useState } from 'react';
import ChessBoard from '../components/ChessBoard';
import Instructor from '../components/Instructor';
import { useTactics } from '../hooks/useTactics';

export default function TacticsPage() {
    const [boardWidth] = useState(600);
    const {
        game,
        turnColor,
        akeemMessage,
        onDrop,
        onSquareClick,
        onPieceDrag,
        optionSquares,
        nextTactic,
        solveTactic,
        isCompleted,
        isLastTactic,
        currentTacticIndex,
        setCurrentTacticIndex,
        tacticsList
    } = useTactics();

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>Tactics Training</h1>
                    <p className="page-subtitle">Master the board with guided insights from GM Akeem.</p>
                </div>

                <div className="tactic-selector-container">
                    <label htmlFor="tactic-select" className="tactic-subtitle">Current Tactic: </label>
                    <select
                        id="tactic-select"
                        className="tactic-select"
                        value={currentTacticIndex}
                        onChange={(e) => setCurrentTacticIndex(Number(e.target.value))}
                    >
                        {tacticsList.map((t: any, idx: number) => (
                            <option key={t.id} value={idx}>{t.title}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="main-content">
                <section className="board-section glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <ChessBoard
                        boardWidth={boardWidth}
                        game={game}
                        turnColor={turnColor}
                        onDrop={onDrop}
                        onSquareClick={onSquareClick}
                        onPieceDrag={onPieceDrag}
                        optionSquares={optionSquares}
                    />
                </section>

                <aside className="instructor-sidebar animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <Instructor
                        message={akeemMessage}
                        isCompleted={isCompleted}
                        isLastTactic={isLastTactic}
                        onNext={nextTactic}
                        onSolve={solveTactic}
                    />
                </aside>
            </div>
        </div>
    );
}
