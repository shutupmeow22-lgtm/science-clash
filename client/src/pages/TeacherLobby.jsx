import React from 'react';
import { useGame } from '../GameContext';
import socket from '../socket';

const TEAM_ICONS = ['🐺','🦁','🐯','🦊','🐻','🐼','🦄','🐲','🦅','🦋'];

export default function TeacherLobby() {
  const { state } = useGame();
  const { roomCode, teamList } = state;

  function startGame() {
    socket.emit('start-game');
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-header">
        <h2>Waiting for teams...</h2>
        <div className="room-code-box">
          <p>Room Code</p>
          <div className="room-code">{roomCode}</div>
          <p className="room-code-hint">Share this code with your students</p>
        </div>
      </div>

      <div className="lobby-teams">
        <h3>Teams Joined ({teamList.length})</h3>
        {teamList.length === 0 ? (
          <div className="empty-lobby">
            <span>⏳</span>
            <p>No teams yet — waiting for students to join...</p>
          </div>
        ) : (
          <div className="team-grid">
            {teamList.map((name, i) => (
              <div key={name} className="team-card lobby-card">
                <span className="team-icon">{TEAM_ICONS[i % TEAM_ICONS.length]}</span>
                <span className="team-name">{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="btn btn-start big-btn"
        disabled={teamList.length === 0}
        onClick={startGame}>
        ▶ Start Game ({teamList.length} teams)
      </button>
    </div>
  );
}
