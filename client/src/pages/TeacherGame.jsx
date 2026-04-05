import React, { useState } from 'react';
import { useGame } from '../GameContext';
import socket from '../socket';
import HPBar from '../components/HPBar';

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function TeacherGame() {
  const { state } = useGame();
  const {
    boss, question, correctAnswer, questionPhase,
    answeredCount, totalTeams, allAnswered,
    revealData, totalQuestions, isLastQuestion, paused,
  } = state;

  const [pausing, setPausing] = useState(false);

  // Build sorted leaderboard from teams
  const leaderboard = Object.entries(state.teams)
    .map(([name, t]) => ({ name, ...t }))
    .sort((a, b) => b.totalDamage - a.totalDamage);

  function launchQuestion() { socket.emit('launch-question'); }
  function revealResults()  { socket.emit('reveal-results'); }
  function endGame()        { if (window.confirm('End the game now?')) socket.emit('end-game'); }
  function togglePause()    {
    socket.emit(paused ? 'resume-game' : 'pause-game');
    setPausing(false);
  }

  const qIndex = question ? question.index + 1 : 0;

  return (
    <div className="teacher-game">
      {/* Top bar */}
      <div className="teacher-topbar">
        <div className="topbar-item">
          <span>Room</span>
          <strong>{state.roomCode}</strong>
        </div>
        <div className="topbar-item boss-hp-top">
          <span>👹 {boss.name}</span>
          <HPBar current={boss.currentHP} max={boss.maxHP} color="red" />
          <span className="hp-text">{boss.currentHP} / {boss.maxHP}</span>
        </div>
        <div className="topbar-item">
          <span>Questions</span>
          <strong>{qIndex} / {totalQuestions}</strong>
        </div>
      </div>

      <div className="teacher-body">
        {/* Leaderboard */}
        <aside className="teacher-leaderboard">
          <h3>📊 Standings</h3>
          {leaderboard.map((t, i) => (
            <div key={t.name} className={`lb-row ${t.eliminated?'eliminated':''}`}>
              <span className="lb-rank">{RANK_MEDALS[i] || `#${i+1}`}</span>
              <span className="lb-name">{t.name}</span>
              <div className="lb-details">
                <span className="lb-dmg">⚔️ {t.totalDamage}</span>
                <div className="lb-castle-bar">
                  <div style={{ width: `${Math.max(0,(t.hp / t.maxHP) * 100)}%` }} />
                </div>
                <span className="lb-hp">{t.eliminated ? '💀' : `🏰 ${t.hp}`}</span>
              </div>
            </div>
          ))}
        </aside>

        {/* Main controls */}
        <main className="teacher-controls">
          {paused && (
            <div className="paused-banner">⏸ GAME PAUSED</div>
          )}

          {/* Question area */}
          <div className="teacher-question-card">
            {questionPhase === 'waiting' && (
              <div className="q-waiting">
                <span>❓</span>
                <p>Ready to launch the next question</p>
                {isLastQuestion && <p className="last-q-note">All questions revealed — end the game or keep going</p>}
              </div>
            )}

            {questionPhase === 'active' && question && (
              <>
                <div className="q-badge">Q{qIndex} of {totalQuestions}</div>
                <h3 className="q-text">{question.text}</h3>
                <div className="q-options teacher-opts">
                  {Object.entries(question.options).map(([key, val]) => (
                    <div key={key} className={`q-option teacher-opt ${correctAnswer === key ? 'correct' : ''}`}>
                      <span className="opt-key">{key}</span>
                      <span>{val}</span>
                      {correctAnswer === key && <span className="opt-check">✅</span>}
                    </div>
                  ))}
                </div>
                {correctAnswer && (
                  <div className="correct-answer-label">
                    ✅ Correct Answer: <strong>{correctAnswer}</strong>
                  </div>
                )}
                <div className="answered-count">
                  {answeredCount} / {totalTeams} teams answered
                  {allAnswered && <span className="all-answered"> — All answered!</span>}
                </div>
              </>
            )}

            {questionPhase === 'revealed' && revealData && (
              <div className="reveal-summary">
                <h3>Results Revealed</h3>
                <p>Correct answer: <strong>{revealData.correct}</strong></p>
                <div className="reveal-results">
                  {Object.entries(revealData.results).map(([name, r]) => (
                    <div key={name} className={`reveal-row result-${r.result}`}>
                      <span>{name}</span>
                      <span>
                        {r.result === 'correct'  && `✅ +${r.coins} coins`}
                        {r.result === 'wrong'    && `❌ -${r.castleDamage} castle`}
                        {r.result === 'timeout'  && `⏱ -${r.castleDamage} castle`}
                        {r.result === 'eliminated' && '💀 Eliminated'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="teacher-action-btns">
            {questionPhase === 'waiting' && (
              <button className="btn btn-launch" onClick={launchQuestion} disabled={paused}>
                ❓ Launch Question
              </button>
            )}
            {questionPhase === 'active' && (
              <button className="btn btn-reveal" onClick={revealResults} disabled={paused}>
                👁 Reveal Results
              </button>
            )}
            {questionPhase === 'revealed' && (
              <button className="btn btn-launch" onClick={launchQuestion} disabled={paused || isLastQuestion}>
                ➡ Next Question
              </button>
            )}

            <button className={`btn ${paused ? 'btn-resume' : 'btn-pause'}`} onClick={togglePause}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>

            <button className="btn btn-danger" onClick={endGame}>
              🏁 End Game
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
