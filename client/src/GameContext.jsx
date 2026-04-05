import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import socket from './socket';

// âââ Initial state ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const initialState = {
  role          : null,    // 'teacher' | 'student'
  roomCode      : null,
  teamName      : null,    // student only
  phase         : 'home',  // 'home' | 'setup' | 'lobby' | 'game' | 'ended'
  connected     : false,
  error         : null,

  // Shared game state
  boss          : { name: 'The Science Overlord', maxHP: 0, currentHP: 0 },
  teams         : {},      // { teamName: { hp, maxHP, totalDamage, eliminated } }
  settings      : {},
  totalQuestions: 0,

  // Teacher-specific
  teamList      : [],      // lobby list
  answeredCount : 0,
  totalTeams    : 0,
  allAnswered   : false,
  correctAnswer : null,    // shown to teacher
  questionPhase : 'waiting',
  isLastQuestion: false,
  paused        : false,

  // Student-specific
  coins         : 0,
  myHP          : 0,
  myMaxHP       : 0,
  eliminated    : false,

  // Current question
  question      : null,    // { index, total, text, options, timer, startTime }
  myResult      : null,    // { result:'correct'|'wrong'|'timeout', coins, castleDamage }
  revealData    : null,    // { correct, results, leaderboard, bossHP }

  // Battlefield units
  units         : [],      // [{ id, teamName, unitType, damage, speed }]

  // Results
  gameResult    : null,    // { reason, winner, leaderboard, bossDefeated }
};

