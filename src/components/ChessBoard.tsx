import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessBoardProps {
    boardWidth: number;
    game: Chess;
    turnColor: 'w' | 'b';
    onDrop: (args: { sourceSquare: string, targetSquare: string | null, piece: any }) => boolean;
    onSquareClick: (args: { square: string | null }) => void;
    onPieceDrag: (args: { square: string | null }) => void;
    optionSquares: Record<string, React.CSSProperties>;
}

export default function ChessBoard({ boardWidth, game, turnColor, onDrop, onSquareClick, onPieceDrag, optionSquares }: ChessBoardProps) {
    return (
        <div style={{ width: boardWidth, maxWidth: '100%', aspectRatio: '1/1' }}>
            <Chessboard
                options={{
                    position: game.fen(),
                    boardOrientation: turnColor === 'w' ? 'white' : 'black',
                    onPieceDrop: onDrop,
                    onSquareClick: onSquareClick,
                    onPieceClick: onPieceDrag,
                    onPieceDrag: onPieceDrag,
                    squareStyles: optionSquares,
                    dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(59, 130, 246, 0.5)' },
                    draggingPieceStyle: { filter: 'drop-shadow(0 15px 15px rgba(0, 0, 0, 0.5))', transform: 'scale(1.15) translateY(-5px)' }
                }}
            />
        </div>
    );
}
