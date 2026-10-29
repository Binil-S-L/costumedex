import { useState, useEffect, useRef, useCallback } from 'react';
import Device from './Device';
import CameraView from './CameraView';
import ScanResult from './ScanResult';
import DexHistory from './DexHistory';
import { unlockSpeech, stopSpeech, speakEntry } from './speech';
import './App.css';

// ─── Utilities ────────────────────────────────────────────
async function createThumbnail(base64) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 200;
      let w = img.width, h = img.height;
      if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
      else       { w = Math.round(w * maxSize / h); h = maxSize; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.72).split(',')[1]);
    };
    img.onerror = () => resolve('');
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

function wrapText(ctx, text, x, y, maxW, lh) {
  for (const line of text.split('\n')) {
    const words = line.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur + w + ' ';
      if (ctx.measureText(test).width > maxW && cur) {
        ctx.fillText(cur.trim(), x, y);
        cur = w + ' ';
        y += lh;
      } else { cur = test; }
    }
    ctx.fillText(cur.trim(), x, y);
    y += lh;
  }
  return y;
}

async function saveCard(entry) {
  const W = 390, H = 580;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, W, H);

  // Orange border
  ctx.strokeStyle = '#ff6600';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  // Photo
  if (entry.image) {
    await new Promise(res => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(12, 12, 164, 124);
        ctx.clip();
        ctx.drawImage(img, 12, 12, 164, 124);
        ctx.restore();
        res();
      };
      img.onerror = res;
      img.src = `data:image/jpeg;base64,${entry.image}`;
    });
  }

  // Entry ID
  ctx.font = '11px "Courier New"';
  ctx.fillStyle = '#ffaa00';
  ctx.fillText(`#${String(entry.id).padStart(3, '0')}`, 186, 28);

  // Species name (wrapped)
  ctx.font = 'bold 14px "Courier New"';
  ctx.fillStyle = '#ffffff';
  wrapText(ctx, entry.data.species_name, 186, 48, 186, 18);

  // Types
  ctx.font = '10px "Courier New"';
  ctx.fillStyle = '#ffaa00';
  ctx.fillText(entry.data.types.join(' / '), 186, 96);

  // Stats
  const statRows = [
    ['CREAT', entry.data.stats.creativity,  '#44aaff'],
    ['EFRT',  entry.data.stats.effort,       '#33ff88'],
    ['SCARE', entry.data.stats.scare_factor, '#cc33ff'],
    ['CRINGE',entry.data.stats.cringe,       '#ff6600'],
  ];
  statRows.forEach(([label, val, col], i) => {
    const y = 118 + i * 20;
    ctx.font = '8px "Courier New"';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(label, 186, y);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(228, y - 9, 100, 9);
    ctx.fillStyle = col;
    ctx.fillRect(228, y - 9, val, 9);
    ctx.font = '8px "Courier New"';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(val, 332, y);
  });

  // Divider
  ctx.strokeStyle = 'rgba(255,100,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(12, 144); ctx.lineTo(W - 12, 144); ctx.stroke();

  // Rarity
  ctx.font = '9px "Courier New"';
  ctx.fillStyle = '#ff9900';
  ctx.fillText(`RARITY: ${entry.data.rarity}`, 12, 162);

  // Weakness
  ctx.font = '9px "Courier New"';
  ctx.fillStyle = 'rgba(255,100,0,0.85)';
  let wY = wrapText(ctx, entry.data.weakness, 12, 178, W - 24, 14);

  // Description
  ctx.font = '10px "Courier New"';
  ctx.fillStyle = 'rgba(200,230,255,0.85)';
  wrapText(ctx, entry.data.description, 12, wY + 14, W - 24, 15);

  // Footer
  ctx.fillStyle = 'rgba(255,100,0,0.6)';
  ctx.font = '9px "Courier New"';
  ctx.fillText('COSTUMEDEX v1.0', 12, H - 12);
  ctx.textAlign = 'right';
  ctx.fillText(new Date(entry.timestamp).toLocaleDateString(), W - 12, H - 12);

  c.toBlob(async blob => {
    const fname = `costumedex-${String(entry.id).padStart(3, '0')}.png`;
    const file = new File([blob], fname, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `CostumeDex: ${entry.data.species_name}`,
          text: entry.data.description,
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fname });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, 'image/png');
}

// ─── Boot screen ──────────────────────────────────────────
const BOOT_LINES = [
  'COSTUMEDEX v1.0',
  '════════════════',
  '>INIT HARDWARE......OK',
  '>LOAD COSTUME DB....OK',
  '>CALIB CRINGE SNS...OK',
  '>BUFFER JUDGMENT....OK',
  '>FIELD PROTOCOLS....OK',
  '',
  'READY TO SCAN.',
];

function BootScreen({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx < BOOT_LINES.length) {
      const delay = idx === 0 ? 500 : 260 + Math.random() * 180;
      const t = setTimeout(() => {
        setLines(l => [...l, BOOT_LINES[idx]]);
        setIdx(i => i + 1);
      }, delay);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onComplete, 700);
      return () => clearTimeout(t);
    }
  }, [idx, onComplete]);

  return (
    <div className="bootScreen">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`bootLine${line === 'READY TO SCAN.' ? ' ready' : ''}`}
        >
          {line || ' '}
        </div>
      ))}
      {idx < BOOT_LINES.length && <span className="bootCursor">▋</span>}
    </div>
  );
}

