import { useEffect, useState, useRef } from 'react';
import './ScanResult.css';

function TypewriterText({ text, speed = 22, onComplete }) {
  const [shown, setShown] = useState('');
  const [i, setI] = useState(0);

  useEffect(() => {
    setShown('');
    setI(0);
  }, [text]);

  useEffect(() => {
    if (i < text.length) {
      const t = setTimeout(() => {
        setShown(s => s + text[i]);
        setI(p => p + 1);
      }, speed);
      return () => clearTimeout(t);
    } else if (i > 0 && i === text.length) {
      onComplete?.();
    }
  }, [i, text, speed, onComplete]);

  return (
    <>
      {shown}
      {i < text.length && <span className="cursor">_</span>}
    </>
  );
}

const RARITY_COLORS = {
  'COMMON':     '#aaaaaa',
  'UNCOMMON':   '#33dd55',
  'RARE':       '#4499ff',
  'ULTRA RARE': '#cc33ff',
  'LEGENDARY':  '#ff9900',
};

const STAT_COLORS = {
  CREATIVITY: '#44aaff',
  EFFORT:     '#33ff88',
  SCARE:      '#cc33ff',
  CRINGE:     '#ff6600',
};

export default function ScanResult({ entry, scrollRef }) {
  const [done, setDone] = useState(false);

  useEffect(() => { setDone(false); }, [entry]);

  if (!entry) return null;
  const { data, image, id } = entry;
  const rarityColor = RARITY_COLORS[data.rarity] || '#aaa';

  const statsRows = [
    ['CREATIVITY', data.stats.creativity],
    ['EFFORT',     data.stats.effort],
    ['SCARE',      data.stats.scare_factor],
    ['CRINGE',     data.stats.cringe],
  ];

  const types = Array.isArray(data.types) ? data.types.slice(0, 2) : ['???', '???'];

  return (
    <div className="scanResult" ref={scrollRef}>
      <div className="resultHeader">
        <span className="entryId">#{String(id).padStart(3, '0')}</span>
        <span className="rarity" style={{ color: rarityColor }}>
          {data.rarity}
        </span>
      </div>

      <div className="photoFrame">
        <img src={`data:image/jpeg;base64,${image}`} alt="specimen" />
      </div>

      <h2 className="speciesName">{data.species_name}</h2>

      <div className="types">
        {types.map((t, i) => (
          <span key={i} className="typeChip">{t}</span>
        ))}
      </div>

      <div className="stats">
        {statsRows.map(([name, val]) => (
          <div key={name} className="statRow">
            <span className="statName">{name}</span>
            <div className="statBar">
              <div
                className="statFill"
                style={{
                  '--pct': `${val}%`,
                  '--color': STAT_COLORS[name] || '#ff6600',
                }}
              />
            </div>
            <span className="statVal">{val}</span>
          </div>
        ))}
      </div>

      <p className="weakness">{data.weakness}</p>

      <div className="description">
        <TypewriterText
          text={data.description}
          speed={22}
          onComplete={() => setDone(true)}
        />
      </div>

      {done && (
        <div className="actionHint">[A] SAVE CARD &nbsp;·&nbsp; [B] BACK TO SCAN</div>
      )}

      <div className="scrollIndicator">↓</div>
    </div>
  );
}
