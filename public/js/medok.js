// =========================================================================
// STATE & DATA
// =========================================================================
if (!sessionStorage.getItem('loggedIn')) window.location.href = 'index.html';
const familyMembers = [
  {
    id: 'gretta',
    name: 'Gretta',
    meta: 'Female • 28 yrs',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=140&q=80',
    fallback: 'https://placehold.co/100x100/8CE2E0/25292E?text=G',
    summary: 'The patient has no known severe allergies. Regularly tracks annual checkups and seasonal wellness. Maintaining updated prescription logs for family doctor review.',
    visits: 14, prescriptions: 6, docs: 9
  },
  {
    id: 'john',
    name: 'John',
    meta: 'Male • 32 yrs',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=140&q=80',
    fallback: 'https://placehold.co/100x100/3CC5F0/FFFFFF?text=J',
    summary: 'Active lifestyle, monitors seasonal pollen sensitivity and routine cardiovascular checkups. No chronic conditions detected on last annual screening.',
    visits: 8, prescriptions: 2, docs: 5
  },
  {
    id: 'maya',
    name: 'Maya',
    meta: 'Female • 6 yrs',
    avatar: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=140&q=80',
    fallback: 'https://placehold.co/100x100/5DE3B5/25292E?text=M',
    summary: 'Pediatric growth milestones on track. Routine immunization schedule up to date. Occasional mild seasonal cold symptoms during spring.',
    visits: 11, prescriptions: 3, docs: 7
  }
];

let activePatientIndex = 0;
let autoSpeakEnabled = true;
let isRecording = false;
let recognition = null;
let pendingAttachment = null;

// Sample initial conversation
const defaultMessages = [
  { id: 1, sender: 'user', text: 'Hello! I visited the doctor and received a prescription for medication. Can you help me add this information to my medical record?' },
  { id: 2, sender: 'ai', text: 'Good day! Of course, I can help you with this. Please provide me with your documents, and I will add this information to your medical record.' },
  { id: 3, sender: 'user', text: '', isPrescriptionCard: true, prescriptionTitle: 'Pharmacy Prescription Receipt', prescriptionDrug: 'Amoxicillin 500mg CAP • 20 Capsules', prescriptionRef: 'RX #2026-8841 • Verified' },
  { id: 4, sender: 'ai', text: 'Adding this information to your record. The prescription has been saved in Gretta’s health profile. If you need anything else, please let me know.' },
  { id: 5, sender: 'user', text: 'And recommend where I can purchase the necessary medication?' }
];

let chatHistory = JSON.parse(JSON.stringify(defaultMessages));

const historyTopics = {
  sore_throat: [
    { id: 101, sender: 'user', text: 'What should I do if I have a sore throat and mild fever?' },
    { id: 102, sender: 'ai', text: 'For a mild sore throat, stay well-hydrated with warm liquids, gargle with warm salt water, and rest your voice. If your fever exceeds 101°F (38.3°C) or lasts more than 48 hours, please schedule an in-person throat evaluation with your physician.' }
  ],
  cold_vs_flu: [
    { id: 103, sender: 'user', text: 'How can I distinguish between a common cold and the flu?' },
    { id: 104, sender: 'ai', text: 'A common cold usually develops gradually with a runny nose, sneezing, and mild throat irritation. Influenza (the flu) tends to appear abruptly with high fever, body aches, fatigue, and dry cough.' }
  ],
  headache: [
    { id: 105, sender: 'user', text: 'What can I do to relieve a severe tension headache?' },
    { id: 106, sender: 'ai', text: 'Try resting in a quiet, dimly lit room, applying a cool compress to your forehead, and drinking a full glass of water. Seek immediate medical care if a headache is sudden and explosive or accompanied by vision changes.' }
  ],
  preventive: [
    { id: 107, sender: 'user', text: 'Are there any preventive measures for seasonal respiratory infections?' },
    { id: 108, sender: 'ai', text: 'Consistent hand hygiene, annual vaccinations, balanced nutrition rich in Vitamin D and C, quality sleep, and staying hydrated significantly strengthen your immune resilience.' }
  ],
  symptoms: [
    { id: 109, sender: 'user', text: 'What are the common symptoms of mild dehydration?' },
    { id: 110, sender: 'ai', text: 'Early signs include dry mouth, darker urine, fatigue, lightheadedness, and reduced concentration. Sipping water or an oral electrolyte solution steadily helps restore balance.' }
  ],
  allergies: [
    { id: 111, sender: 'user', text: 'How can I manage my seasonal allergies naturally alongside medication?' },
    { id: 112, sender: 'ai', text: 'Using saline nasal rinses after being outdoors, keeping bedroom windows closed during high pollen counts, and showering before sleep can substantially reduce allergen exposure.' }
  ],
  treatments: [
    { id: 113, sender: 'user', text: 'What are some effective treatments for lower back stiffness?' },
    { id: 114, sender: 'ai', text: 'Gentle walking, light mobility stretches, and alternating warm compresses for 15–20 minutes help relax tight muscles. Avoid prolonged bed rest unless advised by your doctor.' }
  ]
};

