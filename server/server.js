const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ─── Serve React build (production) ──────────────────────────────────────────
const CLIENT_BUILD = path.join(__dirname, '../client/dist');
app.use(express.static(CLIENT_BUILD));

// ─── In-memory store ──────────────────────────────────────────────────────────
const rooms = new Map();        // roomCode → gameState
const socketToRoom = new Map(); // socketId → { roomCode, role:'teacher'|'student', teamName? }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateRoomCode() {
  let code;
  do { code = Math.floor(100000 + Math.random() * 900000).toString(); }
  while (rooms.has(code));
  return code;
}

function createRoom(teacherSocketId, settings = {}) {
  const castleHP = settings.castleHP || 500;
  return {
    teacherSocketId,
    settings: {
      questionTimer : settings.questionTimer  || 30,
      castleHP,
      bossHPMode    : settings.bossHPMode     || 'auto',   // 'auto' | 'manual'
      manualBossHP  : settings.manualBossHP   || 5000,
      sound         : settings.sound          !== false,
    },
    phase        : 'lobby',   // 'lobby' | 'game' | 'ended'
    teams        : {},        // teamName → teamState
    boss         : { name: 'The Science Overlord', maxHP: 0, currentHP: 0 },
    questions    : [],
    currentQIdx  : -1,
    questionPhase: 'waiting', // 'waiting' | 'active' | 'revealed'
    questionStartTime: null,
    timerId      : null,
  };
}

function createTeam(socketId, castleHP) {
  return {
    socketId,
    hp           : castleHP,
    maxHP        : castleHP,
    coins        : 0,
    totalDamage  : 0,
    correctCount : 0,
    totalAnswered: 0,
    eliminated   : false,
    hasAnswered  : false,
    answer       : null,
    answerTime   : null,
  };
}

function calcBossHP(room) {
  if (room.settings.bossHPMode === 'manual') return room.settings.manualBossHP;
  const count = Object.keys(room.teams).length;
  return Math.max(count, 1) * 1000;
}

function coinAmount(room, answerTime) {
  const timer = room.settings.questionTimer * 1000;
  const elapsed = answerTime - room.questionStartTime;
  const ratio = elapsed / timer;
  if (ratio <= 1 / 3) return 150;
  if (ratio <= 2 / 3) return 100;
  return 75;
}

function allAnswered(room) {
  return Object.values(room.teams).every(t => t.eliminated || t.hasAnswered);
}

function leaderboard(room) {
  return Object.entries(room.teams)
    .map(([name, t]) => ({
      name,
      totalDamage  : t.totalDamage,
      hp           : t.hp,
      eliminated   : t.eliminated,
      correctCount : t.correctCount,
      totalAnswered: t.totalAnswered,
      accuracy     : t.totalAnswered > 0
        ? Math.round((t.correctCount / t.totalAnswered) * 100)
        : 0,
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage);
}

// ─── PDF question parser ──────────────────────────────────────────────────────
/**
 * Expected PDF format (flexible):
 *
 * 1. Question text here?
 * A) Option A
 * B) Option B
 * C) Option C
 * D) Option D
 * Answer: A
 *
 * Works with either "Answer: X" or "Correct: X" lines.
 */
function parseQuestions(text) {
  const questions = [];
  // Split into numbered blocks
  const blocks = text.split(/\n(?=\d+[\.\)]\s)/);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 6) continue;

    // First line: question number + text
    const questionLine = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
    if (!questionLine) continue;

    const options = {};
    let correct = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/);
      if (optMatch) {
        options[optMatch[1].toUpperCase()] = optMatch[2].trim();
        continue;
      }
      const ansMatch = line.match(/^(?:answer|correct|resposta|clave)[:\s]+([A-Da-d])/i);
      if (ansMatch) {
        correct = ansMatch[1].toUpperCase();
      }
    }

    if (Object.keys(options).length === 4 && correct) {
      questions.push({ text: questionLine, options, correct });
    }
  }
  return questions;
}

