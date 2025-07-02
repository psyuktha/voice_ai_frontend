import Vapi from '@vapi-ai/web';

// Replace with your real Vapi API Key and Assistant ID
const apiKey = "c4809287-e7b3-460e-b133-0a1fb55cb8ca";
const assistant = "a4af6274-8960-4b82-a219-69725b9d893f";

const vapi = new Vapi(apiKey);

let socket;
let isCallActive = false;
let transcriptMessages = [];

// DOM Elements
const startButton = document.getElementById('start-call');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const statusDot = statusIndicator.querySelector('.status-dot');
const connectionStatus = document.getElementById('connection-status');
const transcriptContainer = document.getElementById('transcript-container');
const loadingOverlay = document.getElementById('loading-overlay');
const currentTimeElement = document.getElementById('current-time');

// Initialize UI
function initializeUI() {
  updateConnectionStatus('connecting');
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
}

// Update current time
function updateCurrentTime() {
  const now = new Date();
  currentTimeElement.textContent = now.toLocaleTimeString();
}

// Update connection status
function updateConnectionStatus(status) {
  const connectionDot = connectionStatus.querySelector('.connection-dot');
  const statusSpan = connectionStatus.querySelector('span');
  
  switch (status) {
    case 'connecting':
      statusSpan.textContent = 'Connecting...';
      connectionStatus.className = 'connection-status connecting';
      break;
    case 'connected':
      statusSpan.textContent = 'Connected';
      connectionStatus.className = 'connection-status connected';
      break;
    case 'disconnected':
      statusSpan.textContent = 'Disconnected';
      connectionStatus.className = 'connection-status disconnected';
      break;
  }
}

// Update call status
function updateCallStatus(status, text) {
  statusText.textContent = text;
  
  if (status === 'calling') {
    statusDot.classList.add('calling');
    startButton.classList.add('calling');
    startButton.innerHTML = `
      <span class="button-icon">📞</span>
      <span class="button-text">End Call</span>
      <div class="button-ripple"></div>
    `;
  } else {
    statusDot.classList.remove('calling');
    startButton.classList.remove('calling');
    startButton.innerHTML = `
      <span class="button-icon">🎤</span>
      <span class="button-text">Proceed</span>
      <div class="button-ripple"></div>
    `;
  }
}

// Show loading overlay
function showLoading(show = true) {
  if (show) {
    loadingOverlay.classList.add('show');
  } else {
    loadingOverlay.classList.remove('show');
  }
}

// Add transcript message
function addTranscriptMessage(role, message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `transcript-message ${role}`;
  messageDiv.textContent = `${role === 'user' ? 'You' : 'Assistant'}: ${message}`;
  
  // Remove placeholder if it exists
  const placeholder = transcriptContainer.querySelector('.transcript-placeholder');
  if (placeholder) {
    placeholder.remove();
  }
  
  transcriptContainer.appendChild(messageDiv);
  transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
  
  transcriptMessages.push({ role, message, timestamp: new Date() });
}

// Clear transcript
function clearTranscript() {
  transcriptContainer.innerHTML = `
    <div class="transcript-placeholder">
      Transcript will appear here during the call...
    </div>
  `;
  transcriptMessages = [];
}

// Fetch call summary with improved error handling
function fetchCallSummary() {
  showLoading(true);
  
  fetch("https://voice-ai-ck2m.onrender.com/get-call-summary")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    })
    .then((data) => {
      console.log("📋 Raw summary string:", data.summary);
      try {
        const parsedSummary = JSON.parse(data.summary);
        displaySummary(parsedSummary);
      } catch (parseError) {
        console.error("❌ Error parsing summary JSON:", parseError);
        displaySummary({
          status: "completed",
          summary: data.summary,
          action_taken: "Call completed",
          follow_up_required: false,
          notes: "Summary received but could not be parsed as structured data"
        });
      }
    })
    .catch((error) => {
      console.error("❌ Error fetching summary:", error);
      displayErrorSummary(error.message);
    })
    .finally(() => {
      showLoading(false);
    });
}

// Initialize WebSocket with enhanced error handling
function initWebSocket() {
  updateConnectionStatus('connecting');
  
  socket = new WebSocket("https://voice-ai-ck2m.onrender.com/ws");

  socket.onopen = () => {
    console.log("📡 WebSocket connected to backend");
    updateConnectionStatus('connected');
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📋 Received structured summary via WebSocket");
      displaySummary(data);
    } catch (err) {
      if (event.data === "start-call") {
        console.log("📞 Received start-call command");
        startCall();
      } else {
        console.warn("⚠️ Unrecognized message:", event.data);
      }
    }
  };

  socket.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
    updateConnectionStatus('disconnected');
  };

  socket.onclose = () => {
    console.warn("🔌 WebSocket closed. Trying to reconnect...");
    updateConnectionStatus('disconnected');
    setTimeout(initWebSocket, 3000); // Reconnect after 3s
  };
}

