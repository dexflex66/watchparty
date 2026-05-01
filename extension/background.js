let ws = null;
let isConnected = false;
let currentRoomId = null;
let currentUserId = null;
let currentBackendUrl = null;
let reconnectTimer = null;
let keepAliveInterval = null;

function parsePacket(raw) {
  if (!raw || raw.length === 0) return null;

  const engineType = raw[0];

  if (engineType === '0') return { engine: 'open' };
  if (engineType === '3') return { engine: 'pong' };
  if (engineType === '4') {
    const socketPayload = raw.slice(1);
    if (!socketPayload) return { engine: 'message', socket: null };

    const socketType = socketPayload[0];
    if (socketType === '0') return { engine: 'message', socket: 'connect' };
    if (socketType === '1') return { engine: 'message', socket: 'disconnect' };
    if (socketType === '2') {
      try {
        const arr = JSON.parse(socketPayload.slice(1));
        return { engine: 'message', socket: 'event', name: arr[0], data: arr[1] };
      } catch (_) {
        return null;
      }
    }
  }
  if (engineType === '2') return { engine: 'ping' };
  return null;
}

function emit(eventName, data) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send('42' + JSON.stringify([eventName, data]));
}

function forwardToTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      const url = tab.url || '';
      if (
        url.includes('netflix.com') ||
        url.includes('primevideo.com') ||
        url.includes('amazon.com/gp/video')
      ) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    }
  });
}

function connect(backendUrl, roomId, userId) {
  if (ws) {
    ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
    ws.close();
    ws = null;
  }

  currentBackendUrl = backendUrl;
  currentRoomId = roomId;
  currentUserId = userId;

  const wsUrl = backendUrl.replace(/^http/, 'ws') + '/socket.io/?EIO=4&transport=websocket';

  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    isConnected = false;
    return;
  }

  ws.onopen = () => {
    ws.send('40');
  };

  ws.onmessage = (event) => {
    const packet = parsePacket(event.data);
    if (!packet) return;

    if (packet.engine === 'ping') {
      ws.send('3');
      return;
    }

    if (packet.engine === 'open') {
      ws.send('40');
      return;
    }

    if (packet.engine === 'message' && packet.socket === 'connect') {
      isConnected = true;
      emit('join-room', { roomId: currentRoomId, userId: currentUserId });
      return;
    }

    if (packet.engine === 'message' && packet.socket === 'disconnect') {
      isConnected = false;
      return;
    }

    if (packet.engine === 'message' && packet.socket === 'event') {
      handleServerEvent(packet.name, packet.data);
    }
  };

  ws.onerror = () => {
    isConnected = false;
  };

  ws.onclose = () => {
    isConnected = false;
    ws = null;
    if (currentRoomId) {
      reconnectTimer = setTimeout(() => {
        if (currentRoomId) connect(currentBackendUrl, currentRoomId, currentUserId);
      }, 3000);
    }
  };
}

function handleServerEvent(name, data) {
  if (name === 'video-play') {
    forwardToTabs({ type: 'REMOTE_PLAY', currentTime: data.currentTime });
  } else if (name === 'video-pause') {
    forwardToTabs({ type: 'REMOTE_PAUSE', currentTime: data.currentTime });
  } else if (name === 'video-seek') {
    forwardToTabs({ type: 'REMOTE_SEEK', currentTime: data.currentTime });
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  currentRoomId = null;
  currentUserId = null;
  currentBackendUrl = null;
  isConnected = false;
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
}

function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    chrome.storage.local.get('userId', () => {});
  }, 20000);
}

startKeepAlive();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CONNECT') {
    connect(message.backendUrl, message.roomId, message.userId);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'DISCONNECT') {
    disconnect();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({ connected: isConnected, roomId: currentRoomId });
    return true;
  }

  if (message.type === 'VIDEO_EVENT') {
    if (isConnected) {
      const { event, currentTime, platform, url } = message;
      if (event === 'play') emit('video-play', { currentTime, platform, url, userId: currentUserId, roomId: currentRoomId });
      else if (event === 'pause') emit('video-pause', { currentTime, platform, url, userId: currentUserId, roomId: currentRoomId });
      else if (event === 'seek') emit('video-seek', { currentTime, platform, url, userId: currentUserId, roomId: currentRoomId });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'VIDEO_SOURCE') {
    sendResponse({ ok: true });
    return true;
  }
});