// ─── PDF upload endpoint ──────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const data = await pdfParse(req.file.buffer);
    const questions = parseQuestions(data.text);
    res.json({ questions, total: questions.length });
  } catch (err) {
    console.error('PDF parse error:', err);
    res.status(500).json({ error: 'Failed to parse PDF', detail: err.message });
  }
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  // ── Teacher: create room ──────────────────────────────────────────────────
  socket.on('create-room', (settings, cb) => {
    const code = generateRoomCode();
    const room = createRoom(socket.id, settings || {});
    rooms.set(code, room);
    socketToRoom.set(socket.id, { roomCode: code, role: 'teacher' });
    socket.join(code);
    console.log(`[ROOM] ${code} created by ${socket.id}`);
    if (cb) cb({ success: true, roomCode: code });
  });

  // ── Teacher: update settings ──────────────────────────────────────────────
  socket.on('update-settings', (settings) => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'teacher') return;
    const room = rooms.get(info.roomCode);
    if (!room) return;
    room.settings = { ...room.settings, ...settings };
    socket.emit('settings-updated', room.settings);
  });

  // ── Teacher: set questions manually ──────────────────────────────────────
  socket.on('set-questions', (questions) => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'teacher') return;
    const room = rooms.get(info.roomCode);
    if (!room) return;
    room.questions = questions;
    socket.emit('questions-loaded', { total: questions.length });
  });

  // ── Student: join room ────────────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, teamName }, cb) => {
    const room = rooms.get(roomCode);
    if (!room) return cb && cb({ success: false, error: 'Room not found' });
    if (room.phase !== 'lobby') return cb && cb({ success: false, error: 'Game already in progress' });
    if (room.teams[teamName]) return cb && cb({ success: false, error: 'Team name already taken' });

    room.teams[teamName] = createTeam(socket.id, room.settings.castleHP);
    socketToRoom.set(socket.id, { roomCode, role: 'student', teamName });
    socket.join(roomCode);

    const teamList = Object.keys(room.teams);
    io.to(roomCode).emit('team-joined', { teamName, teamList });
    console.log(`[JOIN] ${teamName} joined ${roomCode}`);
    if (cb) cb({ success: true });
  });

  // ── Teacher: start game ───────────────────────────────────────────────────
  socket.on('start-game', () => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'teacher') return;
    const room = rooms.get(info.roomCode);
    if (!room || room.phase !== 'lobby') return;

    const teamCount = Object.keys(room.teams).length;
    if (teamCount === 0) return socket.emit('error', 'No teams have joined yet');

    room.phase = 'game';
    const bossHP = calcBossHP(room);
    room.boss.maxHP = bossHP;
    room.boss.currentHP = bossHP;

    io.to(info.roomCode).emit('game-started', {
      boss       : room.boss,
      teams      : buildTeamPublicState(room),
      settings   : room.settings,
      totalQuestions: room.questions.length,
    });
    console.log(`[GAME] ${info.roomCode} started — ${teamCount} teams, boss HP ${bossHP}`);
  });

  // ── Teacher: launch question ──────────────────────────────────────────────
  socket.on('launch-question', () => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'teacher') return;
    const room = rooms.get(info.roomCode);
    if (!room || room.phase !== 'game') return;
    if (room.questionPhase === 'active') return;

    const nextIdx = room.currentQIdx + 1;
    if (nextIdx >= room.questions.length) {
      return socket.emit('error', 'No more questions');
    }

    room.currentQIdx = nextIdx;
    room.questionPhase = 'active';
    room.questionStartTime = Date.now();

    // Reset team answers
    for (const t of Object.values(room.teams)) {
      t.hasAnswered = false;
      t.answer = null;
      t.answerTime = null;
    }

    const q = room.questions[nextIdx];
    const timer = room.settings.questionTimer;

    // Send question to students (no correct answer)
    io.to(info.roomCode).emit('question-launched', {
      index     : nextIdx,
      total     : room.questions.length,
      text      : q.text,
      options   : q.options,
      timer,
      startTime : room.questionStartTime,
    });

    // Teacher also sees the correct answer
    socket.emit('question-answer', { correct: q.correct });

    // Auto-timeout
    if (room.timerId) clearTimeout(room.timerId);
    room.timerId = setTimeout(() => autoTimeout(info.roomCode), timer * 1000 + 500);

    console.log(`[Q] ${info.roomCode} — Q${nextIdx + 1}: ${q.text}`);
  });

  // ── Student: submit answer ────────────────────────────────────────────────
  socket.on('submit-answer', (answer) => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'student') return;
    const room = rooms.get(info.roomCode);
    if (!room || room.phase !== 'game' || room.questionPhase !== 'active') return;

    const team = room.teams[info.teamName];
    if (!team || team.hasAnswered || team.eliminated) return;

    team.hasAnswered = true;
    team.answer = answer;
    team.answerTime = Date.now();
    team.totalAnswered++;

    // Tell the teacher one more team has answered
    io.to(room.teacherSocketId).emit('team-answered', {
      teamName    : info.teamName,
      answeredCount: Object.values(room.teams).filter(t => t.hasAnswered || t.eliminated).length,
      totalTeams  : Object.keys(room.teams).length,
    });

    // If everyone answered, optionally notify teacher
    if (allAnswered(room)) {
      io.to(room.teacherSocketId).emit('all-answered');
    }
  });

  // ── Teacher: reveal results ───────────────────────────────────────────────
  socket.on('reveal-results', () => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'teacher') return;
    const room = rooms.get(info.roomCode);
    if (!room || room.phase !== 'game' || room.questionPhase !== 'active') return;

    if (room.timerId) { clearTimeout(room.timerId); room.timerId = null; }
    processReveal(info.roomCode);
  });

  // ── Student: spawn unit ───────────────────────────────────────────────────
  socket.on('spawn-unit', ({ unitType }) => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'student') return;
    const room = rooms.get(info.roomCode);
    if (!room || room.phase !== 'game') return;

    const team = room.teams[info.teamName];
    if (!team || team.eliminated) return;

    const UNITS = {
      wolf     : { cost: 50,  damage: 30,  speed: 'fast'   },
      knight   : { cost: 100, damage: 70,  speed: 'medium' },
      dragon   : { cost: 250, damage: 200, speed: 'slow'   },
      bomb     : { cost: 150, damage: 120, speed: 'instant'},
      lightning: { cost: 200, damage: 150, speed: 'instant'},
    };

    const unit = UNITS[unitType];
    if (!unit) return;
    if (team.coins < unit.cost) return socket.emit('spawn-failed', 'Not enough coins');

    team.coins -= unit.cost;
    team.totalDamage += unit.damage;
    room.boss.currentHP = Math.max(0, room.boss.currentHP - unit.damage);

    socket.emit('coins-updated', team.coins);

    io.to(info.roomCode).emit('unit-spawned', {
      teamName : info.teamName,
      unitType,
      damage   : unit.damage,
      speed    : unit.speed,
      bossHP   : room.boss.currentHP,
      bossMaxHP: room.boss.maxHP,
    });

    // Check boss defeated
    if (room.boss.currentHP <= 0) {
      endGame(info.roomCode, 'boss-defeated');
    }
  });

  // ── Teacher: pause / resume ───────────────────────────────────────────────
  socket.on('pause-game', () => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'teacher') return;
    io.to(info.roomCode).emit('game-paused');
  });

  socket.on('resume-game', () => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'teacher') return;
    io.to(info.roomCode).emit('game-resumed');
  });

  // ── Teacher: end game manually ────────────────────────────────────────────
  socket.on('end-game', () => {
    const info = socketToRoom.get(socket.id);
    if (!info || info.role !== 'teacher') return;
    endGame(info.roomCode, 'manual');
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const info = socketToRoom.get(socket.id);
    if (!info) return;
    const { roomCode, role, teamName } = info;
    socketToRoom.delete(socket.id);

    const room = rooms.get(roomCode);
    if (!room) return;

    if (role === 'student' && room.phase === 'lobby') {
      delete room.teams[teamName];
      io.to(roomCode).emit('team-left', {
        teamName,
        teamList: Object.keys(room.teams),
      });
    }
    console.log(`[-] ${socket.id} (${role}${teamName ? ': ' + teamName : ''}) disconnected`);
  });
});

