const socket = io();

socket.on("connect", () => {
    console.log("Connected to server");
});
const roomInput = document.getElementById("roomInput");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomStatus = document.getElementById("roomStatus");

let currentRoom = null;
let myColor = null;
const board = document.getElementById("board");
const turnText = document.getElementById("turn");
const winnerPopup = document.getElementById("winnerPopup");
const winnerText = document.getElementById("winnerText");
const checkPopup = document.getElementById("checkPopup");
const difficultySelect = document.getElementById("difficulty");

const whiteCapturedDiv = document.getElementById("whiteCaptured");
const blackCapturedDiv = document.getElementById("blackCaptured");
const historyDiv = document.getElementById("history");

const restartBtn = document.getElementById("restartBtn");
const undoBtn = document.getElementById("undoBtn");

const whiteTimer = document.getElementById("whiteTimer");
const blackTimer = document.getElementById("blackTimer");

let whiteTime = 600;
let blackTime = 600;
let timerInterval = null;
let gameSnapshots = [];

let game = new Chess();
let selectedSquare = null;
let gameOver = false;
let possibleMoves = [];

let whiteCaptured = [];
let blackCaptured = [];

const pieces = {
    p: "black-pawn.png",
    r: "black-rook.png",
    n: "black-knight.png",
    b: "black-bishop.png",
    q: "black-queen.png",
    k: "black-king.png",
    P: "white-pawn.png",
    R: "white-rook.png",
    N: "white-knight.png",
    B: "white-bishop.png",
    Q: "white-queen.png",
    K: "white-king.png"
};

function saveGameState() {
    gameSnapshots.push({
        fen: game.fen(),
        historyHTML: historyDiv.innerHTML,
        whiteCaptured: [...whiteCaptured],
        blackCaptured: [...blackCaptured],
        whiteTime,
        blackTime,
        gameOver
    });
}
socket.on("receive_move", function (data) {
    game.load(data.fen);
    drawBoard();
});

function drawBoard() {
    board.innerHTML = "";
    const position = game.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement("div");
            square.classList.add("square");
            square.classList.add((row + col) % 2 === 0 ? "white" : "black");

            square.dataset.row = row;
            square.dataset.col = col;

            const pieceObj = position[row][col];

            if (pieceObj) {
                let pieceKey = pieceObj.color === "w"
                    ? pieceObj.type.toUpperCase()
                    : pieceObj.type.toLowerCase();

                const img = document.createElement("img");
                img.src = "/static/images/pieces/" + pieces[pieceKey];
                img.style.width = "52px";
                img.style.height = "52px";
                img.draggable = false;

                square.appendChild(img);
            }

            const squareName = getSquareName(row, col);

            if (selectedSquare === squareName) {
                square.classList.add("highlight");
            }

            if (possibleMoves.includes(squareName)) {
                square.classList.add("possible-move");
            }

            square.addEventListener("click", handleClick);
            board.appendChild(square);
        }
    }

    if (!gameOver) {
        turnText.textContent =
            "Turn: " + (game.turn() === "w" ? "White" : "Black");
    }
}

function formatTime(seconds) {
    let min = Math.floor(seconds / 60);
    let sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function updateTimerDisplay() {
    whiteTimer.textContent = "White: " + formatTime(whiteTime);
    blackTimer.textContent = "Black: " + formatTime(blackTime);
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (gameOver) {
            clearInterval(timerInterval);
            return;
        }

        if (game.turn() === "w") {
            whiteTime--;
            if (whiteTime <= 0) {
                whiteTime = 0;
                updateTimerDisplay();
                gameOver = true;
                showWinner("Black");
                return;
            }
        } else {
            blackTime--;
            if (blackTime <= 0) {
                blackTime = 0;
                updateTimerDisplay();
                gameOver = true;
                showWinner("White");
                return;
            }
        }

        updateTimerDisplay();
    }, 1000);
}

function getSquareName(row, col) {
    const files = ["a","b","c","d","e","f","g","h"];
    return files[col] + (8 - row);
}

