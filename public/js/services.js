// =========================================================================
// AuthService  (replaces sessionStorage logic + the TODO in login.js)
// =========================================================================
angular.module('healthlens')

.factory('AuthService', function ($http, $window) {
  var TOKEN = 'hl_token', NAME = 'hl_name';
  return {
    login: function (email, password) {
      return $http.post('/api/login', { email: email, password: password })
        .then(function (res) {
          $window.sessionStorage.setItem(TOKEN, res.data.token);
          $window.sessionStorage.setItem(NAME, res.data.name || 'User');
          return res.data;
        });
    },
    logout: function () {
      $window.sessionStorage.removeItem(TOKEN);
      $window.sessionStorage.removeItem(NAME);
    },
    isLoggedIn: function () { return !!$window.sessionStorage.getItem(TOKEN); },
    userName: function () { return $window.sessionStorage.getItem(NAME) || 'User'; }
  };
})

// =========================================================================
// ChatService  (data from medok.js + the call to YOUR Express /api/chat)
// =========================================================================
.factory('ChatService', function ($http) {

  var family = [
    { id: 'gretta', name: 'Gretta', meta: 'Female • 28 yrs',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=140&q=80',
      fallback: 'https://placehold.co/100x100/8CE2E0/25292E?text=G',
      summary: 'The patient has no known severe allergies. Regularly tracks annual checkups and seasonal wellness. Maintaining updated prescription logs for family doctor review.',
      visits: 14, prescriptions: 6, docs: 9 },
    { id: 'john', name: 'John', meta: 'Male • 32 yrs',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=140&q=80',
      fallback: 'https://placehold.co/100x100/3CC5F0/FFFFFF?text=J',
      summary: 'Active lifestyle, monitors seasonal pollen sensitivity and routine cardiovascular checkups. No chronic conditions detected on last annual screening.',
      visits: 8, prescriptions: 2, docs: 5 },
    { id: 'maya', name: 'Maya', meta: 'Female • 6 yrs',
      avatar: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=140&q=80',
      fallback: 'https://placehold.co/100x100/5DE3B5/25292E?text=M',
      summary: 'Pediatric growth milestones on track. Routine immunization schedule up to date. Occasional mild seasonal cold symptoms during spring.',
      visits: 11, prescriptions: 3, docs: 7 }
  ];

  var defaultMessages = [
    { id: 1, sender: 'user', text: 'Hello! I visited the doctor and received a prescription for medication. Can you help me add this information to my medical record?' },
    { id: 2, sender: 'ai', text: 'Good day! Of course, I can help you with this. Please provide me with your documents, and I will add this information to your medical record.' },
    { id: 3, sender: 'user', text: '', isPrescriptionCard: true, prescriptionDrug: 'Amoxicillin 500mg CAP • 20 Capsules', prescriptionRef: 'RX #2026-8841 • Verified' },
    { id: 4, sender: 'ai', text: 'Adding this information to your record. The prescription has been saved in Gretta’s health profile. If you need anything else, please let me know.' },
    { id: 5, sender: 'user', text: 'And recommend where I can purchase the necessary medication?' }
  ];

  var historyTopics = {
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

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function localFallback(query, patient) {
    var q = query.toLowerCase();
    if (q.includes('purchase') || q.includes('pharmacy') || q.includes('where')) {
      return 'Based on **' + patient.name + '\'s** saved digital prescription, you can order the medication through any licensed local pharmacy or verified online dispensary.\n\n• Present your **Digital Rx #2026-8841** at checkout for instant verification.\n• Always check that the pharmacist reviews dosage instructions with you.';
    }
    if (q.includes('side effect')) {
      return 'Common mild side effects can include temporary stomach upset or drowsiness depending on the medication class. Taking doses with water or a light meal often helps.\n\nIf you notice any rash, swelling, or difficulty breathing, stop use and seek immediate medical evaluation.';
    }
    return 'Thank you for sharing that, **' + patient.name + '**. I have noted your question in your consultation log. Stay hydrated, monitor any changes in your symptoms over the next 24 hours, and consult your primary care physician if discomfort persists.';
  }

  return {
    family: family,
    defaultThread: function () { return clone(defaultMessages); },
    topic: function (key) { return historyTopics[key] ? clone(historyTopics[key]) : null; },
    greeting: function (patient) {
      return [{ id: Date.now(), sender: 'ai',
        text: 'Hello **' + patient.name + '**! I\'m your medOK Family Doctor assistant. Feel free to type your health question or tap the microphone button to speak directly with me.' }];
    },

    // history = messages BEFORE the new question; query = the new question
    ask: function (patient, history, query) {
      var systemPrompt =
        'You are \'medOK AI Family Doctor (V 5.0)\', an empathetic, knowledgeable, and reassuring medical information assistant inside the medOK patient dashboard.\n' +
        'Active patient context: ' + patient.name + ' (' + patient.meta + '). Medical summary: ' + patient.summary + '.\n' +
        'Guidelines:\n' +
        '- Give clear, structured, easy-to-understand clinical guidance in a warm, supportive tone.\n' +
        '- Keep responses concise (around 2–4 short paragraphs or bullet points) so they sound natural when read aloud via voice synthesis.\n' +
        '- Remind the user gently when appropriate to confirm dosing or diagnosis with a licensed physician, without sounding robotic.';

      var contents = history.map(function (m) {
        return { role: m.sender === 'user' ? 'user' : 'model',
                 parts: [{ text: m.text || '[Uploaded Prescription Document]' }] };
      });
      contents.push({ role: 'user', parts: [{ text: query }] });
      while (contents.length && contents[0].role !== 'user') contents.shift();

      return $http.post('/api/chat', { systemPrompt: systemPrompt, contents: contents })
        .then(function (res) {
          if (!res.data || !res.data.reply) throw new Error('empty');
          return res.data.reply.trim();
        })
        .catch(function () { return localFallback(query, patient); });
    }
  };
})

// =========================================================================
// VoiceService  (speech-to-text + text-to-speech from medok.js)
// Callbacks are wrapped in $applyAsync so Angular updates the screen.
// =========================================================================
.factory('VoiceService', function ($window, $rootScope) {
  var SR = $window.SpeechRecognition || $window.webkitSpeechRecognition;
  var rec = null;
  function apply(fn) { if (fn) $rootScope.$applyAsync(fn); }

  return {
    supported: !!SR,

    listen: function (h) {
      rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = function () { apply(h.onStart); };
      rec.onresult = function (event) {
        var interim = '', final = '';
        for (var i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        var text = final ? final.trim() : interim;
        if (text) apply(function () { h.onResult(text); });
      };
      rec.onerror = function (e) { apply(function () { h.onError(e.error); }); };
      rec.onend = function () { apply(h.onEnd); };
      rec.start();
    },
    stopListening: function () { if (rec) rec.stop(); },

    speak: function (rawText, onStart, onEnd) {
      if (!('speechSynthesis' in $window)) return;
      $window.speechSynthesis.cancel();
      var clean = rawText.replace(/\*\*/g, '').replace(/[#•]/g, '');
      var u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.02; u.pitch = 1.0;
      var voices = $window.speechSynthesis.getVoices();
      var preferred = voices.find(function (v) {
        return v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'));
      });
      if (preferred) u.voice = preferred;
      u.onstart = function () { apply(onStart); };
      u.onend = function () { apply(onEnd); };
      u.onerror = function () { apply(onEnd); };
      $window.speechSynthesis.speak(u);
    },
    stopSpeaking: function () {
      if ('speechSynthesis' in $window) $window.speechSynthesis.cancel();
    }
  };
});
