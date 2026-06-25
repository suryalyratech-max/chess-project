const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let flaskProcess;
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        icon: path.join(__dirname, "icon.ico"),
        title: "Surya Chess"
    });

    mainWindow.loadURL("http://127.0.0.1:5000");
}

app.whenReady().then(() => {
    flaskProcess = spawn("py", ["app.py"], {
        cwd: __dirname,
        shell: true
    });

    flaskProcess.stdout.on("data", (data) => {
        console.log(`Flask: ${data}`);
    });

    flaskProcess.stderr.on("data", (data) => {
        console.error(`Error: ${data}`);
    });

    setTimeout(() => {
        createWindow();
    }, 5000);
});

app.on("window-all-closed", () => {
    if (flaskProcess) flaskProcess.kill();
    app.quit();
});