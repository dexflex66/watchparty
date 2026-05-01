const backendUrlInput = document.getElementById('backend-url');
const roomIdInput = document.getElementById('room-id');
const userIdInput = document.getElementById('user-id');
const connectBtn = document.getElementById('connect-btn');
const dot = document.getElementById('dot');
const statusText = document.getElementById('status-text');
const roomInfo = document.getElementById('room-info');

let polling = null;

async function load() {
  const data = await chrome.storage.local.get(['backendUrl', 'roomId', 'userId']);
  backendUrlInput.value = data.backendUrl || 'http://localhost:3001';
  roomIdInput.value = data.roomId || '';

  let userId = data.userId;
  if (!userId) {
    userId = crypto.randomUUID();
    await chrome.storage.local.set({ userId });
  }
  userIdInput.value = userId;
}

function setConnectedUI(connected, roomId) {
  if (connected) {
    dot.classList.add('connected');
    statusText.textContent = 'Connected';
    connectBtn.textContent = 'Disconnect';
    connectBtn.classList.add('disconnect');
    roomInfo.innerHTML = roomId ? `Room: <span>${roomId}</span>` : '';
  } else {
    dot.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    connectBtn.textContent = 'Connect';
    connectBtn.classList.remove('disconnect');
    roomInfo.textContent = '';
  }
}

async function pollStatus() {
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (resp) setConnectedUI(resp.connected, resp.roomId);
  } catch (_) {
    setConnectedUI(false, null);
  }
}

connectBtn.addEventListener('click', async () => {
  const isConnected = connectBtn.classList.contains('disconnect');

  if (isConnected) {
    await chrome.runtime.sendMessage({ type: 'DISCONNECT' });
    setConnectedUI(false, null);
    return;
  }

  const backendUrl = backendUrlInput.value.trim() || 'http://localhost:3001';
  const roomId = roomIdInput.value.trim();
  const userId = userIdInput.value.trim();

  if (!roomId) {
    roomIdInput.focus();
    return;
  }

  await chrome.storage.local.set({ backendUrl, roomId, userId });
  await chrome.runtime.sendMessage({ type: 'CONNECT', backendUrl, roomId, userId });
});

load();
pollStatus();
polling = setInterval(pollStatus, 1000);

window.addEventListener('unload', () => {
  if (polling) clearInterval(polling);
});
