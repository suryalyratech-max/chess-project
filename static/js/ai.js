console.log("ai.js loaded");

const knightTable = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const pawnTable = [
    [0,0,0,0,0,0,0,0],
    [5,10,10,-20,-20,10,10,5],
    [5,-5,-10,0,0,-10,-5,5],
    [0,0,0,20,20,0,0,0],
    [5,5,10,25,25,10,5,5],
    [10,10,20,30,30,20,10,10],
    [50,50,50,50,50,50,50,50],
    [0,0,0,0,0,0,0,0]
];

function makeAIMove() {
    if (gameOver) return;

    let difficulty = difficultySelect.value;

    if (difficulty === "easy") {
        easyMove();
    } else if (difficulty === "medium") {
        mediumMove();
    } else {
        hardMove();
    }
}

function easyMove() {
    let moves = game.moves();
    if (moves.length === 0) return;

    let randomMove = moves[Math.floor(Math.random() * moves.length)];

    saveGameState();
    let move = game.move(randomMove);

    afterAIMove(move);
}

function mediumMove() {
    let moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    let bestMoves = moves.filter(m => m.captured || m.san.includes("+"));

    let chosenMove;
    if (bestMoves.length > 0) {
        chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    } else {
        chosenMove = moves[Math.floor(Math.random() * moves.length)];
    }

    saveGameState(); // ← added
    let move = game.move(chosenMove);

    afterAIMove(move);
}

function hardMove() {
    let bestMove = minimaxRoot(4, game, true);

    if (bestMove) {
        saveGameState(); // ← added
        let move = game.move(bestMove);
        afterAIMove(move);
    }
}

function afterAIMove(move) {
    playMoveSound();

    if (move && move.captured) {
        playCaptureSound();

        let capturedPiece =
            move.color === "w"
                ? pieces[move.captured.toLowerCase()]
                : pieces[move.captured.toUpperCase()];

        if (move.color === "w") {
            whiteCaptured.push(capturedPiece);
        } else {
            blackCaptured.push(capturedPiece);
        }

        updateCaptured();
    }

    if (move) {
        updateHistory(move.san);
    }

    drawBoard();

    if (game.in_checkmate()) {
        gameOver = true;
        let winner = game.turn() === "w" ? "Black" : "White";
        showWinner(winner);
    } else if (game.in_check()) {
        playCheckSound();
        showCheckPopup();
    }
}

function minimaxRoot(depth, game, isMaximisingPlayer) {
    let moves = game.moves();
    let bestMove = -999999;
    let bestMoveFound = null;

    for (let move of moves) {
        game.move(move);
        let value = minimax(depth - 1, game, -1000000, 1000000, !isMaximisingPlayer);
        game.undo();

        if (value > bestMove) {
            bestMove = value;
            bestMoveFound = move;
        }
    }

    return bestMoveFound;
}

function minimax(depth, game, alpha, beta, isMaximisingPlayer) {
    if (depth === 0) {
        return evaluateBoard(game.board());
    }

    let moves = game.moves();

    if (isMaximisingPlayer) {
        let best = -999999;

        for (let move of moves) {
            game.move(move);
            best = Math.max(best, minimax(depth - 1, game, alpha, beta, false));
            game.undo();

            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }

        return best;
    } else {
        let best = 999999;

        for (let move of moves) {
            game.move(move);
            best = Math.min(best, minimax(depth - 1, game, alpha, beta, true));
            game.undo();

            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }

        return best;
    }
}

function evaluateBoard(board) {
    let total = 0;

    const values = {
        p: 100,
        n: 320,
        b: 330,
        r: 500,
        q: 900,
        k: 20000
    };

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            let piece = board[row][col];

            if (piece !== null) {
                let value = values[piece.type];

                if (piece.type === "n") {
                    value += knightTable[row][col];
                }

                if (piece.type === "p") {
                    value += pawnTable[row][col];
                }

                total += piece.color === "b" ? value : -value;
            }
        }
    }

    return total;
}