// =========================================================================
// INITIALIZATION
// =========================================================================
window.onload = function () {
  renderFamilySwitcher();
  renderMessages();
  initSpeechRecognition();
};

function showToast(msg) {
  const banner = document.getElementById('toastBanner');
  const text = document.getElementById('toastMessage');
  text.textContent = msg;
  banner.classList.remove('hidden');
  banner.classList.add('flex');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    banner.classList.add('hidden');
    banner.classList.remove('flex');
  }, 3200);
}

// =========================================================================
// FAMILY PROFILE PANEL LOGIC
// =========================================================================
function renderFamilySwitcher() {
  const listEl = document.getElementById('familyAvatarList');
  listEl.innerHTML = '';

  familyMembers.forEach((member, idx) => {
    const isActive = idx === activePatientIndex;
    const btn = document.createElement('button');
    btn.onclick = () => selectPatient(idx);
    btn.className = `relative rounded-xl overflow-hidden transition-all duration-200 ${
      isActive
        ? 'w-12 h-12 ring-2 ring-medCyan scale-105 shadow-sm'
        : 'w-10 h-10 opacity-60 hover:opacity-95'
    }`;
    btn.title = member.name;
    btn.innerHTML = `
      <img src="${member.avatar}" onerror="this.src='${member.fallback}'" alt="${member.name}" class="w-full h-full object-cover" />
    `;
    listEl.appendChild(btn);
  });

  const current = familyMembers[activePatientIndex];
  document.getElementById('patientName').textContent = current.name;
  document.getElementById('patientMeta').textContent = current.meta;
  document.getElementById('patientSummary').textContent = current.summary;
  document.getElementById('metricVisits').textContent = current.visits;
  document.getElementById('metricPrescriptions').textContent = current.prescriptions;
  document.getElementById('metricDocs').textContent = current.docs;
  document.getElementById('activePatientBadge').innerHTML = `Patient: <strong class="text-[#1E232A]">${current.name}</strong>`;
}

function selectPatient(idx) {
  activePatientIndex = idx;
  renderFamilySwitcher();
  renderMessages();
  showToast(`Switched active patient profile to ${familyMembers[idx].name}`);
}

function cyclePatient(direction) {
  activePatientIndex = (activePatientIndex + direction + familyMembers.length) % familyMembers.length;
  renderFamilySwitcher();
  renderMessages();
}

function requestSecondOpinion() {
  const current = familyMembers[activePatientIndex];
  sendQuickPrompt(`Can you prepare a summary of ${current.name}'s recent symptoms and prescriptions for a specialist second opinion?`);
}

