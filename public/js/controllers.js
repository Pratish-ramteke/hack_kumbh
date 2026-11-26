// =========================================================================
// FILTER + DIRECTIVES
// =========================================================================
angular.module('healthlens')

// escapes HTML first, then turns **bold** and new lines into tags (safe with ng-bind-html)
.filter('aiText', function () {
  return function (text) {
    var safe = (text || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#1E232A]">$1</strong>');
    return safe.replace(/\n/g, '<br/>');
  };
})

// <img ng-src="..." img-fallback="{{other-url}}"> : replaces a broken image
.directive('imgFallback', function () {
  return {
    link: function (scope, el, attrs) {
      el.on('error', function () {
        if (attrs.imgFallback && el.attr('src') !== attrs.imgFallback) el.attr('src', attrs.imgFallback);
      });
    }
  };
})

// ng-change does not work on <input type="file">, so this directive handles it
.directive('onFileChange', function () {
  return {
    link: function (scope, el, attrs) {
      el.on('change', function (e) {
        scope.$apply(function () { scope.$eval(attrs.onFileChange, { $event: e }); });
      });
    }
  };
})

// =========================================================================
// LOGIN CONTROLLER  (replaces login.js)
// =========================================================================
.controller('LoginCtrl', function ($scope, $location, $timeout, AuthService) {
  $scope.form = { email: '', password: '' };
  $scope.emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  $scope.showPw = false;
  $scope.loading = false;
  $scope.toast = { text: '', show: false };

  var toastTimer;
  function toast(msg) {
    $scope.toast.text = msg;
    $scope.toast.show = true;
    $timeout.cancel(toastTimer);
    toastTimer = $timeout(function () { $scope.toast.show = false; }, 2800);
  }

  $scope.submit = function (loginForm) {
    loginForm.$setSubmitted();
    if (loginForm.$invalid) return;

    $scope.loading = true;
    AuthService.login($scope.form.email.trim(), $scope.form.password)
      .then(function () {
        toast('Signed in successfully');
        $timeout(function () { $location.path('/chat'); }, 600);
      })
      .catch(function () { toast('Invalid email or password'); })
      .finally(function () { $scope.loading = false; });
  };

  $scope.forgot = function () { toast('Password reset link would be sent to your email'); };
  $scope.signup = function () { toast('Sign Up page goes here'); };
})

// =========================================================================
// CHAT CONTROLLER  (replaces medok.js)
// =========================================================================
.controller('ChatCtrl', function ($scope, $location, $timeout, AuthService, ChatService, VoiceService) {

  var READY = 'AI Chat Assistant ready • Tap mic to speak';
  var idCounter = 1000;
  function nid() { return ++idCounter; }

  // ---------- state ----------
  $scope.userName = AuthService.userName();
  $scope.family = ChatService.family;
  $scope.active = 0;
  $scope.patient = $scope.family[0];
  $scope.chat = { input: '' };
  $scope.tab = 'specialist';
  $scope.menuOpen = false;
  $scope.sidebarOpen = false;
  $scope.autoSpeak = true;
  $scope.recording = false;
  $scope.pendingAttachment = null;
  $scope.status = { text: READY, waves: false };
  $scope.toast = { text: '', show: false };

  // one conversation per family member
  var threads = {};
  threads.gretta = ChatService.defaultThread();
  threads.john = ChatService.greeting($scope.family[1]);
  threads.maya = ChatService.greeting($scope.family[2]);
  $scope.messages = threads.gretta;

  // ---------- helpers ----------
  var toastTimer;
  function toast(msg) {
    $scope.toast.text = msg;
    $scope.toast.show = true;
    $timeout.cancel(toastTimer);
    toastTimer = $timeout(function () { $scope.toast.show = false; }, 3200);
  }
  function setStatus(text, waves) { $scope.status.text = text; $scope.status.waves = !!waves; }
  function ready() { setStatus(READY, false); }
  function scrollDown() {
    $timeout(function () {
      var el = document.getElementById('chatMessagesContainer');
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
  function setThread(arr) {
    threads[$scope.patient.id] = arr;
    $scope.messages = arr;
    scrollDown();
  }
  function speak(text) {
    VoiceService.speak(text,
      function () { setStatus('AI Doctor speaking answer aloud...', true); },
      ready);
  }

  // ---------- family ----------
  $scope.selectPatient = function (idx) {
    $scope.active = idx;
    $scope.patient = $scope.family[idx];
    $scope.messages = threads[$scope.patient.id];
    scrollDown();
    toast('Switched active patient profile to ' + $scope.patient.name);
  };
  $scope.cyclePatient = function (dir) {
    var n = ($scope.active + dir + $scope.family.length) % $scope.family.length;
    $scope.active = n;
    $scope.patient = $scope.family[n];
    $scope.messages = threads[$scope.patient.id];
    scrollDown();
  };
  $scope.requestSecondOpinion = function () {
    $scope.sendQuickPrompt('Can you prepare a summary of ' + $scope.patient.name + '\'s recent symptoms and prescriptions for a specialist second opinion?');
  };

  // ---------- sending ----------
  $scope.send = function (viaVoice) {
    var text = ($scope.chat.input || '').trim();
    if (!text && !$scope.pendingAttachment) {
      toast('Please enter a message or tap the microphone to speak');
      return;
    }
    var msgText = text || ('Uploaded medical document: ' + $scope.pendingAttachment);
    var attached = $scope.pendingAttachment;
    var patient = $scope.patient;
    var thread = $scope.messages;          // reply goes to THIS thread even if user switches patient

    $scope.chat.input = '';
    $scope.clearAttachment();

    var history = thread.slice(-6);        // turns before the new question
    thread.push({ id: nid(), sender: 'user', text: msgText, attachmentName: attached });
    scrollDown();
    setStatus('AI Chat Assistant typing...', true);

    ChatService.ask(patient, history, msgText).then(function (reply) {
      thread.push({ id: nid(), sender: 'ai', text: reply });
      ready();
      scrollDown();
      if (viaVoice === true || $scope.autoSpeak) speak(reply);
    });
  };

  $scope.sendQuickPrompt = function (text) {
    $scope.chat.input = text;
    $scope.send(false);
  };

  // ---------- message actions ----------
  $scope.copyMessage = function (msg) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg.text).then(function () {
        $scope.$applyAsync(function () { toast('Copied medical response to clipboard'); });
      });
    }
  };
  $scope.speakMessage = function (msg) { if (msg.text) speak(msg.text); };
  $scope.rate = function (msg, dir) {
    msg.rating = (msg.rating === dir) ? null : dir;
    toast(dir === 'up' ? 'Thanks for your feedback!' : 'Feedback noted to improve responses');
  };

  // ---------- voice ----------
  $scope.toggleMic = function () {
    VoiceService.stopSpeaking();
    ready();

    if (!VoiceService.supported) return simulateVoice();
    if ($scope.recording) { VoiceService.stopListening(); return; }

    $scope.chat.input = '';
    try {
      VoiceService.listen({
        onStart: function () { $scope.recording = true; setStatus('Listening... Speak your health question now', true); },
        onResult: function (text) { $scope.chat.input = text; },
        onError: function (err) {
          $scope.recording = false; ready();
          if (err === 'not-allowed' || err === 'service-not-allowed') simulateVoice();
          else if (err !== 'aborted') toast('Voice capture paused. You can type or try the mic again.');
        },
        onEnd: function () {
          var was = $scope.recording;
          $scope.recording = false; ready();
          if (was && ($scope.chat.input || '').trim()) $scope.send(true);
        }
      });
    } catch (e) { simulateVoice(); }
  };

  function simulateVoice() {
    $scope.recording = true;
    setStatus('Simulated Voice Input: Listening...', true);
    toast('Simulated mic mode active (browser mic permission unavailable)');
    var samples = [
      'I have a mild headache and sore throat since this morning. What should I do?',
      'Can you check if my saved prescription has any common side effects?',
      'Where can I purchase the prescribed medication safely?'
    ];
    $timeout(function () {
      $scope.recording = false;
      $scope.chat.input = samples[Math.floor(Math.random() * samples.length)];
      $scope.send(true);
    }, 1600);
  }

  $scope.stopSpeaking = function () { VoiceService.stopSpeaking(); ready(); };

  $scope.toggleAutoSpeak = function () {
    $scope.autoSpeak = !$scope.autoSpeak;
    if ($scope.autoSpeak) toast('Automatic AI voice replies enabled');
    else { $scope.stopSpeaking(); toast('Automatic AI voice replies muted'); }
  };

  // ---------- attachments ----------
  $scope.pickFile = function () { document.getElementById('fileUploadInput').click(); };
  $scope.fileChosen = function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    $scope.pendingAttachment = file.name;
    toast('Attached "' + file.name + '"');
  };
  $scope.clearAttachment = function () {
    $scope.pendingAttachment = null;
    var f = document.getElementById('fileUploadInput');
    if (f) f.value = '';
  };

  // ---------- chats / history / navigation ----------
  $scope.newChat = function () {
    $scope.stopSpeaking();
    setThread(ChatService.greeting($scope.patient));
    toast('Started a fresh consultation for ' + $scope.patient.name);
  };
  $scope.resetChat = function () {
    $scope.stopSpeaking();
    setThread(ChatService.defaultThread());
    toast('Restored prescription consultation thread');
  };
  $scope.loadHistory = function (key) {
    $scope.stopSpeaking();
    var t = ChatService.topic(key);
    if (t) { setThread(t); toast('Loaded past consultation from history'); }
  };
  $scope.switchTab = function (name) {
    $scope.tab = name;
    if (name === 'dashboard') toast('Health Overview synced with AI Specialist');
    else if (name === 'calendar') toast('Next checkup reminder: Dec 04, 10:30 AM');
  };
  $scope.logout = function () {
    $scope.stopSpeaking();
    AuthService.logout();
    $location.path('/login');
  };

  scrollDown();
});
