# âï¸ Science Clash

A real-time multiplayer classroom game. Student groups compete by answering science questions. Correct answers earn coins to spawn monsters that attack a shared BOSS!

## Quick Start

```bash
# 1. Install and run everything
chmod +x start.sh && ./start.sh
```

Or manually:
```bash
# Terminal 1 â Server
cd server && npm install && node server.js

# Terminal 2 â Client
cd client && npm install && npm run dev
```

Open **http://localhost:5173** on every device.

---

## How to Play

### Teacher
1. Go to the URL â **"I'm the Teacher"**
2. Set game settings (timer, castle HP, boss HP)
3. Upload your PDF with questions (or add manually)
4. Press **Create Room** â share the 6-digit code
5. Wait for teams to join â press **Start Game**
6. Press **Launch Question** â wait for answers â **Reveal Results**
7. Repeat until all questions done â **End Game**

### Students
1. Go to the URL â **"I'm a Student"**
2. Enter the room code + team name â join
3. Answer questions (faster = more coins!)
4. Spend coins in the ð Shop to spawn monsters
5. Deal the most damage to the boss to win!

---

## PDF Question Format

```
1. What is the powerhouse of the cell?
A) Nucleus
B) Mitochondria
C) Ribosome
D) Golgi Apparatus
Answer: B

2. What gas do plants absorb during photosynthesis?
A) Oxygen
B) Nitrogen
C) Carbon Dioxide
D) Hydrogen
Answer: C
```

- Questions must be numbered (1. or 1))
- Options labeled A) B) C) D)
- Each answer line must say "Answer: X"

---

## Units & Costs

| Unit | Cost | Damage | Speed |
|------|------|--------|-------|
| ðº Wolf | 50 | 30 | Fast |
| ð¡ï¸ Knight | 100 | 70 | Medium |
| ð£ Bomb | 150 | 120 | Instant |
| â¡ Lightning | 200 | 150 | Instant |
| ð Dragon | 250 | 200 | Slow |

---

## Coin Rewards

- Answer in first â of timer â **150 coins**
- Answer in second â â **100 coins**
- Answer in last â â **75 coins**
- Wrong answer â Castle takes **100 damage**
- No answer (timeout) â Castle takes **50 damage**

---

## Deployment

For classroom use on a real network:

1. Deploy the server to any Node.js host (Railway, Render, Fly.io)
2. Set `VITE_SERVER_URL` in `client/.env` to your server URL
3. Build the client: `cd client && npm run build`
4. Serve `client/dist` from a static host or the same Node server

The teacher and students just need to be on the same network (or internet) to play.