// âââ Reducer ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.role };
    case 'SET_CONNECTED':
      return { ...state, connected: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'ROOM_CREATED':
      return { ...state, roomCode: action.roomCode, phase: 'lobby' };

    case 'JOIN_LOBBY':
      return { ...state, phase: 'lobby', roomCode: action.roomCode, teamName: action.teamName };

    case 'TEAM_LIST_UPDATED':
      return { ...state, teamList: action.teamList };

    case 'TEAM_LEFT':
      return { ...state, teamList: action.teamList };

    case 'GAME_STARTED':
      return {
        ...state,
        phase         : 'game',
        boss          : action.boss,
        teams         : action.teams,
        settings      : action.settings,
        totalQuestions: action.totalQuestions,
        myHP          : state.role === 'student' ? action.teams[state.teamName]?.hp ?? state.myHP : state.myHP,
        myMaxHP       : state.role === 'student' ? action.teams[state.teamName]?.maxHP ?? state.myMaxHP : state.myMaxHP,
        answeredCount : 0,
        totalTeams    : Object.keys(action.teams).length,
        questionPhase : 'waiting',
      };

    case 'QUESTION_LAUNCHED':
      return {
        ...state,
        question      : action.question,
        questionPhase : 'active',
        myResult      : null,
        revealData    : null,
        correctAnswer : null,
        allAnswered   : false,
        answeredCount : 0,
        isLastQuestion: false,
      };

    case 'QUESTION_ANSWER':  // teacher only
      return { ...state, correctAnswer: action.correct };

    case 'TEAM_ANSWERED':
      return {
        ...state,
        answeredCount: action.answeredCount,
        totalTeams   : action.totalTeams,
      };

    case 'ALL_ANSWERED':
      return { ...state, allAnswered: true };

    case 'RESULTS_REVEALED':
      return {
        ...state,
        questionPhase: 'revealed',
        revealData   : action.data,
        myResult     : state.role === 'student'
          ? action.data.results[state.teamName] || null
          : null,
        teams        : updateTeamDamage(state.teams, action.data.results, action.data.leaderboard),
        boss         : { ...state.boss, currentHP: action.data.bossHP, maxHP: action.data.bossMaxHP },
        myHP         : state.role === 'student'
          ? action.data.results[state.teamName]?.hp ?? state.myHP
          : state.myHP,
        coins        : state.role === 'student'
          ? action.data.results[state.teamName]?.totalCoins ?? state.coins
          : state.coins,
      };

    case 'LAST_QUESTION_REVEALED':
      return { ...state, isLastQuestion: true };

    case 'UNIT_SPAWNED': {
      const uid = Date.now() + Math.random();
      return {
        ...state,
        boss : { ...state.boss, currentHP: action.bossHP, maxHP: action.bossMaxHP },
        units: [...state.units, { id: uid, ...action }].slice(-20), // keep last 20
        teams: updateTeamHP(state.teams),
      };
    }

    case 'COINS_UPDATED':
      return { ...state, coins: action.coins };

    case 'SPAWN_FAILED':
      return { ...state, error: action.reason };

    case 'TEAM_ELIMINATED': {
      const teams = { ...state.teams };
      if (teams[action.teamName]) teams[action.teamName] = { ...teams[action.teamName], eliminated: true };
      return {
        ...state,
        teams,
        eliminated: state.teamName === action.teamName ? true : state.eliminated,
      };
    }

    case 'REMOVE_UNIT':
      return { ...state, units: state.units.filter(u => u.id !== action.id) };

    case 'GAME_PAUSED':
      return { ...state, paused: true };

    case 'GAME_RESUMED':
      return { ...state, paused: false };

    case 'GAME_ENDED':
      return { ...state, phase: 'ended', gameResult: action.result };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

function updateTeamDamage(teams, results, leaderboard) {
  const updated = { ...teams };
  leaderboard.forEach(entry => {
    if (updated[entry.name]) {
      updated[entry.name] = {
        ...updated[entry.name],
        totalDamage: entry.totalDamage,
        hp         : entry.hp,
        eliminated : entry.eliminated,
      };
    }
  });
  return updated;
}

function updateTeamHP(teams) { return teams; }

// âââ Context ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    socket.connect();

    socket.on('connect',    () => dispatch({ type: 'SET_CONNECTED', value: true }));
    socket.on('disconnect', () => dispatch({ type: 'SET_CONNECTED', value: false }));
    socket.on('error',      (msg) => dispatch({ type: 'SET_ERROR', error: msg }));

    socket.on('team-joined', ({ teamName, teamList }) => {
      dispatch({ type: 'TEAM_LIST_UPDATED', teamList });
    });
    socket.on('team-left', ({ teamList }) => {
      dispatch({ type: 'TEAM_LEFT', teamList });
    });
    socket.on('game-started', (data) => {
      dispatch({ type: 'GAME_STARTED', ...data });
    });
    socket.on('question-launched', (q) => {
      dispatch({ type: 'QUESTION_LAUNCHED', question: q });
    });
    socket.on('question-answer', ({ correct }) => {
      dispatch({ type: 'QUESTION_ANSWER', correct });
    });
    socket.on('team-answered', (data) => {
      dispatch({ type: 'TEAM_ANSWERED', ...data });
    });
    socket.on('all-answered', () => {
      dispatch({ type: 'ALL_ANSWERED' });
    });
    socket.on('results-revealed', (data) => {
      dispatch({ type: 'RESULTS_REVEALED', data });
    });
    socket.on('last-question-revealed', () => {
      dispatch({ type: 'LAST_QUESTION_REVEALED' });
    });
    socket.on('unit-spawned', (data) => {
      dispatch({ type: 'UNIT_SPAWNED', ...data });
    });
    socket.on('coins-updated', (coins) => {
      dispatch({ type: 'COINS_UPDATED', coins });
    });
    socket.on('spawn-failed', (reason) => {
      dispatch({ type: 'SPAWN_FAILED', reason });
    });
    socket.on('team-eliminated', ({ teamName }) => {
      dispatch({ type: 'TEAM_ELIMINATED', teamName });
    });
    socket.on('game-paused',  () => dispatch({ type: 'GAME_PAUSED' }));
    socket.on('game-resumed', () => dispatch({ type: 'GAME_RESUMED' }));
    socket.on('game-ended',   (result) => dispatch({ type: 'GAME_ENDED', result }));

    return () => socket.disconnect();
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