// =========================================================================
// CHAT RENDERING & MESSAGE ACTIONS
// =========================================================================
function renderMessages() {
  const container = document.getElementById('chatMessagesContainer');
  const currentPatient = familyMembers[activePatientIndex];

  container.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-[10px] font-semibold tracking-wider uppercase text-gray-400">TODAY</span>
      <div class="h-[1px] flex-1 bg-gray-100"></div>
    </div>
  `;

  chatHistory.forEach((msg) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-enter';

    if (msg.sender === 'user') {
      wrapper.innerHTML = `
        <div class="flex items-start justify-end gap-3">
          <div class="max-w-[82%] sm:max-w-[72%]">
            ${
              msg.isPrescriptionCard
                ? renderPrescriptionReceiptCard(msg)
                : `<div class="text-[13.5px] leading-[1.55] text-[#1E232A] text-right py-1">${escapeHtml(msg.text)}</div>`
            }
            ${
              msg.attachmentName && !msg.isPrescriptionCard
                ? `<div class="mt-2 inline-flex items-center gap-2 bg-medBg border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700">
                     <span class="font-bold text-teal-600">Rx</span>
                     <span>${escapeHtml(msg.attachmentName)}</span>
                   </div>`
                : ''
            }
          </div>
          <img src="${currentPatient.avatar}" onerror="this.src='${currentPatient.fallback}'" alt="${currentPatient.name}" class="w-9 h-9 rounded-full object-cover shrink-0 shadow-xs" />
        </div>
      `;
    } else {
      wrapper.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-xl bg-medTeal text-[#16242C] font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-xs select-none">OK</div>
          <div class="flex items-start gap-2 max-w-[85%] sm:max-w-[78%]">
            <div class="bg-medBubble rounded-2xl rounded-tl-sm px-4 py-3.5 text-[13.5px] leading-[1.6] text-[#2B313B]">
              ${formatAiText(msg.text)}
            </div>
            <div class="flex flex-col items-center gap-1.5 pt-1 text-gray-400">
              <button onclick="copyMessageText(${msg.id})" title="Copy response" class="p-1 hover:text-[#1E232A] rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
              </button>
              <button onclick="speakTextById(${msg.id})" title="Listen to answer aloud" class="p-1 hover:text-medCyan rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              <button onclick="rateMessage(this, 'up')" title="Helpful" class="p-1 hover:text-emerald-600 rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
              </button>
              <button onclick="rateMessage(this, 'down')" title="Not helpful" class="p-1 hover:text-red-500 rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    container.appendChild(wrapper);
  });

  container.scrollTop = container.scrollHeight;
}

function renderPrescriptionReceiptCard(msg) {
  return `
    <div class="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-xs w-56 sm:w-64 text-left ml-auto">
      <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
        <div class="flex items-center gap-1.5">
          <span class="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">+</span>
          <span class="text-[11px] font-bold text-emerald-700">Pharmacy</span>
        </div>
        <span class="text-[9px] text-gray-400">RECEIPT</span>
      </div>
      <p class="text-[10px] font-bold text-center tracking-wide text-gray-700 mb-1.5">PRESCRIPTION RECEIPT</p>
      <div class="space-y-1 text-[10px] text-gray-500 font-mono bg-medBg/70 p-2 rounded-lg">
        <p class="font-semibold text-gray-800">${escapeHtml(msg.prescriptionDrug || '30 CAP Drug Name Here')}</p>
        <p>Dosage: 1 cap every 8 hours</p>
        <p class="text-emerald-700 font-semibold">${escapeHtml(msg.prescriptionRef || 'Verified Digital Rx')}</p>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAiText(text) {
  let safe = escapeHtml(text);
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#1E232A]">$1</strong>');
  safe = safe.replace(/\n/g, '<br/>');
  return safe;
}

function copyMessageText(id) {
  const msg = chatHistory.find((m) => m.id === id);
  if (!msg) return;
  const tempArea = document.createElement('textarea');
  tempArea.value = msg.text;
  document.body.appendChild(tempArea);
  tempArea.select();
  document.execCommand('copy');
  document.body.removeChild(tempArea);
  showToast('Copied medical response to clipboard');
}

function rateMessage(btn, dir) {
  btn.classList.toggle(dir === 'up' ? 'text-emerald-600' : 'text-red-500');
  showToast(dir === 'up' ? 'Thanks for your feedback!' : 'Feedback noted to improve responses');
}

// =========================================================================
// GEMINI API INTEGRATION (AI FAMILY DOCTOR)
// =========================================================================
async function callGeminiMedicalAssistant(userQuery) {
  const currentPatient = familyMembers[activePatientIndex];
  const apiKey = ''; // <-- put your Google Gemini API key here (never expose it in public production code)
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const systemPrompt = `You are 'medOK AI Family Doctor (V 5.0)', an empathetic, knowledgeable, and reassuring medical information assistant inside the medOK patient dashboard.
Active patient context: ${currentPatient.name} (${currentPatient.meta}). Medical summary: ${currentPatient.summary}.
Guidelines:
- Give clear, structured, easy-to-understand clinical guidance in a warm, supportive tone.
- Keep responses concise (around 2–4 short paragraphs or bullet points) so they sound natural when read aloud via voice synthesis.
- Remind the user gently when appropriate to confirm dosing or diagnosis with a licensed physician, without sounding robotic.`;

  const recentTurns = chatHistory.slice(-6).map((m) => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: m.text || '[Uploaded Prescription Document]' }]
  }));

  recentTurns.push({ role: 'user', parts: [{ text: userQuery }] });

  const payload = {
    contents: recentTurns,
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  // Retry with exponential backoff
  const delays = [1000, 2000, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      const replyText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText) return replyText.trim();
      throw new Error('Empty response');
    } catch (err) {
      if (attempt < delays.length) {
        await new Promise((res) => setTimeout(res, delays[attempt]));
      } else {
        return generateLocalFallbackMedicalReply(userQuery, currentPatient);
      }
    }
  }
}

