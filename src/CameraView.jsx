import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import './CameraView.css';

const SCAN_MESSAGES = [
  'DETECTING DRIP...',
  'MEASURING CRINGE...',
  'CONSULTING SPIRITS...',
  'CALC EFFORT DEFICIT...',
  'ANALYZING CHOICES...',
  'CROSS-REF CRIMES...',
  'BUFFERING JUDGMENT...',
  'COMPILING SHADE...',
];

const CameraView = forwardRef(function CameraView({ scanning, frozenImage }, ref) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | active | denied
  const [facing, setFacing] = useState('environment');
  const [flash, setFlash] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);

  const startCamera = useCallback(async (facingMode) => {
    setStatus('loading');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('active');
    } catch {
      setStatus('denied');
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facing, startCamera]);

  // Scanning message cycle
  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => setMsgIdx(i => (i + 1) % SCAN_MESSAGES.length), 620);
    return () => clearInterval(id);
  }, [scanning]);

  useImperativeHandle(ref, () => ({
    capture() {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return null;
      const maxEdge = 1024;
      let w = video.videoWidth, h = video.videoHeight;
      if (w > h) { h = Math.round(h * maxEdge / w); w = maxEdge; }
      else       { w = Math.round(w * maxEdge / h); h = maxEdge; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
      return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    },
  }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Notify parent via imperative; store in ref for App to read
    const reader = new FileReader();
    reader.onload = () => {
      // trigger the same capture path via ref callback
      if (ref?.current) {
        ref.current._pendingFile = reader.result.split(',')[1];
      }
    };
    reader.readAsDataURL(file);
  };

  if (scanning && frozenImage) {
    return (
      <div className="cameraView">
        <div className="frozenFrame">
          <img src={`data:image/jpeg;base64,${frozenImage}`} alt="" />
          <div className="sweepLine" />
        </div>
        <div className="scanningOverlay">
          <div className="scanLabel">ANALYSING...</div>
          <div className="scanMessage">{SCAN_MESSAGES[msgIdx]}</div>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="cameraView">
        <div className="fallbackArea">
          <div className="fallbackIcon">📷</div>
          <div>CAMERA ACCESS DENIED</div>
          <div style={{ fontSize: 14, opacity: 0.65 }}>
            Use file picker to upload a costume photo
          </div>
          <label className="fileInputLabel">
            CHOOSE PHOTO
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="fileInput"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="cameraView">
      {flash && <div className="flashOverlay" />}

      {status === 'loading' && (
        <div className="cameraLoading">INITIALIZING OPTICS...</div>
      )}

      <video
        ref={videoRef}
        className="cameraVideo"
        playsInline
        muted
        autoPlay
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />

      {status === 'active' && (
        <>
          <div className="reticle">
            <div className="corner tl" />
            <div className="corner tr" />
            <div className="corner bl" />
            <div className="corner br" />
            <div className="reticleCenter" />
          </div>
          <button
            className="flipBtn"
            onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')}
            aria-label="Flip camera"
          >
            ⟳
          </button>
        </>
      )}
    </div>
  );
});

export default CameraView;