function handleClick(e) {
    if (gameOver) return;

    const square = e.currentTarget;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const squareName = getSquareName(row, col);

    if (selectedSquare === null) {
        let piece = game.get(squareName);

        if (!piece) return;
if (piece.color !== game.turn()) return;

if (currentRoom && piece.color !== myColor) {
    return;
}

        selectedSquare = squareName;

        let moves = game.moves({
            square: squareName,
            verbose: true
        });

        possibleMoves = moves.map(move => move.to);
        drawBoard();
        return;
    }

    // IMPORTANT: move-ku munnaadi save
    saveGameState();

    const move = game.move({
        from: selectedSquare,
        to: squareName,
        promotion: "q"
    });

    selectedSquare = null;
    possibleMoves = [];

    if (move === null) {
        drawBoard();
        return;
    }

    playMoveSound();

    if (move.captured) {
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

    updateHistory(move.san);
    drawBoard();

    if (game.in_checkmate()) {
        gameOver = true;
        showWinner(game.turn() === "w" ? "Black" : "White");
    } else if (game.in_check()) {
        playCheckSound();
        showCheckPopup();
    }

    // Multiplayer OR AI
    if (currentRoom) {
        socket.emit("move", {
            room: currentRoom,
            fen: game.fen()
        });
    } else if (!gameOver && game.turn() === "b") {
        setTimeout(makeAIMove, 500);
    }
}

function updateCaptured() {
    whiteCapturedDiv.innerHTML = "";
    blackCapturedDiv.innerHTML = "";

    whiteCaptured.forEach(piece => {
        const img = document.createElement("img");
        img.src = "/static/images/pieces/" + piece;
        img.style.width = "28px";
        img.style.height = "28px";
        img.style.margin = "2px";
        whiteCapturedDiv.appendChild(img);
    });

    blackCaptured.forEach(piece => {
        const img = document.createElement("img");
        img.src = "/static/images/pieces/" + piece;
        img.style.width = "28px";
        img.style.height = "28px";
        img.style.margin = "2px";
        blackCapturedDiv.appendChild(img);
    });
}

function updateHistory(moveText) {
    const moveLine = document.createElement("div");
    moveLine.textContent = moveText;
    historyDiv.appendChild(moveLine);
}

function showCheckPopup() {
    checkPopup.classList.remove("hidden");
    setTimeout(() => {
        checkPopup.classList.add("hidden");
    }, 1000);
}

function showWinner(winner) {
    playWinSound();
    winnerText.textContent = winner + " Wins! 🏆";
    winnerPopup.classList.remove("hidden");
    turnText.textContent = "Game Over";
}

undoBtn.addEventListener("click", function () {
    if (gameSnapshots.length === 0) return;

    let previousState = gameSnapshots.pop();

    game.load(previousState.fen);

    whiteCaptured = [...previousState.whiteCaptured];
    blackCaptured = [...previousState.blackCaptured];
    whiteTime = previousState.whiteTime;
    blackTime = previousState.blackTime;
    gameOver = previousState.gameOver;

    historyDiv.innerHTML = previousState.historyHTML;

    selectedSquare = null;
    possibleMoves = [];

    winnerPopup.classList.add("hidden");

    updateCaptured();
    updateTimerDisplay();
    drawBoard();
    startTimer();
});

restartBtn.addEventListener("click", function () {
    game = new Chess();
    selectedSquare = null;
    gameOver = false;
    possibleMoves = [];
    gameSnapshots = [];

    whiteCaptured = [];
    blackCaptured = [];

    whiteTime = 600;
    blackTime = 600;

    whiteCapturedDiv.innerHTML = "";
    blackCapturedDiv.innerHTML = "";
    historyDiv.innerHTML = "";

    winnerPopup.classList.add("hidden");

    

    updateTimerDisplay();
    startTimer();
    drawBoard();
});

createRoomBtn.addEventListener("click", function () {
    let roomCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    currentRoom = roomCode;
    difficultySelect.style.display = "none";
    roomInput.value = roomCode;

    socket.emit("join_room", {
        room: roomCode
    });

    roomStatus.textContent = "Room Created: " + roomCode;
});

joinRoomBtn.addEventListener("click", function () {
    let roomCode = roomInput.value.trim();

    if (!roomCode) {
        alert("Enter room code");
        return;
    }

    currentRoom = roomCode;

    socket.emit("join_room", {
        room: roomCode
    });

    roomStatus.textContent = "Joined Room: " + roomCode;
});

socket.on("player_joined", function (data) {
    roomStatus.textContent = data.message;
});
socket.on("assign_color", function(data) {
    myColor = data.color;

    if (myColor === "w") {
        roomStatus.textContent += " | You are WHITE";
    } else {
        roomStatus.textContent += " | You are BLACK";
    }
});



drawBoard();
updateTimerDisplay();
startTimer();