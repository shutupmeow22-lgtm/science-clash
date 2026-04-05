import React from 'react';
import { useGame } from '../GameContext';

const TEAM_ICONS = ['🐺','🦁','🐯','🦊','🐻','🐼','🦄','🐲','🦅','🦋'];

export default function StudentLobby() {
  const { state } = useGame();
  const { teamName, roomCode, teamList } = state;

  return (
    <div className="lobby-screen student-lobby">
      <div className="lobby-header">
        <h2>⚔️ {teamName}</h2>
        <p>Room <strong>{roomCode}</strong> — Waiting for teacher to start...</p>
      </div>

      <div className="waiting-animation">
        <span>🏰</span>
        <div className="waiting-dots"><span/><span/><span/></div>
        <span>👹</span>
      </div>

      <div className="lobby-teams">
        <h3>Teams in the Arena ({teamList.length})</h3>
        <div className="team-grid">
          {teamList.map((name, i) => (
            <div key={name} className={`team-card lobby-card ${name === teamName ? 'my-team' : ''}`}>
              <span className="team-icon">{TEAM_ICONS[i % TEAM_ICONS.length]}</span>
              <span className="team-name">{name} {name === teamName && '(You)'}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="lobby-tip">💡 Get ready! Correct answers earn coins to spawn monsters!</p>
    </div>
  );
}
