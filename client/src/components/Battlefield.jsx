import React, { useEffect, useState } from 'react';
import { useGame } from '../GameContext';

const UNIT_EMOJI = {
  wolf     : '🐺',
  knight   : '🗡️',
  bomb     : '💣',
  lightning: '⚡',
  dragon   : '🐉',
};

const SPEED_DURATION = {
  fast   : 1500,
  medium : 2500,
  slow   : 4000,
  instant: 400,
};

export default function Battlefield({ teamName }) {
  const { state, dispatch } = useGame();
  const { units } = state;
  const [activeUnits, setActiveUnits] = useState([]);

  useEffect(() => {
    if (!units.length) return;
    const newest = units[units.length - 1];
    // Animate newest unit
    const duration = SPEED_DURATION[newest.speed] || 2000;
    const id = newest.id;

    setActiveUnits(prev => {
      // Avoid duplicates
      if (prev.find(u => u.id === id)) return prev;
      return [...prev, { ...newest, startedAt: Date.now(), duration }];
    });

    const t = setTimeout(() => {
      setActiveUnits(prev => prev.filter(u => u.id !== id));
      dispatch({ type: 'REMOVE_UNIT', id });
    }, duration + 500);

    return () => clearTimeout(t);
  }, [units]);

  return (
    <div className="battlefield">
      {/* Boss side */}
      <div className="boss-side">
        <div className="boss-sprite">👹</div>
      </div>

      {/* Units marching */}
      <div className="march-lane">
        {activeUnits.map(u => (
          <MarchingUnit key={u.id} unit={u} isMyTeam={u.teamName === teamName} />
        ))}
      </div>

      {/* Player side */}
      <div className="player-side">
        <div className="spawn-point">⚔️</div>
      </div>
    </div>
  );
}

function MarchingUnit({ unit, isMyTeam }) {
  const emoji = UNIT_EMOJI[unit.unitType] || '⚔️';
  const label = isMyTeam ? 'mine' : 'ally';

  return (
    <div
      className={`march-unit march-${unit.speed} unit-${label}`}
      title={`${unit.teamName}: ${unit.unitType} (${unit.damage} dmg)`}>
      <span className="unit-emoji">{emoji}</span>
      {isMyTeam && <span className="unit-dmg">-{unit.damage}</span>}
    </div>
  );
}