// ─── Error screen ─────────────────────────────────────────
function ErrorScreen({ message }) {
  return (
    <div className="errorScreen">
      <div className="errorIcon">!</div>
      <div className="errorTitle">SIGNAL LOST</div>
      <div className="errorMsg">{message || 'UNKNOWN ANOMALY DETECTED'}</div>
      <div className="errorHint">RETURNING TO SCAN...</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]           = useState('boot');
  const [ledState, setLedState]       = useState('blinking');
  const [currentEntry, setCurrentEntry] = useState(null);
  const [scanCount, setScanCount]     = useState(0);
  const [scanError, setScanError]     = useState(null);
  // Voice persisted in localStorage; default off
  const [voiceEnabled, setVoiceEnabled] = useState(
    () => localStorage.getItem('costumedex_voice') === 'on'
  );

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('costumedex_history') || '[]'); }
    catch { return []; }
  });

  const cameraRef = useRef(null);
  const frozenImageRef = useRef(null);
  const scrollRef = useRef(null);

  // Boot complete
  const handleBootComplete = useCallback(() => {
    setLedState('ready');
    setScreen('camera');
  }, []);

  // A button ── scan or save card
  const handleA = useCallback(async () => {
    if (screen === 'camera') {
      // Unlock speech synchronously inside the user-gesture handler (iOS requirement)
      unlockSpeech();

      let base64 = null;
      if (cameraRef.current?._pendingFile) {
        base64 = cameraRef.current._pendingFile;
        cameraRef.current._pendingFile = null;
      } else {
        base64 = cameraRef.current?.capture?.();
      }
      if (!base64) return;

      stopSpeech(); // stop any playing entry before new scan
      frozenImageRef.current = base64;
      setScreen('scanning');
      setLedState('scanning');

      const thumbPromise = createThumbnail(base64);

      try {
        const [apiRes, thumb] = await Promise.all([
          fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
          }).then(async r => {
            if (!r.ok) {
              const e = await r.json().catch(() => ({ error: 'SIGNAL LOST' }));
              throw new Error(e.error || 'SIGNAL LOST');
            }
            return r.json();
          }),
          thumbPromise,
        ]);

        const newId = scanCount + 1;
        const entry = {
          id: newId,
          data: apiRes,
          image: base64,
          thumbnail: thumb,
          timestamp: Date.now(),
        };

        setHistory(prev => {
          const next = [entry, ...prev].slice(0, 30);
          localStorage.setItem('costumedex_history', JSON.stringify(next));
          return next;
        });
        setScanCount(newId);
        setCurrentEntry(entry);
        setLedState('ready');
        setScreen('result');

        if (voiceEnabled) speakEntry(entry);
      } catch (err) {
        setScanError(err.message || 'SIGNAL LOST');
        setLedState('blinking');
        setScreen('error');
        const t = setTimeout(() => {
          setScreen('camera');
          setLedState('ready');
          setScanError(null);
          frozenImageRef.current = null;
        }, 2800);
        return () => clearTimeout(t);
      }
    } else if (screen === 'result' && currentEntry) {
      await saveCard(currentEntry);
    }
  }, [screen, scanCount, currentEntry, voiceEnabled]);

  // B button ── back (stop speech when leaving result)
  const handleB = useCallback(() => {
    if (screen === 'result' || screen === 'history' || screen === 'error') {
      stopSpeech();
      setScreen('camera');
      frozenImageRef.current = null;
    }
  }, [screen]);

  // Start ── toggle Dex (stop speech when leaving result)
  const handleStart = useCallback(() => {
    if (screen === 'camera') setScreen('history');
    else if (screen === 'history') setScreen('camera');
    else if (screen === 'result') { stopSpeech(); setScreen('history'); }
  }, [screen]);

  // Select ── toggle voice, persisted in localStorage
  const handleSelect = useCallback(() => {
    setVoiceEnabled(prev => {
      const next = !prev;
      localStorage.setItem('costumedex_voice', next ? 'on' : 'off');
      if (!next) stopSpeech();
      return next;
    });
  }, []);

  // D-pad scroll
  const handleDpadUp   = useCallback(() => scrollRef.current?.scrollBy({ top: -72, behavior: 'smooth' }), []);
  const handleDpadDown = useCallback(() => scrollRef.current?.scrollBy({ top: 72,  behavior: 'smooth' }), []);

  // Keyboard shortcuts (desktop testing)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'a' || e.key === 'A') handleA();
      if (e.key === 'b' || e.key === 'B') handleB();
      if (e.key === 'Enter') handleStart();
      if (e.key === 'ArrowUp')   handleDpadUp();
      if (e.key === 'ArrowDown') handleDpadDown();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleA, handleB, handleStart, handleDpadUp, handleDpadDown]);

  // Choose screen content
  let content;
  if (screen === 'boot') {
    content = <BootScreen onComplete={handleBootComplete} />;
  } else if (screen === 'camera' || screen === 'scanning') {
    content = (
      <CameraView
        ref={cameraRef}
        scanning={screen === 'scanning'}
        frozenImage={frozenImageRef.current}
      />
    );
  } else if (screen === 'result') {
    content = <ScanResult entry={currentEntry} scrollRef={scrollRef} />;
  } else if (screen === 'history') {
    content = (
      <DexHistory
        history={history}
        onSelect={entry => { setCurrentEntry(entry); setScreen('result'); }}
      />
    );
  } else if (screen === 'error') {
    content = <ErrorScreen message={scanError} />;
  }

  return (
    <Device
      ledState={ledState}
      scanCount={scanCount}
      onA={handleA}
      onB={handleB}
      onDpadUp={handleDpadUp}
      onDpadDown={handleDpadDown}
      onStart={handleStart}
      onSelect={handleSelect}
      voiceEnabled={voiceEnabled}
    >
      {content}
    </Device>
  );
}
