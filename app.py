from flask import Flask, render_template, request, redirect, url_for, session
from flask_socketio import SocketIO, emit, join_room
import sqlite3

app = Flask(__name__)
app.secret_key = "mysecretkey"

socketio = SocketIO(app)

# Room player count store panna
rooms = {}


def init_db():
    conn = sqlite3.connect("database/players.db")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            score INTEGER DEFAULT 1000
        )
    """)

    conn.commit()
    conn.close()


@app.route("/")
def home():
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        action = request.form["action"]

        conn = sqlite3.connect("database/players.db")
        cursor = conn.cursor()

        if action == "signup":
            cursor.execute(
                "SELECT * FROM players WHERE username=?",
                (username,)
            )
            user = cursor.fetchone()

            if user:
                conn.close()
                return "Username already exists!"

            cursor.execute(
                "INSERT INTO players (username, password) VALUES (?, ?)",
                (username, password)
            )

            conn.commit()
            conn.close()

            session["username"] = username
            return redirect(url_for("game"))

        elif action == "login":
            cursor.execute(
                "SELECT * FROM players WHERE username=? AND password=?",
                (username, password)
            )
            user = cursor.fetchone()
            conn.close()

            if user:
                session["username"] = username
                return redirect(url_for("game"))
            else:
                return "Invalid username or password!"

    return render_template("login.html")


@app.route("/game")
def game():
    return render_template("index.html")


@app.route("/profile")
def profile():
    username = session.get("username", "Guest")

    return render_template(
        "profile.html",
        username=username,
        score=1000,
        wins=0,
        losses=0
    )


# ---------------- SOCKET EVENTS ---------------- #

@socketio.on("connect")
def handle_connect():
    print("User connected")


@socketio.on("join_room")
def handle_join_room(data):
    room = data["room"]
    join_room(room)

    if room not in rooms:
        rooms[room] = 0

    rooms[room] += 1

    print(f"Player joined room: {room}")

    if rooms[room] == 1:
        emit("assign_color", {"color": "w"})

    elif rooms[room] == 2:
        emit("assign_color", {"color": "b"})
        emit("player_joined", {
            "message": "Opponent joined!"
        }, room=room)


@socketio.on("move")
def handle_move(data):
    room = data["room"]
    fen = data["fen"]

    emit("receive_move", {
        "fen": fen
    }, room=room, include_self=False)


# ---------------- RUN APP ---------------- #

if __name__ == "__main__":
    init_db()
    socketio.run(app, debug=True)