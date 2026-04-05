import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function TeacherResults() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const result = state.gameResult;

  function playAgain() {
    dispatch({ type: 'RESET' });
    navigate('/teacher');
  }

  if (!result) return <div className="loading">Loading results...</div>;

  const { winner, leaderboard, bossDefeated, bossHP, bossMaxHP, reason } = result;

  return (
    <div className="results-screen">
      <div className="results-header">
        {bossDefeated ? (
          <div className="boss-defeated-banner">
            <span>💥</span>
            <h1>BOSS DEFEATED!</h1>
            <p>The Science Overlord has been vanquished!</p>
          </div>
        ) : (
          <div className="boss-survived-banner">
            <span>👹</span>
            <h1>The Boss Survived</h1>
            <p>Boss had {bossHP} / {bossMaxHP} HP remaining</p>
          </div>
        )}
      </div>

      {winner && (
        <div className="winner-banner">
          <span>🏆</span>
          <h2>{winner} WINS!</h2>
          <p>Most damage dealt to the boss</p>
        </div>
      )}

      <div className="results-table">
        <h3>📊 Final Standings</h3>
        <div className="results-list">
          {leaderboard.map((team, i) => (
            <div key={team.name} className={`result-row ${team.eliminated?'eliminated':''}`}>
              <span className="result-rank">{MEDALS[i] || `#${i+1}`}</span>
              <div className="result-info">
                <span className="result-name">{team.name}</span>
                <div className="result-stats">
                  <span>⚔️ {team.totalDamage} dmg</span>
                  <span>🏰 {team.eliminated ? '💀 Eliminated' : `${team.hp} HP`}</span>
                  <span>🎯 {team.accuracy}% accuracy</span>
                  <span>✅ {team.correctCount} / {team.totalAnswered}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="results-end-reason">
        {reason === 'boss-defeated' && '👹 The boss was defeated by your students!'}
        {reason === 'manual' && '🏁 Game ended by teacher'}
        {reason === 'all-eliminated' && '💀 All teams were eliminated!'}
      </div>

      <button className="btn btn-start big-btn" onClick={playAgain}>
        🔄 Play Again
      </button>
    </div>
  );
}
