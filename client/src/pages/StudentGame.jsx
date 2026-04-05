import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../GameContext';
import socket from '../socket';
import HPBar from '../components/HPBar';
import Shop from '../components/Shop';
import Battlefield from '../components/Battlefield';

export default function StudentGame() {
  const { state } = useGame();
  const {
    boss, question, questionPhase, myResult, myHP, myMaxHP,
    coins, eliminated, settings, paused,
  } = state;

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted,      setSubmitted]      = useState(false);
  const [timeLeft,       setTimeLeft]       = useState(0);
  const [flash,          setFlash]          = useState('');
  const [showShop,       setShowShop]       = useState(false);
  const timerRef = useRef(null);

  // Reset answer state when new question comes
  useEffect(() => {
    if (questionPhase === 'active') {
      setSelectedAnswer(null);
      setSubmitted(false);
      setFlash('');
      if (question) {
        const end = question.startTime + question.timer * 1000;
        startTimer(end);
      }
    }
    if (questionPhase === 'waiting') {
      clearInterval(timerRef.current);
      setTimeLeft(0);
    }
  }, [questionPhase, question]);

  // Flash when result revealed
  useEffect(() => {
    if (!myResult) return;
    clearInterval(timerRef.current);
    setFlash(myResult.result);
    const t = setTimeout(() => setFlash(''), 2000);
    return () => clearTimeout(t);
  }, [myResult]);

  function startTimer(endTime) {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) clearInterval(timerRef.current);
    }, 100);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  function selectAnswer(opt) {
    if (submitted || questionPhase !== 'active' || eliminated) return;
    setSelectedAnswer(opt);
    setSubmitted(true);
    socket.emit('submit-answer', opt);
  }

  const hpPct = myMaxHP > 0 ? (myHP / myMaxHP) * 100 : 0;
  const timerPct = question ? (timeLeft / question.timer) * 100 : 0;
  const timerColor = timerPct > 50 ? '#4ade80' : timerPct > 25 ? '#facc15' : '#ef4444';

  return (
    <div className={`student-game ${flash ? `flash-${flash}` : ''} ${paused ? 'paused' : ''}`}>
      {paused && <div className="paused-overlay">⏸ Game Paused</div>}

      {/* Boss HP */}
      <div className="boss-bar-strip">
        <span className="boss-label">👹 {boss.name}</span>
        <HPBar current={boss.currentHP} max={boss.maxHP} color="red" />
        <span className="boss-hp-num">{boss.currentHP.toLocaleString()} HP</span>
      </div>

      {/* Battlefield */}
      <Battlefield units={state.units} teamName={state.teamName} />

      {/* Castle + Coins */}
      <div className="castle-row">
        <div className={`castle-display ${hpPct < 30 ? 'crumbling' : hpPct < 60 ? 'damaged' : ''}`}>
          <div className="castle-icon">
            {hpPct >= 60 ? '🏰' : hpPct >= 30 ? '🏯' : '🪨'}
          </div>
          <HPBar current={myHP} max={myMaxHP} color="blue" />
          <span className="castle-hp">{myHP} HP</span>
        </div>
        <div className="coin-display">
          <span className="coin-icon">🪙</span>
          <span className="coin-amount">{coins}</span>
          <button className="btn btn-shop" onClick={() => setShowShop(true)}>
            🛒 Shop
          </button>
        </div>
      </div>

      {/* Question box */}
      <div className="question-box">
        {eliminated && (
          <div className="eliminated-msg">
            <span>💀</span>
            <h3>Your castle fell!</h3>
            <p>You've been eliminated but you can still watch the battle</p>
          </div>
        )}

        {!eliminated && questionPhase === 'waiting' && (
          <div className="waiting-msg">
            <span>⏳</span>
            <p>Waiting for the next question...</p>
            <p className="small">Use the Shop to spend your coins!</p>
          </div>
        )}

        {!eliminated && questionPhase === 'active' && question && (
          <>
            {/* Timer */}
            <div className="timer-bar-wrap">
              <div className="timer-bar" style={{ width:`${timerPct}%`, background:timerColor }} />
            </div>
            <div className="timer-number" style={{ color: timerColor }}>
              {timeLeft}s
            </div>

            <div className="q-badge">Q{question.index + 1} of {question.total}</div>
            <p className="q-text">{question.text}</p>

            <div className="answer-grid">
              {Object.entries(question.options).map(([key, val]) => (
                <button
                  key={key}
                  className={`answer-btn
                    ${selectedAnswer === key ? 'selected' : ''}
                    ${submitted && selectedAnswer !== key ? 'dim' : ''}
                    ${submitted ? 'locked' : ''}`}
                  onClick={() => selectAnswer(key)}
                  disabled={submitted || paused}>
                  <span className="answer-key">{key}</span>
                  <span className="answer-val">{val}</span>
                </button>
              ))}
            </div>

            {submitted && !myResult && (
              <div className="submitted-msg">✅ Answer submitted! Waiting for reveal...</div>
            )}
          </>
        )}

        {questionPhase === 'revealed' && myResult && (
          <div className={`result-feedback result-${myResult.result}`}>
            {myResult.result === 'correct' && (
              <>
                <span className="result-icon">✅</span>
                <h3>Correct!</h3>
                <p>+{myResult.coins} coins earned</p>
              </>
            )}
            {myResult.result === 'wrong' && (
              <>
                <span className="result-icon">❌</span>
                <h3>Wrong Answer!</h3>
                <p>🏰 Castle took {myResult.castleDamage} damage</p>
              </>
            )}
            {myResult.result === 'timeout' && (
              <>
                <span className="result-icon">⏱</span>
                <h3>Time's Up!</h3>
                <p>🏰 Castle took {myResult.castleDamage} damage</p>
              </>
            )}
            <p className="small">Spend your coins in the shop!</p>
          </div>
        )}
      </div>

      {/* Shop modal */}
      {showShop && <Shop coins={coins} onClose={() => setShowShop(false)} />}
    </div>
  );
}
