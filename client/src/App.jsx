import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useGame } from './GameContext';

import Home         from './pages/Home';
import TeacherSetup  from './pages/TeacherSetup';
import TeacherLobby  from './pages/TeacherLobby';
import TeacherGame   from './pages/TeacherGame';
import TeacherResults from './pages/TeacherResults';
import StudentJoin   from './pages/StudentJoin';
import StudentLobby  from './pages/StudentLobby';
import StudentGame   from './pages/StudentGame';
import StudentResults from './pages/StudentResults';

export default function App() {
  const { state } = useGame();
  const navigate  = useNavigate();

  // Auto-navigate based on phase changes
  useEffect(() => {
    if (state.phase === 'game') {
      if (state.role === 'teacher') navigate('/teacher/game', { replace: true });
      else                          navigate('/student/game',  { replace: true });
    }
    if (state.phase === 'ended') {
      if (state.role === 'teacher') navigate('/teacher/results', { replace: true });
      else                          navigate('/student/results',  { replace: true });
    }
  }, [state.phase, state.role]);

  return (
    <>
      {state.error && (
        <div className="global-error" onClick={() => {}}>
          â ï¸ {state.error}
        </div>
      )}
      <Routes>
        <Route path="/"                 element={<Home />} />
        <Route path="/teacher"          element={<TeacherSetup />} />
        <Route path="/teacher/lobby"    element={<TeacherLobby />} />
        <Route path="/teacher/game"     element={<TeacherGame />} />
        <Route path="/teacher/results"  element={<TeacherResults />} />
        <Route path="/student"          element={<StudentJoin />} />
        <Route path="/student/lobby"    element={<StudentLobby />} />
        <Route path="/student/game"     element={<StudentGame />} />
        <Route path="/student/results"  element={<StudentResults />} />
        <Route path="*"                 element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
