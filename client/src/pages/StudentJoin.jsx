import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import socket from '../socket';

export default function StudentJoin() {
  const { dispatch } = useGame();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [joining,  setJoining]  = useState(false);
  const [error,    setError]    = useState('');

  function handleJoin(e) {
    e.preventDefault();
    if (!roomCode.trim() || !teamName.trim()) return;
    setJoining(true);
    setError('');
    socket.emit('join-room', { roomCode: roomCode.trim(), teamName: teamName.trim() }, (res) => {
      setJoining(false);
      if (!res.success) { setError(res.error || 'Could not join room'); return; }
      dispatch({ type: 'JOIN_LOBBY', roomCode: roomCode.trim(), teamName: teamName.trim() });
      navigate('/student/lobby');
    });
  }

  return (
    <div className="join-screen">
      <div className="join-card">
        <h2>⚔️ Join the Battle</h2>
        <form onSubmit={handleJoin}>
          <label>
            <span>Room Code</span>
            <input
              type="text"
              placeholder="6-digit code"
              maxLength={6}
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.replace(/\D/g,''))}
              autoFocus
            />
          </label>
          <label>
            <span>Team Name</span>
            <input
              type="text"
              placeholder="Your epic team name"
              maxLength={20}
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
            />
          </label>
          {error && <div className="join-error">❌ {error}</div>}
          <button type="submit" className="btn btn-start big-btn" disabled={joining || !roomCode || !teamName}>
            {joining ? '⏳ Joining...' : '⚔️ Enter the Arena!'}
          </button>
        </form>
        <p className="join-hint">Get the room code from your teacher</p>
      </div>
    </div>
  );
}
