import { useRef, useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import CenterPanel from './CenterPanel';
import AiStudioPanel from './AiStudioPanel';
import StoryboardMaker from './storyboard/StoryboardMaker';
import { useAppStore } from '../store/useAppStore';

const MIN_STUDIO_WIDTH = 280;
const MAX_STUDIO_WIDTH = 700;
const DEFAULT_STUDIO_WIDTH = 360;
const STORAGE_KEY = 'shotai_studio_width';

export default function MainLayout() {
  const isAiStudioOpen = useAppStore(state => state.isAiStudioOpen);
  const toggleAiStudio = useAppStore(state => state.toggleAiStudio);
  const studioView = useAppStore(state => state.studioView);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);

  useEffect(() => {
    const handleRenderingEvent = (e) => {
      setIsRenderingVideo(Boolean(e.detail?.isRendering));
    };
    window.addEventListener('ai-studio-rendering', handleRenderingEvent);
    return () => {
      window.removeEventListener('ai-studio-rendering', handleRenderingEvent);
    };
  }, []);

  const [studioWidth, setStudioWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Math.max(MIN_STUDIO_WIDTH, Math.min(MAX_STUDIO_WIDTH, parseInt(saved, 10))) : DEFAULT_STUDIO_WIDTH;
    } catch { return DEFAULT_STUDIO_WIDTH; }
  });

  const rightPanelRef = useRef(null);
  const toggleBtnRef = useRef(null);   // toggle button wrapper — moved in sync with panel
  const overlayRef = useRef(null);     // transparent overlay to capture mouse over webview
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const currentWidthRef = useRef(studioWidth);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_STUDIO_WIDTH, Math.max(MIN_STUDIO_WIDTH, startWidth.current + delta));
      currentWidthRef.current = newWidth;
      // Direct DOM — no re-render, zero lag
      if (rightPanelRef.current) {
        rightPanelRef.current.style.width = newWidth + 'px';
      }
      // Move toggle button in sync with panel
      if (toggleBtnRef.current) {
        toggleBtnRef.current.style.right = (newWidth + 5) + 'px';
      }
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Hide overlay — restore pointer events to webview
      if (overlayRef.current) overlayRef.current.style.display = 'none';
      const finalWidth = currentWidthRef.current;
      setStudioWidth(finalWidth);
      try { localStorage.setItem(STORAGE_KEY, String(finalWidth)); } catch {}
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onSplitterMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = currentWidthRef.current;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // Show full-screen overlay so webview can't steal mouse events
    if (overlayRef.current) overlayRef.current.style.display = 'block';
  }, []);

  const RightPanelContent = studioView === 'storyboard' ? StoryboardMaker : AiStudioPanel;

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#09090b',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
    }}>
      {/* 
        Full-screen transparent overlay — shown ONLY during drag.
        Sits on top of the webview to prevent it from stealing mouse events.
        pointer-events: all so it captures every mousemove/mouseup.
      */}
      <div
        ref={overlayRef}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          cursor: 'col-resize',
          backgroundColor: 'transparent',
        }}
      />

      {/* Left Sidebar */}
      <Sidebar />

      {/* Center Panel — always browser/webview */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
        <CenterPanel />
      </div>

      {/* Splitter + Right Panel */}
      <div
        onMouseDown={onSplitterMouseDown}
        style={{
          width: '5px',
          flexShrink: 0,
          height: '100%',
          backgroundColor: '#0f1f35',
          cursor: 'col-resize',
          position: 'relative',
          zIndex: 10,
          display: isAiStudioOpen ? 'block' : 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0f1f35'}
      >
        {/* grip dots */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#334155' }} />
          ))}
        </div>
      </div>

      {/* Right Panel - Always mounted to prevent losing state when closed */}
      <div
        ref={rightPanelRef}
        style={{
          width: isAiStudioOpen ? studioWidth : 0,
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
          borderLeft: isAiStudioOpen ? '1px solid #0f1f35' : 'none',
          display: isAiStudioOpen ? 'block' : 'none',
        }}
      >
        <div style={{ display: studioView === 'storyboard' ? 'block' : 'none', height: '100%' }}>
          <StoryboardMaker />
        </div>
        <div style={{ display: studioView !== 'storyboard' ? 'block' : 'none', height: '100%' }}>
          <AiStudioPanel />
        </div>
      </div>

      {/* Toggle Tab Button — sticks to left edge of right panel */}
      {!isRenderingVideo && (
        <div
          ref={toggleBtnRef}
          style={{
            position: 'absolute',
            right: isAiStudioOpen ? studioWidth + 5 : 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={toggleAiStudio}
            style={{
              writingMode: 'vertical-lr',
              transform: 'rotate(180deg)',
              padding: '24px 7px',
              borderRadius: '0 8px 8px 0',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '-3px 0 16px rgba(0,0,0,0.5)',
              backgroundColor: isAiStudioOpen ? '#ef4444' : '#10b981',
              color: 'white',
              transition: 'background-color 0.2s',
            }}
          >
            {isAiStudioOpen ? 'TUTUP AI STUDIO' : 'BUKA AI STUDIO'}
          </button>
        </div>
      )}
    </div>
  );
}
