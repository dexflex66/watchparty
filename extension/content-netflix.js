(function () {
  let video = null;
  let isSyncing = false;
  let syncTimer = null;
  let pauseDebounceTimer = null;
  let attached = false;

  function clearSyncing() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { isSyncing = false; }, 500);
  }

  function sendEvent(event, currentTime) {
    chrome.runtime.sendMessage({
      type: 'VIDEO_EVENT',
      event,
      currentTime,
      platform: 'netflix',
      url: window.location.href
    }).catch(() => {});
  }

  function onPlay() {
    if (isSyncing) return;
    sendEvent('play', video.currentTime);
  }

  function onPause() {
    if (isSyncing) return;
    if (pauseDebounceTimer) clearTimeout(pauseDebounceTimer);
    pauseDebounceTimer = setTimeout(() => {
      if (video && video.paused && !isSyncing) {
        sendEvent('pause', video.currentTime);
      }
    }, 300);
  }

  function onSeeked() {
    if (isSyncing) return;
    sendEvent('seek', video.currentTime);
  }

  function attach(el) {
    if (attached && video === el) return;
    if (video && attached) {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    }
    video = el;
    attached = true;
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
  }

  function findVideo() {
    const videos = document.querySelectorAll('video');
    if (videos.length > 0) return videos[0];
    return null;
  }

  function tryAttach() {
    const el = findVideo();
    if (el) attach(el);
  }

  const observer = new MutationObserver(() => {
    if (!attached) tryAttach();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  tryAttach();
  const fallback = setInterval(() => {
    if (attached) { clearInterval(fallback); return; }
    tryAttach();
  }, 1000);

  chrome.runtime.onMessage.addListener((message) => {
    if (!video) return;

    if (message.type === 'REMOTE_PLAY') {
      isSyncing = true;
      if (Math.abs(video.currentTime - message.currentTime) > 2) {
        video.currentTime = message.currentTime;
      }
      video.play().catch(() => {});
      clearSyncing();
    } else if (message.type === 'REMOTE_PAUSE') {
      isSyncing = true;
      if (Math.abs(video.currentTime - message.currentTime) > 2) {
        video.currentTime = message.currentTime;
      }
      video.pause();
      clearSyncing();
    } else if (message.type === 'REMOTE_SEEK') {
      isSyncing = true;
      video.currentTime = message.currentTime;
      clearSyncing();
    }
  });

  window.dispatchEvent(new CustomEvent('watchparty-extension-connected'));

  chrome.runtime.sendMessage({
    type: 'VIDEO_SOURCE',
    platform: 'netflix',
    url: window.location.href
  }).catch(() => {});
})();
