import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function StudentResults() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const result = state.gameResult;

  function playAgain() {
    dispatch({ type: 'RESET' });
    navigate('/student');
  }

  if (!result) return <div className="loading">Loading results...</div>;

  const myRank = result.leaderboard.findIndex(t => t.name === state.teamName);
  const myStats = result.leaderboard[myRank];

  return (
    <div className="results-screen student-results">
      {/* Boss outcome */}
      <div className={`boss-outcome ${result.bossDefeated ? 'defeated' : 'survived'}`}>
        {result.bossDefeated
          ? <><span>💥</span><h1>BOSS DEFEATED!</h1></>
          : <><span>👹</span><h1>The Boss Survived...</h1></>
        }
      </div>

      {/* Personal result */}
      {myStats && (
        <div className="my-result-card">
          <div className="my-rank">{MEDALS[myRank] || `#${myRank + 1}`}</div>
          <h2>{state.teamName}</h2>
          <div className="my-stats">
            <div className="stat"><span>⚔️</span><strong>{myStats.totalDamage}</strong><small>Damage</small></div>
            <div className="stat"><span>🎯</span><strong>{myStats.accuracy}%</strong><small>Accuracy</small></div>
            <div className="stat"><span>✅</span><strong>{myStats.correctCount}/{myStats.totalAnswered}</strong><small>Correct</small></div>
            <div className="stat"><span>🏰</span><strong>{myStats.eliminated ? '💀' : `${myStats.hp} HP`}</strong><small>Castle</small></div>
          </div>
        </div>
      )}

      {/* Winner */}
      {result.winner && (
        <div className="winner-banner">
          🏆 <strong>{result.winner}</strong> wins with the most damage!
        </div>
      )}

      {/* Full leaderboard */}
      <div className="final-leaderboard">
        <h3>Final Standings</h3>
        {result.leaderboard.map((team, i) => (
          <div key={team.name}
            className={`lb-final-row ${team.name === state.teamName ? 'mine' : ''} ${team.eliminated ? 'elim' : ''}`}>
            <span>{MEDALS[i] || `#${i+1}`}</span>
            <span className="lb-name">{team.name}</span>
            <span>⚔️ {team.totalDamage}</span>
            <span>🎯 {team.accuracy}%</span>
          </div>
        ))}
      </div>

      <button className="btn btn-start big-btn" onClick={playAgain}>
        ⚔️ Play Again
      </button>
    </div>
  );
}
