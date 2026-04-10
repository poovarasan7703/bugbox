/**
 * BugBox Capture SDK
 * Add this script to your app to capture console logs and user actions
 * <script src="http://localhost:3001/capture-sdk.js"></script>
 */
(function () {
  const BUGBOX_ORIGIN = 'http://localhost:3001';
  const WS_URL = 'ws://localhost:3001/ws';
  let ws = null;
  let sessionId = null;
  let isRecording = false;
  let startTime = null;

  function getSessionId() {
    return new URLSearchParams(window.location.search).get('bugbox_session') ||
      sessionStorage.getItem('bugbox_session');
  }

  function send(event) {
    if (!isRecording || !sessionId || !ws || ws.readyState !== WebSocket.OPEN) return;
    const payload = {
      type: event.type,
      ...event,
      timestamp: Date.now() - startTime,
      wallTime: new Date().toISOString(),
    };
    ws.send(JSON.stringify(payload));
  }

  // Console capture
  const originalConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  ['log', 'warn', 'error', 'info'].forEach(level => {
    console[level] = function (...args) {
      originalConsole[level].apply(console, args);
      send({
        type: 'console',
        level,
        args: args.map(a => {
          if (typeof a === 'object') try { return JSON.stringify(a); } catch (_) { return String(a); }
          return String(a);
        }),
      });
    };
  });

  // User action capture
  const captureEvent = (type) => (e) => {
    if (!isRecording) return;
    const target = e.target;
    const selector = getSelector(target);
    send({
      type: 'user',
      action: type,
      selector,
      tagName: target.tagName,
      id: target.id,
      className: target.className,
      value: target.value !== undefined ? String(target.value).slice(0, 200) : undefined,
      text: target.innerText?.slice(0, 100),
    });
  };

  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el && el.nodeType === 1) {
      let sel = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => !c.startsWith('bugbox')).slice(0, 2);
        if (classes.length) sel += '.' + classes.join('.');
      }
      path.unshift(sel);
      if (path.length > 4) break;
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  document.addEventListener('click', captureEvent('click'), true);
  document.addEventListener('keydown', (e) => {
    if (!isRecording) return;
    send({
      type: 'user',
      action: 'keydown',
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    });
  }, true);

  // Start/stop API
  window.BugBox = {
    start: function (sid) {
      sessionId = sid || getSessionId();
      if (!sessionId) {
        console.warn('BugBox: No session ID. Open BugBox dashboard first.');
        return false;
      }
      startTime = Date.now();
      isRecording = true;
      ws = new WebSocket(`${WS_URL}?sessionId=${sessionId}&role=capture`);
      ws.onopen = () => send({ type: 'session_start', url: window.location.href });
      return true;
    },
    stop: function () {
      isRecording = false;
      if (ws) ws.close();
    },
    setSessionId: function (sid) {
      sessionId = sid;
      sessionStorage.setItem('bugbox_session', sid);
    },
  };
})();
