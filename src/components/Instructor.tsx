import './Instructor.css';

interface InstructorProps {
    message: string;
    isCompleted: boolean;
    isLastTactic: boolean;
    onNext: () => void;
    onSolve: () => void;
}

export default function Instructor({ message, isCompleted, isLastTactic, onNext, onSolve }: InstructorProps) {
    return (
        <div className="instructor-container glass-panel">
            <div className="instructor-header">
                <div className="avatar">
                    <img src="/akeem.png" alt="Akeem, Chess Coach" />
                </div>
                <div className="status">
                    <h3>Akeem</h3>
                    <span className="badge">Grandmaster Coach</span>
                </div>
            </div>

            <div className="chat-bubble">
                <p>{message}</p>
            </div>

            <div className="instructor-actions">
                {isCompleted && !isLastTactic ? (
                    <button className="btn-primary" onClick={onNext}>Next Tactic</button>
                ) : (
                    <>
                        {!isCompleted && <button className="btn-hint" onClick={onSolve}>Solve It</button>}
                        <button className="btn-hint" style={{ marginLeft: 'var(--space-2)' }}>Get a Hint</button>
                    </>
                )}
            </div>
        </div>
    );
}
