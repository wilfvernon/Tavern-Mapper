export function createDisplayHtml() {
  return `<!DOCTYPE html>
<html><head><title>Tavern Mapper Display</title>
<style>
  html, body { margin:0; padding:0; background:#000; height:100%; overflow:hidden; cursor:none; }
  canvas { display:block; }
  #rollBanner {
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: rgba(10,11,14,0.88); color: #fff; padding: 16px 30px; border-radius: 12px;
    font-size: 28px; font-weight: 600; font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    display: none; z-index: 10; white-space: nowrap;
  }
  #initiativePanel {
    position: fixed; background: rgba(10,11,14,0.88); color: #fff;
    padding: 10px 12px; border-radius: 10px; font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 15px; display: none; z-index: 10; min-width: 150px; transform-origin: center;
    box-sizing: border-box; user-select: none; pointer-events: auto; cursor: default;
  }
  #initiativePanel .init-round { font-size: 12px; color: #8b92a3; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  #initiativePanel .init-table { display: grid; width: 100%; column-gap: clamp(6px, 2vw, 12px); align-items: center; }
  #initiativePanel .init-row { display: contents; }
  #initiativePanel .init-head { color: #8b92a3; font-size: 11px; text-transform: uppercase; }
  #initiativePanel .init-cell { min-width: 0; padding: 3px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #initiativePanel .init-reaction { width: 1em; color: #b989ff; text-align: center; overflow: visible; }
  #initiativePanel .init-reaction.used { color: #596172; opacity: 0.55; }
  #initiativePanel .init-name { overflow: visible; text-overflow: clip; }
  #initiativePanel .init-current { color: #7c9cff; font-weight: 700; }
</style></head>
<body>
<canvas id="displayCanvas"></canvas>
<div id="rollBanner"></div>
<div id="initiativePanel"></div>
<script>
  const c = document.getElementById('displayCanvas');
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    c.style.width = window.innerWidth + 'px';
    c.style.height = window.innerHeight + 'px';
    c.getContext('2d').fillStyle = '#000';
    c.getContext('2d').fillRect(0,0,c.width,c.height);
    if (window.opener && window.opener.__fogRedraw) window.opener.__fogRedraw();
    if (window.opener && window.opener.__updateDisplayExtras) window.opener.__updateDisplayExtras();
  }
  window.addEventListener('resize', resize);
  resize();
<\/script>
</body></html>`;
}

export function createDisplayWindowManager({
  hostWindow = window,
  statusElement,
  redraw,
  updateExtras,
  setTimer = setTimeout,
  setRepeatingTimer = setInterval,
} = {}) {
  const displayHtml = createDisplayHtml();
  let displayWindow = null;

  function writeDocument() {
    displayWindow.document.open();
    displayWindow.document.write(displayHtml);
    displayWindow.document.close();
  }

  function scheduleRefresh() {
    setTimer(redraw, 150);
    setTimer(updateExtras, 150);
  }

  function openOrFocus() {
    if (displayWindow && !displayWindow.closed) {
      try {
        if (displayWindow.document.getElementById('displayCanvas')) {
          displayWindow.focus();
          return displayWindow;
        }
      } catch (error) {
        // A stale or cross-origin reference is replaced below.
      }
      try { displayWindow.close(); } catch (error) { /* best effort */ }
    }

    displayWindow = hostWindow.open('', 'TavernMapperDisplay',
      'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no,scrollbars=no');
    if (!displayWindow) {
      statusElement.textContent = 'Blocked by popup blocker — allow popups for this page and try again.';
      return null;
    }

    writeDocument();
    statusElement.innerHTML = '<strong>Connected.</strong> Drag that window to your TV screen, then press F11 on it for fullscreen.';
    displayWindow.addEventListener('load', redraw);
    scheduleRefresh();
    return displayWindow;
  }

  function checkHealth() {
    if (!displayWindow) return;
    if (displayWindow.closed) {
      statusElement.textContent = 'Display window closed.';
      displayWindow = null;
      return;
    }
    try {
      if (!displayWindow.document.getElementById('displayCanvas')) {
        writeDocument();
        statusElement.innerHTML = '<strong>Reconnected.</strong> The display window\'s content was restored automatically.';
        scheduleRefresh();
      }
    } catch (error) {
      statusElement.textContent = 'Lost connection to the display window — click "Open display window" to reconnect.';
    }
  }

  setRepeatingTimer(checkHealth, 1500);
  return { getWindow: () => displayWindow, openOrFocus, checkHealth };
}