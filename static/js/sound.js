console.log("sound.js loaded");

const moveSound = new Audio("/static/sounds/move.mp3");
const captureSound = new Audio("/static/sounds/capture.mp3");
const checkSound = new Audio("/static/sounds/check.mp3");
const winSound = new Audio("/static/sounds/win.mp3");

function playMoveSound() {
    moveSound.currentTime = 0;
    moveSound.play();
}

function playCaptureSound() {
    captureSound.currentTime = 0;
    captureSound.play();
}

function playCheckSound() {
    checkSound.currentTime = 0;
    checkSound.play();
}

function playWinSound() {
    winSound.currentTime = 0;
    winSound.play();
}