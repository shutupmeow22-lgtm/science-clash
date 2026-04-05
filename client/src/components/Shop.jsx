import React from 'react';
import socket from '../socket';

const UNITS = [
  { type:'wolf',      label:'🐺 Wolf',      cost:50,  damage:30,  speed:'Fast',    desc:'Quick and cheap scout' },
  { type:'knight',    label:'🗡️ Knight',    cost:100, damage:70,  speed:'Medium',  desc:'Reliable warrior' },
  { type:'bomb',      label:'💣 Bomb',      cost:150, damage:120, speed:'Instant', desc:'Splash damage!' },
  { type:'lightning', label:'⚡ Lightning', cost:200, damage:150, speed:'Instant', desc:'Strikes immediately' },
  { type:'dragon',    label:'🐉 Dragon',    cost:250, damage:200, speed:'Slow',    desc:'Devastating power' },
];

export default function Shop({ coins, onClose }) {
  function spawn(unitType) {
    socket.emit('spawn-unit', { unitType });
  }

  return (
    <div className="shop-overlay" onClick={onClose}>
      <div className="shop-modal" onClick={e => e.stopPropagation()}>
        <div className="shop-header">
          <h3>🛒 Monster Shop</h3>
          <span className="shop-coins">🪙 {coins}</span>
          <button className="shop-close" onClick={onClose}>✕</button>
        </div>
        <div className="shop-items">
          {UNITS.map(u => (
            <div key={u.type} className={`shop-item ${coins < u.cost ? 'unaffordable' : ''}`}>
              <div className="shop-item-icon">{u.label.split(' ')[0]}</div>
              <div className="shop-item-info">
                <strong>{u.label.replace(/^\S+\s/, '')}</strong>
                <span className="shop-item-desc">{u.desc}</span>
                <div className="shop-item-stats">
                  <span>⚔️ {u.damage} dmg</span>
                  <span>💨 {u.speed}</span>
                </div>
              </div>
              <button
                className="btn btn-spawn"
                disabled={coins < u.cost}
                onClick={() => { spawn(u.type); onClose(); }}>
                🪙 {u.cost}
              </button>
            </div>
          ))}
        </div>
        <p className="shop-tip">Tip: Spawn multiple units to deal more damage!</p>
      </div>
    </div>
  );
}