function generateLocalFallbackMedicalReply(query, patient) {
  const q = query.toLowerCase();
  if (q.includes('purchase') || q.includes('pharmacy') || q.includes('where')) {
    return `Based on **${patient.name}'s** saved digital prescription, you can order the medication through any licensed local pharmacy or verified online dispensary.\n\n• Present your **Digital Rx #2026-8841** at checkout for instant verification.\n• Always check that the pharmacist reviews dosage instructions with you.`;
  }
  if (q.includes('side effect')) {
    return `Common mild side effects can include temporary stomach upset or drowsiness depending on the medication class. Taking doses with water or a light meal often helps.\n\nIf you notice any rash, swelling, or difficulty breathing, stop use and seek immediate medical evaluation.`;
  }
  return `Thank you for sharing that, **${patient.name}**. I have noted your question in your consultation log. Stay hydrated, monitor any changes in your symptoms over the next 24 hours, and consult your primary care physician if discomfort persists.`;
}

// =========================================================================
// SEND MESSAGE & ASSISTANT WORKFLOW
// =========================================================================
async function handleSendMessage(viaVoice = false) {
  const input = document.getElementById('chatInput');
  const rawText = input.value.trim();

  if (!rawText && !pendingAttachment) {
    showToast('Please enter a message or tap the microphone to speak');
    return;
  }

  const userMessageText = rawText || `Uploaded medical document: ${pendingAttachment}`;
  const attachedName = pendingAttachment;

  input.value = '';
  clearPendingAttachment();

  chatHistory.push({ id: Date.now(), sender: 'user', text: userMessageText, attachmentName: attachedName });
  renderMessages();

  setAssistantStatus('AI Chat Assistant typing...', true);

  const aiResponse = await callGeminiMedicalAssistant(userMessageText);

  chatHistory.push({ id: Date.now() + 1, sender: 'ai', text: aiResponse });

  renderMessages();
  setAssistantStatus('AI Chat Assistant ready • Tap mic to speak', false);

  if (viaVoice || autoSpeakEnabled) {
    speakText(aiResponse);
  }
}

