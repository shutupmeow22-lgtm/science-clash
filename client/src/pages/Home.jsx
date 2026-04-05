import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';

export default function Home() {
  const { dispatch } = useGame();
  const navigate = useNavigate();

  function goTeacher() {
    dispatch({ type: 'SET_ROLE', role: 'teacher' });
    navigate('/teacher');
  }
  function goStudent() {
    dispatch({ type: 'SET_ROLE', role: 'student' });
    navigate('/student');
  }

  return (
    <div className="home-screen">
      <div className="home-content">
        <div className="home-title">
          <span className="home-icon">⚔️</span>
          <h1>Science Clash</h1>
          <p className="home-subtitle">The ultimate classroom battle!</p>
        </div>
        <div className="home-buttons">
          <button className="btn btn-teacher" onClick={goTeacher}>
            <span>🎓</span>
            <span>I'm the Teacher</span>
          </button>
          <button className="btn btn-student" onClick={goStudent}>
            <span>🧑‍🎓</span>
            <span>I'm a Student</span>
          </button>
        </div>
        <p className="home-tagline">
          Answer questions → Earn coins → Spawn monsters → Defeat the Boss!
        </p>
      </div>
      <div className="home-monsters">
        <span>🐺</span><span>🗡️</span><span>🐉</span><span>💣</span><span>⚡</span>
      </div>
    </div>
  );
}
