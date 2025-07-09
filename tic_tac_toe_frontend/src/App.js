import React, { useState, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";

/**
 * Utility to fetch backend URL (assumes same host:5000 for dev)
 */
const getBackendUrl = () => {
  // Change to env or config as needed for prod/deploy
  return "http://localhost:8000";
};

// PUBLIC_INTERFACE
function App() {
  // Theming (retained from template)
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // UI and game state
  const [username, setUsername] = useState("");
  const [userSubmitted, setUserSubmitted] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [player, setPlayer] = useState(""); // 'X' or 'O'
  const [opponent, setOpponent] = useState(""); // when filled
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState(null); // 'X' or 'O'
  const [winner, setWinner] = useState(null); // null, "X", "O", "Draw"
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);

  // Used for polling real-time game state
  useEffect(() => {
    let interval;
    if (userSubmitted && gameId) {
      interval = setInterval(fetchGameState, 1500);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [userSubmitted, gameId]);

  // Fetch user's previous game history once logged in
  useEffect(() => {
    if (userSubmitted && username) {
      fetchHistory();
    }
    // eslint-disable-next-line
  }, [userSubmitted, username]);

  // --- API Helpers ---
  // PUBLIC_INTERFACE
  async function startNewGame() {
    resetUI();
    try {
      // Ask backend to start a new game as this username
      // This API should return: {game_id, player ('X' or 'O'), initial_board, turn}
      const resp = await fetch(`${getBackendUrl()}/start_game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setGameId(data.game_id);
        setPlayer(data.player);
        setOpponent("");
        setBoard(data.board);
        setTurn(data.turn);
        setWinner(null);
        setMessage(
          `Game started! You are "${data.player}". Waiting for second player...`
        );
      } else {
        setMessage("Failed to start game. Please try again.");
      }
    } catch (err) {
      setMessage("Error starting game. Backend unavailable?");
    }
  }

  // PUBLIC_INTERFACE
  async function joinGame(gameIdToJoin) {
    resetUI();
    try {
      const resp = await fetch(`${getBackendUrl()}/join_game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, game_id: gameIdToJoin }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setGameId(data.game_id);
        setPlayer(data.player);
        setOpponent(data.opponent);
        setBoard(data.board);
        setTurn(data.turn);
        setWinner(null);
        setMessage(`Joined game! You are "${data.player}"`);
      } else if (resp.status === 409) {
        setMessage("Game full or already started.");
      } else {
        setMessage("Failed to join game.");
      }
    } catch {
      setMessage("Error joining game.");
    }
  }

  // PUBLIC_INTERFACE
  async function makeMove(idx) {
    if (winner) return;
    if (turn !== player) {
      setMessage("Not your turn.");
      return;
    }
    if (board[idx] !== null) {
      setMessage("Cell already occupied.");
      return;
    }
    try {
      const resp = await fetch(`${getBackendUrl()}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          game_id: gameId,
          player,
          move: idx,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setBoard(data.board);
        setTurn(data.turn);
        setWinner(data.winner);
        setOpponent(data.opponent || opponent);
        setMessage(""); // clear on move
      } else {
        const err = await resp.text();
        setMessage(err);
      }
    } catch {
      setMessage("Failed to make move.");
    }
  }

  // PUBLIC_INTERFACE
  async function fetchGameState() {
    if (!gameId) return;
    try {
      const resp = await fetch(
        `${getBackendUrl()}/game_state?game_id=${gameId}&username=${username}`
      );
      if (resp.ok) {
        const data = await resp.json();
        setBoard(data.board);
        setTurn(data.turn);
        setWinner(data.winner);
        setOpponent(data.opponent || opponent);
      }
    } catch {
      // ignore polling errors for now
    }
  }

  // PUBLIC_INTERFACE
  async function fetchHistory() {
    try {
      const resp = await fetch(
        `${getBackendUrl()}/history?username=${username}`
      );
      if (resp.ok) {
        setHistory(await resp.json());
      }
    } catch {
      setHistory([]);
    }
  }

  // UI helpers
  function resetUI() {
    setGameId(null);
    setPlayer("");
    setOpponent("");
    setBoard(Array(9).fill(null));
    setTurn(null);
    setWinner(null);
    setMessage("");
  }

  // PUBLIC_INTERFACE
  function handleLoginSubmit(e) {
    e.preventDefault();
    if (username.trim()) {
      setUserSubmitted(true);
      setMessage("");
    }
  }

  // PUBLIC_INTERFACE
  function handleHistoryClick(hist) {
    // Show completed game state for the selected history (read only)
    setBoard(hist.board);
    setTurn(null);
    setWinner(hist.winner);
    setGameId(null);
    setOpponent(hist.opponent || "");
    setMessage(
      `Game [${hist.id}] result: ${
        hist.winner === "Draw" ? "Draw" : `${hist.winner} wins`
      }`
    );
  }

  // Render
  // Login/prompt
  if (!userSubmitted) {
    return (
      <div className="App">
        <header className="App-header">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <img src={logo} className="App-logo" alt="logo" style={{ width: 96, height: 96, marginBottom: 24 }} />
          <div style={{ maxWidth: 340, padding: 20, margin: "0 auto", background: "var(--bg-secondary)", borderRadius: 16, boxShadow: "0 2px 8px #0001" }}>
            <h2>Welcome to Tic Tac Toe</h2>
            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="text"
                required
                maxLength={20}
                autoFocus
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                  fontSize: 18,
                  outline: "none",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "var(--button-bg)",
                  color: "var(--button-text)",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 0",
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: "pointer",
                  transition: "opacity .2s",
                }}
              >
                Enter
              </button>
            </form>
          </div>
          <div style={{ margin: "16px", fontSize: "14px", color: "#e74c3c" }}>{message}</div>
        </header>
      </div>
    );
  }

  // Main Game + History
  return (
    <div className="App">
      <header className="App-header" style={{ minHeight: "100vh", flexDirection: "row", alignItems: "flex-start", justifyContent: "center" }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <div className="container" style={{
          padding: 32,
          background: "var(--bg-secondary)",
          borderRadius: 18,
          boxShadow: "0 4px 16px #0001",
          width: 400,
          marginTop: 40,
          marginBottom: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 4 }}>Tic Tac Toe</div>
          <div style={{ color: "var(--text-secondary)", marginBottom: 8 }}>Hello, <strong>{username}</strong></div>
          {/* Game buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button onClick={startNewGame}
              disabled={gameId && !winner}
              className="btn"
              style={gameId && !winner ?
                { background: "#ccc", cursor: "not-allowed", color: "#666", borderRadius: 8, fontWeight: 600, padding: "8px 20px", border: 0 }
                :
                { background: "var(--button-bg)", color: "var(--button-text)", borderRadius: 8, fontWeight: 600, padding: "8px 20px", border: 0, cursor: "pointer" }
              }
              >Start New Game</button>
          </div>
          {/* Opponent/turn info */}
          {(gameId || winner) && (
            <div style={{
              marginBottom: 10,
            }}>
              <span>Your symbol: <span style={{ fontWeight: 700 }}>{player}</span></span>
              <br />
              {opponent && <span>Opponent: <span style={{ fontWeight: 700 }}>{opponent}</span></span>}
              <br />
              {winner
                ? <span style={{ color: "#43a047" }}>
                  {winner === "Draw" ? "It's a draw!" :
                    winner === player ? "You win! 🏆" :
                      winner === opponent ? "Opponent wins." : `${winner} wins.`}
                </span>
                : <span style={{
                  color: turn === player ? "#E87A41" : "#1976d2",
                  fontWeight: 600
                }}>
                  {turn ? ("Turn: " + (turn === player ? "Your move" : (opponent ? opponent : "Opponent") + "'s move")) : "Waiting for player..."}
                </span>
              }
            </div>
          )}

          {/* The Game Board */}
          <Board
            board={board}
            winner={winner}
            onMove={makeMove}
            isTurn={turn === player && !!gameId && !winner}
            disabled={!gameId || !!winner || !opponent}
          />

          {/* Game Footer UI */}
          {(gameId || winner) &&
            <div style={{ marginTop: 16, fontSize: 14 }}>
              <span>Game ID: <span style={{ fontFamily: "monospace" }}>{gameId || "—"}</span></span>
              {opponent && <span>&nbsp;&nbsp;Opponent: <b>{opponent}</b></span>}
            </div>
          }

          <div style={{ marginTop: 16, minHeight: 28, color: "#e74c3c", fontWeight: 500 }}>
            {message}
          </div>
        </div>

        {/* Sidebar/History */}
        <aside style={{
          marginLeft: 40,
          minWidth: 240,
          maxWidth: 300,
          background: "var(--bg-secondary)",
          borderRadius: 16,
          boxShadow: "0 2px 8px #0001",
          padding: 24,
          marginTop: 40,
          minHeight: "420px",
        }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16, letterSpacing: 0.5, color: "#1976d2" }}>Your Game History</div>
          {history && history.length > 0
            ? (
              <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                {history.map((hist) => (
                  <li key={hist.id}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}>
                    <button
                      style={{
                        background: "var(--button-bg)",
                        color: "var(--button-text)",
                        fontSize: 14,
                        border: "none",
                        borderRadius: 10,
                        padding: "4px 10px",
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                      onClick={() => handleHistoryClick(hist)}>View</button>
                    <span style={{ fontFamily: "monospace", minWidth: 24 }}>{hist.id}</span>
                    <span style={{
                      color: (hist.winner === "Draw" ? "#888" : (hist.winner === username ? "#43a047" : "#e74c3c")),
                      fontWeight: 600,
                    }}>
                      {hist.winner === "Draw"
                        ? "Draw"
                        : (hist.winner === "X" || hist.winner === "O" ? hist.winner + " wins" : hist.winner)}
                    </span>
                  </li>
                ))}
              </ul>
            )
            : <div style={{ fontSize: 15, color: "#777" }}>No games yet.</div>
          }
        </aside>
      </header>
    </div>
  );
}

/**
 * Minimal, modern tic tac toe board.
 * @param {object} props
 */
function Board({ board, winner, onMove, isTurn, disabled }) {
  // Tiles indexed row-wise 0-8
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 64px)",
        gridTemplateRows: "repeat(3, 64px)",
        gap: "8px",
        justifyContent: "center",
        alignContent: "center",
        margin: "18px 0",
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 2px 8px #0002",
        maxWidth: 208,
      }}
    >
      {board.map((val, idx) => (
        <Square
          key={idx}
          value={val}
          onClick={() => (isTurn && !val && !disabled ? onMove(idx) : undefined)}
          highlight={winner && val && winner !== "Draw" && val === winner}
          disabled={!!val || !!winner || disabled}
        />
      ))}
    </div>
  );
}

/**
 * Single cell of the board.
 */
function Square({ value, onClick, highlight, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 64,
        height: 64,
        fontSize: 36,
        fontWeight: 800,
        border: "2px solid var(--border-color)",
        borderRadius: 12,
        background: highlight
          ? "linear-gradient(135deg,#E87A41 70%,#43a047 130%)"
          : "var(--bg-primary)",
        color: highlight ? "#fff" : "var(--text-primary)",
        outline: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow:
          highlight && !disabled
            ? "0 0 8px 2px #E87A41"
            : disabled
            ? "none"
            : "0 2px 8px #0001",
        transition: "background .15s, color .15s, box-shadow .2s",
      }}
      aria-label={value ? `Cell ${value}` : "empty cell"}
    >
      {value || ""}
    </button>
  );
}

export default App;
