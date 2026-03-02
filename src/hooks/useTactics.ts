import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { supabase } from '../lib/supabase';

const moveAudio = new Audio('/sounds/move.mp3');
const captureAudio = new Audio('/sounds/capture.mp3');
const checkAudio = new Audio('/sounds/check.mp3');

const playSound = (moveObj: any, gameCopy: Chess) => {
    try {
        let baseAudio;
        if (gameCopy.isCheck() || gameCopy.isCheckmate()) {
            baseAudio = checkAudio;
        } else if (moveObj.captured) {
            baseAudio = captureAudio;
        } else {
            baseAudio = moveAudio;
        }
        const audioClone = baseAudio.cloneNode() as HTMLAudioElement;
        audioClone.play().catch(() => { });
    } catch (e) { }
};

export function useTactics() {
    const [tacticsList, setTacticsList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTacticIndex, setCurrentTacticIndex] = useState(0);

    const [game, setGame] = useState(new Chess());
    const [akeemMessage, setAkeemMessage] = useState("Loading tactics...");
    const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

    const [solutionStep, setSolutionStep] = useState(0);
    const [isPlayingOutTrap, setIsPlayingOutTrap] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        const fetchTactics = async () => {
            try {
                const { data, error } = await supabase.from('tactics').select('*');
                if (error) throw error;
                if (data && data.length > 0) {
                    setTacticsList(data);
                } else {
                    setAkeemMessage("No tactics found. Add some from the Creator view!");
                }
            } catch (err) {
                console.error("Error fetching tactics:", err);
                setAkeemMessage("Failed to load tactics from database.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTactics();
    }, []);

    const tactic = tacticsList[currentTacticIndex];

    useEffect(() => {
        if (!tactic) return;

        const newGame = new Chess(tactic.fen);
        setGame(newGame);
        setSolutionStep(0);
        setIsPlayingOutTrap(false);
        setIsCompleted(false);
        setAkeemMessage(`Welcome to "${tactic.title}". Analyze the board and find the best move.`);
    }, [currentTacticIndex, tactic]);

    const resetTactic = useCallback(() => {
        const newGame = new Chess(tactic.fen);
        setGame(newGame);
        setSolutionStep(0);
        setIsPlayingOutTrap(false);
        setOptionSquares({});
    }, [tactic]);

    const onDrop = useCallback(({ sourceSquare, targetSquare, piece }: { sourceSquare: string, targetSquare: string | null, piece: any }) => {
        setOptionSquares({});
        if (isPlayingOutTrap || isCompleted) return false;
        if (!targetSquare) return false;

        const gameCopy = new Chess(game.fen());
        let moveObj = null;

        try {
            moveObj = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: piece[1] ? piece[1].toLowerCase() : 'q',
            });
        } catch (e) {
            return false;
        }

        if (!moveObj) return false;

        playSound(moveObj, gameCopy);

        const attemptedSan = moveObj.san;
        const correctSan = tactic.solution[solutionStep];

        if (attemptedSan === correctSan) {
            setGame(gameCopy);

            if (solutionStep === tactic.solution.length - 1) {
                setIsCompleted(true);
                setAkeemMessage(tactic.successMessage);
            } else {
                setSolutionStep(step => step + 1);
                setAkeemMessage("Good move! But what is Black's response?");

                // Auto-play opponent response if the solution array has it
                const nextOpponentMove = tactic.solution[solutionStep + 1];
                if (nextOpponentMove) {
                    setTimeout(() => {
                        const nextGameCopy = new Chess(gameCopy.fen());
                        const m = nextGameCopy.move(nextOpponentMove);
                        setGame(nextGameCopy);
                        playSound(m, nextGameCopy);
                        setSolutionStep(step => step + 2); // Skipping to next player turn
                        setAkeemMessage("Here's the response. What's your follow-up?");
                    }, 600);
                }
            }
            return true;
        }

        // Wrong move
        const trap = tactic.wrongMoveTraps.find((t: any) => t.wrongMove === attemptedSan);

        setGame(gameCopy);
        setIsPlayingOutTrap(true);

        if (trap) {
            setAkeemMessage(trap.explanation);

            setTimeout(() => {
                const nextGame = new Chess(gameCopy.fen());
                try {
                    const m = nextGame.move(trap.responseMove);
                    setGame(nextGame);
                    playSound(m, nextGame);
                } catch (e) {
                    console.error("Opponent response move trap invalid execution.");
                }

                setTimeout(() => {
                    resetTactic();
                    setAkeemMessage("Let's try that again. Focus on the tactic!");
                }, 3500);
            }, 1500);

        } else {
            setAkeemMessage(tactic.defaultWrongMessage);
            setTimeout(() => {
                resetTactic();
                setAkeemMessage("That wasn't right. Give it another thought.");
            }, 2500);
        }

        return true;

    }, [game, isPlayingOutTrap, isCompleted, tactic, solutionStep, resetTactic]);

    const nextTactic = () => {
        if (currentTacticIndex < tacticsList.length - 1) {
            setCurrentTacticIndex(idx => idx + 1);
        } else {
            setAkeemMessage("Congratulations! You've mastered these tactical patterns.");
        }
    };

    const solveTactic = useCallback(() => {
        if (isCompleted || isPlayingOutTrap || !tactic) return;

        // Reset to initial state first
        const newGame = new Chess(tactic.fen);
        setGame(newGame);
        setSolutionStep(0);
        setIsPlayingOutTrap(true); // Re-using this flag to disable user input during solving
        setAkeemMessage("Watch closely! Here is the tactical sequence.");

        let currentStep = 0;
        let currentGame = newGame;

        const playNextMove = () => {
            if (currentStep >= tactic.solution.length) {
                setIsPlayingOutTrap(false);
                setIsCompleted(true);
                setAkeemMessage(`Solved! ${tactic.successMessage}`);
                setSolutionStep(currentStep); // Set to final step
                return;
            }

            const nextMove = tactic.solution[currentStep];
            setTimeout(() => {
                const nextGameCopy = new Chess(currentGame.fen());
                const m = nextGameCopy.move(nextMove);
                setGame(nextGameCopy);
                playSound(m, nextGameCopy);
                currentGame = nextGameCopy;
                currentStep++;

                // If it was white's turn, next is black's, etc. We just play them all out with a delay
                playNextMove();
            }, Math.max(1000, 1500 - (currentStep * 100))); // Play slightly faster over time
        };

        playNextMove();

    }, [tactic, isCompleted, isPlayingOutTrap]);

    const highlightMoves = useCallback((square: string) => {
        if (isPlayingOutTrap || isCompleted) return;
        const moves = game.moves({ square: square as import('chess.js').Square, verbose: true }) as any[];
        if (moves.length === 0) {
            setOptionSquares({});
            return;
        }

        const newSquares: Record<string, React.CSSProperties> = {};
        moves.forEach((move) => {
            const targetPiece = game.get(move.to as import('chess.js').Square);
            const sourcePiece = game.get(square as import('chess.js').Square);
            const isCapture = targetPiece && sourcePiece && targetPiece.color !== sourcePiece.color;
            newSquares[move.to] = {
                background: isCapture
                    ? "radial-gradient(circle, transparent 40%, rgba(255,255,255,0.2) 41%, rgba(255,255,255,0.2) 50%, transparent 51%)"
                    : "radial-gradient(circle, rgba(255,255,255,0.2) 18%, transparent 20%)",
                borderRadius: "50%"
            };
        });
        newSquares[square] = {
            background: "rgba(255, 255, 0, 0.4)"
        };
        setOptionSquares(newSquares);
    }, [game, isPlayingOutTrap, isCompleted]);

    const onSquareClick = useCallback(({ square }: { square: string | null }) => {
        if (square) highlightMoves(square);
    }, [highlightMoves]);

    const onPieceDrag = useCallback(({ square }: { square: string | null }) => {
        if (square) highlightMoves(square);
    }, [highlightMoves]);

    return {
        game,
        isLoading,
        turnColor: tactic?.turn || 'w',
        akeemMessage,
        onDrop,
        onSquareClick,
        onPieceDrag,
        optionSquares,
        nextTactic,
        solveTactic,
        isCompleted,
        isLastTactic: currentTacticIndex === tacticsList.length - 1,
        tacticTitle: tactic?.title || 'Loading...',
        currentTacticIndex,
        setCurrentTacticIndex,
        tacticsList
    };
}
