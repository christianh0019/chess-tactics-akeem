const stockfish = require('stockfish');
const engine = stockfish();

engine.onmessage = function (line) {
    if (line.includes('bestmove')) {
        console.log(line);
        process.exit(0);
    }
};

engine.postMessage('uci');
engine.postMessage('position fen 5rk1/1p5p/p2p2p1/2pP3r/P1P1Bn2/1P3PqP/3Q2P1/1R3R1K w - - 0 1');
engine.postMessage('go depth 15');