// ─── Auto-timeout handler ─────────────────────────────────────────────────────
function autoTimeout(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.questionPhase !== 'active') return;
  processReveal(roomCode);
}

// ─── Process reveal ───────────────────────────────────────────────────────────
function processReveal(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.questionPhase = 'revealed';
  const q = room.questions[room.currentQIdx];
  const results = {};

  for (const [name, team] of Object.entries(room.teams)) {
    if (team.eliminated) { results[name] = { result: 'eliminated' }; continue; }

    let result, coins = 0, castleDamage = 0;

    if (!team.hasAnswered) {
      // Timeout
      result = 'timeout';
      castleDamage = 50;
      team.hp = Math.max(0, team.hp - castleDamage);
    } else if (team.answer === q.correct) {
      // Correct
      result = 'correct';
      coins = coinAmount(room, team.answerTime);
      team.coins += coins;
      team.correctCount++;
    } else {
      // Wrong
      result = 'wrong';
      castleDamage = 100;
      team.hp = Math.max(0, team.hp - castleDamage);
    }

    results[name] = { result, coins, castleDamage, hp: team.hp, totalCoins: team.coins };

    // Check elimination
    if (team.hp <= 0 && !team.eliminated) {
      team.eliminated = true;
      io.to(roomCode).emit('team-eliminated', { teamName: name });
    }
  }

  io.to(roomCode).emit('results-revealed', {
    correct    : q.correct,
    results,
    leaderboard: leaderboard(room),
    bossHP     : room.boss.currentHP,
    bossMaxHP  : room.boss.maxHP,
  });

  // Check if all questions done
  const allEliminated = Object.values(room.teams).every(t => t.eliminated);
  if (allEliminated) return endGame(roomCode, 'all-eliminated');
  if (room.currentQIdx >= room.questions.length - 1) {
    // Last question — teacher can still manually end or end auto
    io.to(room.teacherSocketId).emit('last-question-revealed');
  }
}