function sendQuickPrompt(text) {
  document.getElementById('chatInput').value = text;
  handleSendMessage(false);
}

function setAssistantStatus(text, showWaves) {
  const statusEl = document.getElementById('statusText');
  const waves = document.getElementById('waveAnimation');
  statusEl.textContent = text;
  if (showWaves) {
    waves.classList.remove('hidden');
    waves.classList.add('flex');
  } else {
    waves.classList.add('hidden');
    waves.classList.remove('flex');
  }
}

// =========================================================================
// MICROPHONE SPEECH-TO-TEXT & TEXT-TO-SPEECH (VOICE LOOP)
// =========================================================================
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRecording = true;
    updateMicButtonUI(true);
    setAssistantStatus('Listening... Speak your health question now', true);
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const input = document.getElementById('chatInput');
    if (finalTranscript) {
      input.value = finalTranscript.trim();
    } else if (interimTranscript) {
      input.value = interimTranscript;
    }
  };

  recognition.onerror = (event) => {
    isRecording = false;
    updateMicButtonUI(false);
    setAssistantStatus('AI Chat Assistant ready • Tap mic to speak', false);

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      simulateVoiceCaptureFallback();
    } else if (event.error !== 'aborted') {
      showToast('Voice capture paused. You can type or try the mic again.');
    }
  };

  recognition.onend = () => {
    const wasRecording = isRecording;
    isRecording = false;
    updateMicButtonUI(false);
    setAssistantStatus('AI Chat Assistant ready • Tap mic to speak', false);

    const inputVal = document.getElementById('chatInput').value.trim();
    if (wasRecording && inputVal) {
      handleSendMessage(true);
    }
  };
}

function toggleVoiceRecording() {
  stopSpeaking(); // so the mic doesn't hear the assistant

  if (!recognition) {
    simulateVoiceCaptureFallback();
    return;
  }

  if (isRecording) {
    recognition.stop();
  } else {
    try {
      document.getElementById('chatInput').value = '';
      recognition.start();
    } catch (e) {
      simulateVoiceCaptureFallback();
    }
  }
}

function simulateVoiceCaptureFallback() {
  updateMicButtonUI(true);
  setAssistantStatus('Simulated Voice Input: Listening...', true);
  showToast('Simulated mic mode active (browser mic permission unavailable)');

  const sampleVoicePrompts = [
    'I have a mild headache and sore throat since this morning. What should I do?',
    'Can you check if my saved prescription has any common side effects?',
    'Where can I purchase the prescribed medication safely?'
  ];
  const chosen = sampleVoicePrompts[Math.floor(Math.random() * sampleVoicePrompts.length)];

  setTimeout(() => {
    updateMicButtonUI(false);
    document.getElementById('chatInput').value = chosen;
    handleSendMessage(true);
  }, 1600);
}

function updateMicButtonUI(recording) {
  const btn = document.getElementById('micButton');
  if (recording) {
    btn.classList.remove('bg-medBg', 'text-gray-600');
    btn.classList.add('bg-red-500', 'text-white', 'mic-recording');
  } else {
    btn.classList.add('bg-medBg', 'text-gray-600');
    btn.classList.remove('bg-red-500', 'text-white', 'mic-recording');
  }
}