// Enhanced call summary renderer
function displaySummary(summary) {
  const summaryContainer = document.getElementById("call-summary");
  
  summaryContainer.innerHTML = `
    <div class="summary-content">
      <h3>📄 Call Summary</h3>
      
      <div class="summary-item">
        <div class="summary-label">Status</div>
        <div class="summary-value highlight">${summary.status || 'Unknown'}</div>
      </div>
      
      <div class="summary-item">
        <div class="summary-label">Action Taken</div>
        <div class="summary-value">${summary.action_taken || 'No action specified'}</div>
      </div>
      
      <div class="summary-item">
        <div class="summary-label">Follow Up Required</div>
        <div class="summary-value ${summary.follow_up_required ? 'highlight' : ''}">
          ${summary.follow_up_required ? "Yes" : "No"}
        </div>
      </div>
      
      <div class="summary-item">
        <div class="summary-label">Notes</div>
        <div class="summary-value">${summary.notes || 'No additional notes'}</div>
      </div>
      
      <div class="summary-item">
        <div class="summary-label">Summary</div>
        <div class="summary-value">${summary.summary || 'No summary available'}</div>
      </div>
      
      <div class="summary-item">
        <div class="summary-label">Call Duration</div>
        <div class="summary-value">${formatCallDuration()}</div>
      </div>
    </div>
  `;
}

// Display error summary
function displayErrorSummary(errorMessage) {
  const summaryContainer = document.getElementById("call-summary");
  
  summaryContainer.innerHTML = `
    <div class="summary-content">
      <h3>⚠️ Summary Error</h3>
      
      <div class="summary-item">
        <div class="summary-label">Error</div>
        <div class="summary-value" style="color: var(--danger-color);">${errorMessage}</div>
      </div>
      
      <div class="summary-item">
        <div class="summary-label">Transcript Available</div>
        <div class="summary-value">${transcriptMessages.length > 0 ? 'Yes' : 'No'}</div>
      </div>
      
      ${transcriptMessages.length > 0 ? `
        <div class="summary-item">
          <div class="summary-label">Message Count</div>
          <div class="summary-value">${transcriptMessages.length} messages</div>
        </div>
      ` : ''}
    </div>
  `;
}

// Format call duration
function formatCallDuration() {
  if (transcriptMessages.length === 0) return 'Unknown';
  
  const firstMessage = transcriptMessages[0];
  const lastMessage = transcriptMessages[transcriptMessages.length - 1];
  const duration = lastMessage.timestamp - firstMessage.timestamp;
  
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
}

// Start or end call
function startCall() {
  if (isCallActive) {
    vapi.stop();
  } else {
    clearTranscript();
    vapi.start(assistant);
  }
}

// Handle call start button
startButton.addEventListener('click', startCall);

// Enhanced Vapi event handlers
vapi.on('call-start', () => {
  console.log('✅ Call started');
  isCallActive = true;
  updateCallStatus('calling', 'Call in progress...');
  addTranscriptMessage('system', 'Call started');
});

vapi.on('call-end', () => {
  console.log('🛑 Call ended');
  isCallActive = false;
  updateCallStatus('ready', 'Call ended - Processing...');
  addTranscriptMessage('system', 'Call ended');
  
  // Fetch summary after a delay to allow backend processing
  setTimeout(() => {
    fetchCallSummary();
    updateCallStatus('ready', 'Ready to start');
  }, 10000);
});

vapi.on('message', (message) => {
  if (message.type === 'transcript') {
    console.log(`${message.role}: ${message.transcript}`);
    
    // Add to transcript display
    if (message.transcript && message.transcript.trim()) {
      addTranscriptMessage(message.role, message.transcript);
    }
  }
});

vapi.on('error', (error) => {
  console.error('❌ Vapi error:', error);
  isCallActive = false;
  updateCallStatus('ready', 'Error occurred - Ready to retry');
  addTranscriptMessage('system', `Error: ${error.message || 'Unknown error'}`);
});

// Initialize everything
function initialize() {
  initializeUI();
  initWebSocket();
  updateCallStatus('ready', 'Ready to start');
}

// Start the application
initialize();