// ─── End game ─────────────────────────────────────────────────────────────────
function endGame(roomCode, reason) {
  const room = rooms.get(roomCode);
  if (!room || room.phase === 'ended') return;

  room.phase = 'ended';
  if (room.timerId) { clearTimeout(room.timerId); room.timerId = null; }

  const board = leaderboard(room);
  const winner = board[0]?.name || null;

  io.to(roomCode).emit('game-ended', {
    reason,
    winner,
    leaderboard : board,
    bossDefeated: room.boss.currentHP <= 0,
    bossHP      : room.boss.currentHP,
    bossMaxHP   : room.boss.maxHP,
  });

  console.log(`[END] Room ${roomCode} — reason: ${reason}, winner: ${winner}`);
  // Clean up after 10 min
  setTimeout(() => rooms.delete(roomCode), 10 * 60 * 1000);
}

// ─── Build public team state (no coins leak) ──────────────────────────────────
function buildTeamPublicState(room) {
  const result = {};
  for (const [name, t] of Object.entries(room.teams)) {
    result[name] = {
      hp         : t.hp,
      maxHP      : t.maxHP,
      totalDamage: t.totalDamage,
      eliminated : t.eliminated,
    };
  }
  return result;
}

// ─── Catch-all: serve React app for all non-API routes ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Science Clash server running on :${PORT}`));