// Text-to-Speech (TTS)
function speakText(rawText) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const cleanText = rawText.replace(/\*\*/g, '').replace(/[#•]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.02;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => setAssistantStatus('AI Doctor speaking answer aloud...', true);
  utterance.onend = () => setAssistantStatus('AI Chat Assistant ready • Tap mic to speak', false);
  utterance.onerror = () => setAssistantStatus('AI Chat Assistant ready • Tap mic to speak', false);

  window.speechSynthesis.speak(utterance);
}

function speakTextById(id) {
  const msg = chatHistory.find((m) => m.id === id);
  if (msg && msg.text) speakText(msg.text);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  setAssistantStatus('AI Chat Assistant ready • Tap mic to speak', false);
}

function toggleAutoSpeak() {
  autoSpeakEnabled = !autoSpeakEnabled;
  const dot = document.getElementById('voiceStatusDot');
  const iconOn = document.getElementById('voiceIconOn');
  const iconOff = document.getElementById('voiceIconOff');
  const label = document.getElementById('voiceAutoLabel');

  if (autoSpeakEnabled) {
    dot.className = 'w-2 h-2 rounded-full bg-medMint';
    iconOn.classList.remove('hidden');
    iconOff.classList.add('hidden');
    label.textContent = 'Voice Reply: ON';
    showToast('Automatic AI voice replies enabled');
  } else {
    stopSpeaking();
    dot.className = 'w-2 h-2 rounded-full bg-gray-400';
    iconOn.classList.add('hidden');
    iconOff.classList.remove('hidden');
    label.textContent = 'Voice Reply: OFF';
    showToast('Automatic AI voice replies muted');
  }
}

// =========================================================================
// ATTACHMENTS, HISTORY & NAVIGATION HELPERS
// =========================================================================
function triggerAttachmentOptions() {
  document.getElementById('fileUploadInput').click();
}

function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  pendingAttachment = file.name;
  document.getElementById('pendingAttachmentName').textContent = file.name;
  document.getElementById('pendingAttachmentBar').classList.remove('hidden');
  document.getElementById('pendingAttachmentBar').classList.add('flex');
  showToast(`Attached "${file.name}"`);
}

function clearPendingAttachment() {
  pendingAttachment = null;
  document.getElementById('fileUploadInput').value = '';
  document.getElementById('pendingAttachmentBar').classList.add('hidden');
  document.getElementById('pendingAttachmentBar').classList.remove('flex');
}

function startNewChat() {
  stopSpeaking();
  const patient = familyMembers[activePatientIndex];
  chatHistory = [
    {
      id: Date.now(),
      sender: 'ai',
      text: `Hello **${patient.name}**! I'm your medOK Family Doctor assistant. Feel free to type your health question or tap the microphone button to speak directly with me.`
    }
  ];
  renderMessages();
  showToast(`Started a fresh consultation for ${patient.name}`);
}

function resetToDefaultChat() {
  stopSpeaking();
  chatHistory = JSON.parse(JSON.stringify(defaultMessages));
  renderMessages();
  showToast('Restored prescription consultation thread');
}

function loadHistoryTopic(topicKey) {
  stopSpeaking();
  if (historyTopics[topicKey]) {
    chatHistory = JSON.parse(JSON.stringify(historyTopics[topicKey]));
    renderMessages();
    showToast('Loaded past consultation from history');
  }
}

function toggleChatMenu() {
  document.getElementById('chatDropdownMenu').classList.toggle('hidden');
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('leftSidebar');
  sidebar.classList.toggle('hidden');
  sidebar.classList.toggle('flex');
}

function switchTopTab(tabName, btnEl) {
  document.querySelectorAll('.top-nav-btn').forEach((btn) => {
    btn.classList.remove('text-white', 'font-medium', 'border-medTeal');
    btn.classList.add('text-gray-400', 'border-transparent');
  });
  btnEl.classList.remove('text-gray-400', 'border-transparent');
  btnEl.classList.add('text-white', 'font-medium', 'border-medTeal');

  if (tabName === 'dashboard') {
    showToast('Health Overview synced with AI Specialist');
  } else if (tabName === 'calendar') {
    showToast('Next checkup reminder: Dec 04, 10:30 AM');
  }
}
