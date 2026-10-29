import './DexHistory.css';

export default function DexHistory({ history, onSelect }) {
  return (
    <div className="dexHistory">
      <div className="historyHeader">
        FIELD LOG — {history.length} / 30 SPECIMENS
      </div>
      <div className="historyGrid">
        {history.length === 0 ? (
          <div className="historyEmpty">
            NO ENTRIES YET<br />SCAN A COSTUME<br />TO BEGIN
          </div>
        ) : (
          history.map(entry => (
            <div
              key={entry.id}
              className="historyItem"
              onClick={() => onSelect(entry)}
            >
              {entry.thumbnail ? (
                <img
                  src={`data:image/jpeg;base64,${entry.thumbnail}`}
                  alt={`Entry ${entry.id}`}
                />
              ) : (
                <div style={{ background: '#111', width: '100%', height: '100%' }} />
              )}
              <span className="historyNum">#{String(entry.id).padStart(3, '0')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
