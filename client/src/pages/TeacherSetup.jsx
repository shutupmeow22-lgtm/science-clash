import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';
import socket from '../socket';

export default function TeacherSetup() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    questionTimer: 30,
    castleHP    : 500,
    bossHPMode  : 'auto',
    manualBossHP: 5000,
    sound       : true,
  });

  const [questions,  setQuestions]  = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState('');
  const [creating,   setCreating]   = useState(false);
  const fileRef = useRef();

  const [manualQ,    setManualQ]    = useState({ text:'', options:{A:'',B:'',C:'',D:''}, correct:'A' });
  const [showManual, setShowManual] = useState(false);

  const [banks, setBanks] = useState([]);

  useEffect(() => {
    fetch('/api/question-banks')
      .then(r => r.json())
      .then(setBanks)
      .catch(() => {});
  }, []);

  async function loadBuiltIn(bankId) {
    try {
      const res = await fetch('/api/question-banks/' + bankId);
      const qs  = await res.json();
      setQuestions(qs);
      setUploadMsg('Loaded ' + qs.length + ' questions from built-in bank');
    } catch {
      setUploadMsg('Failed to load question bank');
    }
  }

  async function handlePDF(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('Parsing PDF...');
    const form = new FormData();
    form.append('pdf', file);
    try {
      const res  = await fetch('/upload-pdf', { method:'POST', body: form });
      const data = await res.json();
      if (data.questions && data.questions.length) {
        setQuestions(data.questions);
        setUploadMsg(data.total + ' questions loaded from PDF');
      } else {
        setUploadMsg('No questions found. Check PDF format.');
      }
    } catch {
      setUploadMsg('Upload failed. Try again.');
    }
    setUploading(false);
  }

  function addManualQuestion() {
    const { text, options, correct } = manualQ;
    if (!text.trim() || !options.A || !options.B || !options.C || !options.D) return;
    setQuestions(q => [...q, { text: text.trim(), options, correct }]);
    setManualQ({ text:'', options:{A:'',B:'',C:'',D:''}, correct:'A' });
    setShowManual(false);
  }

  function removeQuestion(idx) {
    setQuestions(q => q.filter((_, i) => i !== idx));
  }

  function createRoom() {
    if (questions.length === 0)
      return dispatch({ type:'SET_ERROR', error:'Add at least one question first' });
    setCreating(true);
    socket.emit('create-room', settings, ({ success, roomCode }) => {
      if (!success) { setCreating(false); return; }
      socket.emit('set-questions', questions);
      dispatch({ type:'ROOM_CREATED', roomCode });
      navigate('/teacher/lobby');
    });
  }

  return (
    <div className="setup-screen">
      <div className="setup-header">
        <h2>Teacher Setup</h2>
        <p>Configure your game and load questions</p>
      </div>

      <div className="setup-body">

        <section className="setup-card">
          <h3>Game Settings</h3>
          <div className="settings-grid">
            <label>
              <span>Question Timer</span>
              <select value={settings.questionTimer} onChange={e=>setSettings(s=>({...s,questionTimer:+e.target.value}))}>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </label>
            <label>
              <span>Castle HP</span>
              <select value={settings.castleHP} onChange={e=>setSettings(s=>({...s,castleHP:+e.target.value}))}>
                <option value={300}>300 HP (Easy)</option>
                <option value={500}>500 HP (Normal)</option>
                <option value={1000}>1000 HP (Hard)</option>
              </select>
            </label>
            <label>
              <span>Boss HP</span>
              <select value={settings.bossHPMode} onChange={e=>setSettings(s=>({...s,bossHPMode:e.target.value}))}>
                <option value="auto">Auto (1000 x groups)</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            {settings.bossHPMode === 'manual' && (
              <label>
                <span>Boss HP Amount</span>
                <input type="number" min={500} max={50000} step={500}
                  value={settings.manualBossHP}
                  onChange={e=>setSettings(s=>({...s,manualBossHP:+e.target.value}))} />
              </label>
            )}
            <label className="toggle-label">
              <span>Sound Effects</span>
              <button className={'toggle ' + (settings.sound ? 'on' : '')}
                      onClick={()=>setSettings(s=>({...s,sound:!s.sound}))}>
                {settings.sound ? 'On' : 'Off'}
              </button>
            </label>
          </div>
        </section>

        <section className="setup-card">
          <h3>Questions ({questions.length} loaded)</h3>

          {banks.length > 0 && (
            <div className="builtin-banks">
              <p className="banks-label">Built-in Question Banks - click to load instantly</p>
              <div className="banks-grid">
                {banks.map(b => (
                  <div key={b.id} className="bank-card">
                    <div className="bank-title">{b.title}</div>
                    <div className="bank-meta">Grade {b.grade} - {b.count} questions</div>
                    <div className="bank-topic">{b.topic}</div>
                    <button className="btn btn-secondary bank-btn"
                            onClick={() => loadBuiltIn(b.id)}>
                      Load
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="upload-area" onClick={()=>fileRef.current && fileRef.current.click()}>
            <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handlePDF} />
            <span className="upload-icon">PDF</span>
            <p><strong>Click to upload your PDF</strong></p>
            <p className="upload-hint">
              Format: numbered questions with A/B/C/D options and Answer: X
            </p>
          </div>

          {uploading && <div className="upload-spinner">Parsing...</div>}
          {uploadMsg && (
            <div className="upload-msg">{uploadMsg}</div>
          )}

          <button className="btn btn-secondary" onClick={()=>setShowManual(s=>!s)}>
            {showManual ? 'Cancel' : 'Add Question Manually'}
          </button>

          {showManual && (
            <div className="manual-form">
              <textarea placeholder="Question text..."
                value={manualQ.text}
                onChange={e=>setManualQ(q=>({...q,text:e.target.value}))} />
              {['A','B','C','D'].map(opt=>(
                <input key={opt} placeholder={'Option ' + opt}
                  value={manualQ.options[opt]}
                  onChange={e=>setManualQ(q=>({...q,options:{...q.options,[opt]:e.target.value}}))} />
              ))}
              <div className="manual-correct">
                <span>Correct answer:</span>
                {['A','B','C','D'].map(opt=>(
                  <button key={opt}
                    className={'opt-btn ' + (manualQ.correct===opt ? 'selected' : '')}
                    onClick={()=>setManualQ(q=>({...q,correct:opt}))}>
                    {opt}
                  </button>
                ))}
              </div>
              <button className="btn btn-accent" onClick={addManualQuestion}>Add Question</button>
            </div>
          )}

          {questions.length > 0 && (
            <div className="question-list">
              {questions.map((q, i) => (
                <div key={i} className="question-item">
                  <span className="q-num">Q{i+1}</span>
                  <span className="q-text">{q.text}</span>
                  <span className="q-answer">{q.correct}</span>
                  <button className="q-remove" onClick={()=>removeQuestion(i)}>X</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <button className="btn btn-start big-btn"
                disabled={questions.length === 0 || creating}
                onClick={createRoom}>
          {creating ? 'Creating Room...' : 'Create Room'}
        </button>

      </div>
    </div>
  );
}
