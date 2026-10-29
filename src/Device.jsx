import './Device.css';

export default function Device({
  children,
  ledState = 'ready',   // 'blinking' | 'ready' | 'scanning'
  scanCount = 0,
  onA,
  onB,
  onDpadUp,
  onDpadDown,
  onStart,
  onSelect,
  voiceEnabled,
}) {
  const ledClass = ledState === 'blinking' || ledState === 'boot'
    ? 'blink'
    : ledState === 'scanning'
    ? 'scanning'
    : '';

  return (
    <div className="device">
      {/* ── Top panel ───────────────── */}
      <div className="topPanel">
        <div className="lens" />
        <div className="leds">
          <div className={`led red ${ledClass}`} />
          <div className={`led yellow ${ledClass}`} />
          <div className={`led green ${ledClass}`} />
        </div>
        <div className="deviceTitle">
          COSTUMEDEX<br />v1.0
        </div>
      </div>

      {/* ── Main screen ─────────────── */}
      <div className="screenBezel">
        <div className="screenInner">
          {children}
        </div>
      </div>

      {/* ── Speaker grille ──────────── */}
      <div className="speaker" />

      {/* ── Mini status screen ──────── */}
      <div className="miniScreen">
        <span>SCANS</span>
        <strong>{String(scanCount).padStart(3, '0')}</strong>
      </div>

      {/* ── Controls ────────────────── */}
      <div className="controlPanel">
        <div className="dpad">
          <div className="dpadArm dpadH" />
          <div className="dpadArm dpadV" />
          <div className="dpadCenter" />
          <button className="dpadBtn up"    onClick={onDpadUp}   aria-label="up">▲</button>
          <button className="dpadBtn down"  onClick={onDpadDown} aria-label="down">▼</button>
          <button className="dpadBtn left"  aria-label="left">◀</button>
          <button className="dpadBtn right" aria-label="right">▶</button>
        </div>

        <div className="actionButtons">
          <button className="btnB" onClick={onB}  aria-label="B — back">B</button>
          <button className="btnA" onClick={onA}  aria-label="A — scan / confirm">A</button>
        </div>

        <div className="menuButtons">
          <button
            className={`menuBtn${voiceEnabled ? ' voiceOn' : ''}`}
            onClick={onSelect}
            aria-label="Select — toggle voice"
          >
            {voiceEnabled ? '♪ ON' : '♪ OFF'}
          </button>
          <button className="menuBtn" onClick={onStart} aria-label="Start — open dex">
            DEX
          </button>
        </div>
      </div>
    </div>
  );
}
