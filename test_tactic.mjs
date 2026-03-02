import { Chess } from 'chess.js';

const fen = '5rk1/1p5p/p2p2p1/2pP3r/P1P1Bn2/1P3PqP/3Q2P1/1R3RK1 b - - 1 1';
const chess = new Chess(fen);
chess.move('Nxh3+');
console.log("After Nxh3+:");
console.log(chess.ascii());
console.log("Legal moves for White:", chess.moves());
try {
    chess.move('Kh1');
    chess.move('Nf2+');
    console.log("After Nf2+:");
    console.log(chess.moves());
    chess.move('Kg1');
    chess.move('Rh1#');
    console.log("Is checkmate?", chess.isCheckmate());
} catch (e) {
    console.error("Mate sequence didn't work:", e.message);
}
