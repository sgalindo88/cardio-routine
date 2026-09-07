/* ============================================================
   Cardio Routine
   Vanilla JS, no dependencies, no build step.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.CARDIO_CONFIG || { syncUrl: '', syncToken: '', appVersion: '0' };

  /* ==========================================================
     1. Workout data
     ========================================================== */

  var ROUNDS = 2;
  var WARMUP_SECONDS = 30;
  var COOLDOWN_SECONDS = 30;

  var EXERCISES = [
    { id: 'march-reach',   name: 'Brisk March with High Arm Reaches',
      cue: 'March in place, lifting your knees. Reach one arm overhead each step.' },
    { id: 'side-step-taps',
      name: 'Side Step-Taps with Pushes',
      cue: 'Step right, tap the left toe in. Push both hands forward at chest height. Alternate.' },
    { id: 'half-jacks',     name: 'Half-Jacks',
      cue: 'Step one foot out to the side as your arms sweep up. Return. No jumping.' },
    { id: 'knee-taps',      name: 'Cross-Body Knee Taps',
      cue: 'Lift the right knee, tap it with your left hand. Alternate sides.' },
    { id: 'skater-taps',    name: 'Skater Taps',
      cue: 'Step wide to one side, tap the back toe behind you, swing your arms across.' },
    { id: 'shadow-boxing',  name: 'Shadow Boxing',
      cue: 'Light, quick feet. Punch straight ahead, alternating hands.' },
    { id: 'heel-digs',      name: 'Heel Digs with Bicep Swings',
      cue: 'Tap one heel forward on the floor and curl both arms up. Alternate heels.' },
    { id: 'fast-feet',      name: 'Fast-Feet Shuffles to Soft Reach',
      cue: 'Quick small steps in place, then reach both arms up high. Repeat.' }
  ];
  EXERCISES.forEach(function (e) { e.media = 'media/' + e.id + '.webp'; });

  /* ---- YouTube clips -------------------------------------------------
     One source video, seeked to a different 10s window per exercise.
     [startSeconds, endSeconds]. Windows were located by stepping through
     the source video frame by frame. Segments with no clip show no video
     panel; the name and cue carry those on their own. */
  var VIDEO_ID = 'HP_P-A3crw4';
  var MARCH_CLIP = [58, 68];

  /* Cool-down windows, located by stepping through the source video's own
     stretching block. The clip demonstrates the movement; the cue names the
     side, which will not always match the side she is on screen. */
  var WALK_CLIP = [137, 147];      // the stepping half of the "straight walk" block
  var ARMS_CLIP = [152, 162];      // arm raises, "forward and up"
  var HEEL_CLIP = [180, 190];      // same heel digs used later as exercise 7

  var QUAD_CLIP = [1236, 1246];
  var CALF_R_CLIP = [1250, 1260];
  var CALF_L_CLIP = [1264, 1274];
  var HAMSTRING_CLIP = [1291, 1301];
  var CLIPS = {
    'march-reach':    [58, 68],
    'side-step-taps': [299, 309],
    'half-jacks':     [628, 638],
    'knee-taps':      [269, 279],
    'skater-taps':    [809, 819],
    'shadow-boxing':  [28, 38],
    'heel-digs':      [180, 190],
    'fast-feet':      [868, 878]
  };
  EXERCISES.forEach(function (e) { e.clip = CLIPS[e.id] || null; });

  var WARMUP = [
    { name: 'March in Place', clip: MARCH_CLIP,
      cue: 'Easy pace. Let your arms swing naturally.' },
    { name: 'Easy Walk in Place', clip: WALK_CLIP,
      cue: 'Small steps, staying light. Loosen up the legs.' },
    { name: 'Arm Raises — Forward and Up', clip: ARMS_CLIP,
      cue: 'Reach one arm forward and up, then the other. Shoulders relaxed.' },
    { name: 'Heel Digs', clip: HEEL_CLIP,
      cue: 'Tap one heel forward, then the other. Gentle — this is a warm-up.' }
  ];

  var COOLDOWN = [
    { name: 'Slow March with Deep Breathing', clip: MARCH_CLIP,
      cue: 'In through the nose, out through the mouth.' },
    { name: 'Standing Quad Stretch — Right', clip: QUAD_CLIP,
      cue: 'Hold a chair. Pull your right heel gently toward you.' },
    { name: 'Standing Quad Stretch — Left', clip: QUAD_CLIP,
      cue: 'Same on the other side. Stand tall.' },
    { name: 'Calf Stretch — Right', clip: CALF_R_CLIP,
      cue: 'Step the right foot back, heel down, front knee soft.' },
    { name: 'Calf Stretch — Left', clip: CALF_L_CLIP,
      cue: 'Switch. Left foot back, heel pressing into the floor.' },
    { name: 'Standing Hamstring Reach', clip: HAMSTRING_CLIP,
      cue: 'One heel forward, toes up, hinge at the hips. Gentle.' }
  ];

  /* No clip during recovery on purpose. It is 15 seconds of marching she does
     not need shown, and reloading the player between every exercise is churn.
     The panel collapses and "Next up" carries the interval instead. */
  var RECOVER = { name: 'March in Place', clip: null,
                  cue: 'Keep moving. Easy pace, shake it out.' };
  var BREAK   = { name: 'Water Break',
                  cue: 'Take a drink. Catch your breath.' };

  var DEFAULTS = { work: 45, rest: 15, waterBreak: 60, beeps: true, voice: true };
  var LIMITS = { work: [15, 90], rest: [5, 60], waterBreak: [15, 180] };

  /* ==========================================================
     2. Storage
     ========================================================== */

  var K = {
    settings: 'cardio.settings.v1',
    history:  'cardio.history.v1',
    outbox:   'cardio.outbox.v1',
    device:   'cardio.device.v1',
    lastSync: 'cardio.lastsync.v1',
    sync:     'cardio.sync.v1'
  };

  var LS = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    }
  };

  var settings = (function () {
    var saved = LS.get(K.settings, {}) || {};
    var out = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      out[k] = (typeof saved[k] === typeof DEFAULTS[k]) ? saved[k] : DEFAULTS[k];
    });
    return out;
  })();

  var deviceId = LS.get(K.device, null);
  if (!deviceId) {
    deviceId = 'd-' + Math.random().toString(36).slice(2, 10);
    LS.set(K.device, deviceId);
  }

  /* ==========================================================
     3. Timeline
     ========================================================== */

  function buildTimeline(s) {
    var t = [];

    WARMUP.forEach(function (w, i) {
      t.push({ kind: 'warmup', name: w.name, cue: w.cue,
               media: null, clip: w.clip || null, seconds: WARMUP_SECONDS,
               label: 'Warm-up · ' + (i + 1) + ' of ' + WARMUP.length });
    });

    for (var r = 1; r <= ROUNDS; r++) {
      EXERCISES.forEach(function (ex, i) {
        t.push({ kind: 'work', name: ex.name, cue: ex.cue,
                 media: ex.media, clip: ex.clip, seconds: s.work,
                 label: 'Round ' + r + ' · ' + (i + 1) + ' of ' + EXERCISES.length });
        t.push({ kind: 'recover', name: RECOVER.name, cue: RECOVER.cue, media: null, clip: RECOVER.clip, seconds: s.rest,
                 label: 'Round ' + r + ' · recover' });
      });
      if (r < ROUNDS) {
        t.push({ kind: 'break', name: BREAK.name, cue: BREAK.cue,
                 media: null, clip: null, seconds: s.waterBreak, label: 'Water break' });
      }
    }

    COOLDOWN.forEach(function (c, i) {
      t.push({ kind: 'cooldown', name: c.name, cue: c.cue,
               media: null, clip: c.clip || null, seconds: COOLDOWN_SECONDS,
               label: 'Cool-down · ' + (i + 1) + ' of ' + COOLDOWN.length });
    });

    t.forEach(function (seg, i) {
      seg.nextName = (i + 1 < t.length) ? t[i + 1].name : null;
    });
    return t;
  }

  function timelineSeconds(t) {
    return t.reduce(function (a, s) { return a + s.seconds; }, 0);
  }

  function fmtClock(totalSeconds) {
    var s = Math.max(0, Math.round(totalSeconds));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  var KIND_TAG = { warmup: 'Warm-up', work: 'Work', recover: 'March',
                   break: 'Water', cooldown: 'Cool-down' };

  /* ==========================================================
     4. Audio — beeps
     ========================================================== */

  var audioCtx = null;

  function initAudio() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { audioCtx = null; }
  }

  function tone(freq, ms, peak) {
    if (!settings.beeps || !audioCtx || audioCtx.state !== 'running') return;
    try {
      var t0 = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      // Envelope: a raw start/stop on a bare oscillator clicks audibly.
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + ms / 1000 + 0.02);
    } catch (e) { /* never let audio break the timer */ }
  }

  var beepCount      = function () { tone(660, 130, 0.18); };
  var beepTransition = function () { tone(880, 340, 0.22); };
  var beepFinish     = function () { tone(523, 260, 0.20);
                                     setTimeout(function () { tone(784, 420, 0.20); }, 240); };

  /* ==========================================================
     5. Audio — speech
     ========================================================== */

  var speechOK = ('speechSynthesis' in window) &&
                 (typeof window.SpeechSynthesisUtterance === 'function');

  function say(text) {
    if (!settings.voice || !speechOK || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1; u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  function hushSpeech() {
    if (!speechOK) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }

  function announce(seg) {
    if (seg.kind === 'work')      return say(seg.name + '. Go.');
    if (seg.kind === 'recover')   return say(seg.nextName
                                    ? 'March. Next up, ' + seg.nextName + '.'
                                    : 'March.');
    if (seg.kind === 'break')     return say('Water break. Take a drink.');
    if (seg.kind === 'warmup')    return say(seg.name + '.');
    if (seg.kind === 'cooldown')  return say(seg.name + '.');
  }

  /* ==========================================================
     6. Wake lock
     ========================================================== */

  var wakeLock = null;

  function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    if (wakeLock) return;
    try {
      navigator.wakeLock.request('screen').then(function (lock) {
        wakeLock = lock;
        lock.addEventListener('release', function () { wakeLock = null; });
      }).catch(function () { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  }

  function releaseWakeLock() {
    if (!wakeLock) return;
    try { wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }

  /* ==========================================================
     6b. YouTube exercise clips
     ----------------------------------------------------------
     One source video seeked to a per-exercise window, muted and
     looping. This is decoration, never a dependency: if the API
     fails to load, the network is down, or embedding is disabled
     on the video, the panel falls back to a local media loop if one
     exists and otherwise collapses, and the workout runs as before.
     ========================================================== */

  var yt = {
    player: null,
    ready: false,
    failed: false,
    clip: null,        // clip currently loaded
    loopTimer: null,
    paused: false
  };

  function sameClip(a, b) {
    return !!a && !!b && a[0] === b[0] && a[1] === b[1];
  }

  function ytUsable() {
    return yt.ready && !yt.failed && !!yt.player;
  }

  function loadYouTube() {
    if (window.YT && window.YT.Player) { createYtPlayer(); return; }

    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') { try { prev(); } catch (e) {} }
      createYtPlayer();
    };

    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onerror = function () { yt.failed = true; refreshVisual(); };
    document.head.appendChild(tag);

    // Offline or blocked: stop waiting and run without video.
    setTimeout(function () {
      if (!yt.ready) { yt.failed = true; refreshVisual(); }
    }, 10000);
  }

  function createYtPlayer() {
    if (yt.player) return;
    try {
      yt.player = new window.YT.Player('yt-player', {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0, controls: 0, disablekb: 1, fs: 0,
          rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1,
          cc_load_policy: 0, cc_lang_pref: 'none', annotations: 3
        },
        events: {
          onReady: function (e) {
            yt.ready = true;
            yt.failed = false;
            try { e.target.mute(); } catch (err) {}
            killCaptions();
            refreshVisual();
          },
          onError: function () {
            // Embedding disabled, bad id, or region block: fall back for good.
            yt.failed = true;
            stopClipLoop();
            refreshVisual();
          },
          onStateChange: function (e) {
            if (e.data === window.YT.PlayerState.PLAYING) killCaptionsOnce();
            // Backstop only; the poll below normally loops before ENDED fires.
            if (e.data === window.YT.PlayerState.ENDED && yt.clip) {
              seekClipStart();
            }
          }
        }
      });
    } catch (e) {
      yt.failed = true;
    }
  }

  /* Captions are burned over the bottom of the frame and reappear on each
     load, so unload the module every time rather than trusting the
     cc_load_policy player var, which a viewer's global caption setting
     overrides. Both module names are tried; which one applies varies. */
  var captionKillTimers = [];

  function killCaptionsOnce() {
    if (!yt.player) return;
    ['captions', 'cc'].forEach(function (m) {
      try { yt.player.unloadModule(m); } catch (e) {}
      // Belt and braces: on some player builds unloadModule alone is undone
      // when the module re-initialises, but clearing the track sticks.
      try { yt.player.setOption(m, 'track', {}); } catch (e) {}
    });
  }

  /* The captions module reloads asynchronously after loadVideoById, so a
     single call at load time is regularly too early and the subtitles come
     back a second later. Retry across the window in which it re-initialises. */
  function killCaptions() {
    killCaptionsOnce();
    captionKillTimers.forEach(clearTimeout);
    captionKillTimers = [300, 800, 1500, 2500, 4000].map(function (ms) {
      return setTimeout(killCaptionsOnce, ms);
    });
  }

  function seekClipStart() {
    if (!ytUsable() || !yt.clip) return;
    try {
      yt.player.seekTo(yt.clip[0], true);
      if (!yt.paused) yt.player.playVideo();
    } catch (e) {}
  }

  /* Poll and seek back just before the end point. Letting the player reach
     endSeconds fires ENDED and produces a visible black flash on every loop,
     which over a 45s interval happens four or five times. */
  function startClipLoop() {
    stopClipLoop();
    yt.loopTimer = setInterval(function () {
      if (!ytUsable() || !yt.clip || yt.paused) return;
      try {
        var t = yt.player.getCurrentTime();
        if (t >= yt.clip[1] - 0.3 || t < yt.clip[0] - 1.5) {
          yt.player.seekTo(yt.clip[0], true);
        }
      } catch (e) {}
    }, 200);
  }

  function stopClipLoop() {
    if (yt.loopTimer) { clearInterval(yt.loopTimer); yt.loopTimer = null; }
  }

  function playClip(clip) {
    if (!ytUsable() || !clip) return;
    yt.clip = clip;
    yt.paused = false;
    try {
      yt.player.mute();
      yt.player.loadVideoById({
        videoId: VIDEO_ID,
        startSeconds: clip[0],
        suggestedQuality: 'medium'
      });
      killCaptions();
      startClipLoop();
    } catch (e) {
      yt.failed = true;
      refreshVisual();
    }
  }

  function pauseClip() {
    yt.paused = true;
    stopClipLoop();
    if (!ytUsable()) return;
    try { yt.player.pauseVideo(); } catch (e) {}
  }

  function resumeClip() {
    if (!ytUsable() || !yt.clip) return;
    yt.paused = false;
    try { yt.player.mute(); yt.player.playVideo(); } catch (e) {}
    startClipLoop();
  }

  function stopClip() {
    yt.clip = null;
    yt.paused = false;
    stopClipLoop();
    if (!ytUsable()) return;
    try { yt.player.pauseVideo(); } catch (e) {}
  }

  /* ==========================================================
     7. Sync — write-only mirror to a Google Sheet
     ----------------------------------------------------------
     The app never waits on any of this. Rows are queued locally
     first, then flushed in the background with retry.

     The endpoint lives in localStorage on this device, NOT in the
     repo. GitHub Pages requires a public repo on the free tier, and
     anything committed there gets scraped by credential-hunting
     bots; a value typed into the device is never published at all.
     config.js is still honoured as a fallback for anyone who would
     rather hardcode it in a private deployment.
     ========================================================== */

  var syncCfg = { url: '', token: '' };

  function loadSyncCfg() {
    var saved = LS.get(K.sync, null);
    if (saved && typeof saved.url === 'string' && saved.url) {
      syncCfg = { url: saved.url, token: saved.token || '' };
    } else {
      syncCfg = { url: CFG.syncUrl || '', token: CFG.syncToken || '' };
    }
  }

  function saveSyncCfg(url, token) {
    syncCfg = { url: (url || '').trim(), token: (token || '').trim() };
    LS.set(K.sync, syncCfg);
  }

  function clearSyncCfg() {
    syncCfg = { url: '', token: '' };
    try { localStorage.removeItem(K.sync); } catch (e) {}
  }

  function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(str) {
    var t = str.replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return decodeURIComponent(escape(atob(t)));
  }

  function setupLink() {
    var payload = b64urlEncode(JSON.stringify({ u: syncCfg.url, t: syncCfg.token }));
    return location.origin + location.pathname + '#sync=' + payload;
  }

  /* One-time bootstrap: open .../#sync=<encoded> on her device and the config
     is saved, then stripped from the URL so it does not linger on screen or in
     a shared link. Hash fragments are never sent to the server. */
  function bootstrapFromHash() {
    var h = location.hash || '';
    if (h.indexOf('#sync=') !== 0) return false;
    var ok = false;
    try {
      var obj = JSON.parse(b64urlDecode(h.slice(6)));
      if (obj && typeof obj.u === 'string' && obj.u.indexOf('http') === 0) {
        saveSyncCfg(obj.u, obj.t || '');
        ok = true;
      }
    } catch (e) { ok = false; }
    try { history.replaceState(null, '', location.pathname + location.search); }
    catch (e) { location.hash = ''; }
    return ok;
  }

  var Sync = {
    enabled: function () { return !!(syncCfg.url && syncCfg.url.indexOf('http') === 0); },

    _outbox: function ()      { return LS.get(K.outbox, []) || []; },
    _save:   function (rows)  { LS.set(K.outbox, rows.slice(-100)); },
    pending: function ()      { return this._outbox().length; },

    queue: function (type, payload) {
      if (!this.enabled()) return;
      var rows = this._outbox();
      rows.push({
        type: type,
        payload: payload,
        device: deviceId,
        app_version: CFG.appVersion,
        queued_at: new Date().toISOString()
      });
      this._save(rows);
      this.flush();
    },

    _busy: false,

    flush: function () {
      var self = this;
      if (!this.enabled() || this._busy) return;
      if (!navigator.onLine) return;

      var rows = this._outbox();
      if (!rows.length) return;
      this._busy = true;

      // Serial, stop on first failure — keeps row order and avoids
      // hammering a cold-starting script with parallel requests.
      var i = 0;
      function step() {
        if (i >= rows.length) return done(true);
        self._post(rows[i]).then(function () {
          i++; step();
        }).catch(function () {
          done(false);
        });
      }
      function done(allSent) {
        self._busy = false;
        self._save(allSent ? [] : rows.slice(i));
        if (i > 0) LS.set(K.lastSync, Date.now());
        renderSyncStatus();
      }
      step();
    },

    _post: function (row) {
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);

      var body = JSON.stringify({
        token:       syncCfg.token,
        type:        row.type,
        device:      row.device,
        app_version: row.app_version,
        queued_at:   row.queued_at,
        payload:     row.payload
      });

      return fetch(syncCfg.url, {
        method: 'POST',
        // Load-bearing: Apps Script cannot answer a CORS preflight, so this
        // must stay a "simple" request. Sending application/json adds a
        // preflight and the write fails outright. Do not "clean this up".
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: body,
        redirect: 'follow',
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('http ' + res.status);
        return res.text();
      }).then(function (text) {
        var data = null;
        try { data = JSON.parse(text); } catch (e) { /* tolerate */ }
        if (data && data.ok === false) throw new Error(data.error || 'rejected');
        return true;
      }).catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
    },

    statusText: function () {
      if (!this.enabled()) return null;
      var n = this.pending();
      if (n > 0) return n + (n === 1 ? ' entry' : ' entries') + ' waiting to sync';
      var last = LS.get(K.lastSync, null);
      if (!last) return 'Sync on · nothing sent yet';
      var mins = Math.round((Date.now() - last) / 60000);
      if (mins < 1)  return 'Synced · just now';
      if (mins < 60) return 'Synced · ' + mins + ' min ago';
      var hrs = Math.round(mins / 60);
      if (hrs < 24)  return 'Synced · ' + hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
      return 'Synced · ' + Math.round(hrs / 24) + ' days ago';
    }
  };

  var settingsSyncTimer = null;
  function queueSettingsSync() {
    if (!Sync.enabled()) return;
    // Debounced: holding a +/- stepper should produce one row, not fifteen.
    clearTimeout(settingsSyncTimer);
    settingsSyncTimer = setTimeout(function () {
      Sync.queue('settings', {
        work_sec: settings.work, rest_sec: settings.rest,
        break_sec: settings.waterBreak,
        beeps: settings.beeps, voice: settings.voice
      });
    }, 1500);
  }

  /* ==========================================================
     8. DOM
     ========================================================== */

  function $(id) { return document.getElementById(id); }

  var el = {
    body:       document.body,
    scStart:    $('screen-start'),
    scWorkout:  $('screen-workout'),
    scFinished: $('screen-finished'),
    pSettings:  $('panel-settings'),
    pHistory:   $('panel-history'),

    startSummary: $('start-summary'),
    label:   $('wo-label'),
    total:   $('wo-total'),
    seconds: $('wo-seconds'),
    kindTag: $('wo-kind'),
    name:    $('wo-name'),
    cue:     $('wo-cue'),
    next:    $('wo-next'),
    media:   $('wo-media'),
    mediaBox: document.querySelector('.media-box'),
    pausedCard: $('paused-card'),
    videoBox: $('video-box'),
    ringFill: $('ring-fill'),
    toggle:  $('btn-toggle'),

    finTime:  $('fin-time'),
    finCount: $('fin-count'),

    settingsTotal: $('settings-total'),
    syncStatus:    $('sync-status'),
    togBeeps: $('tog-beeps'),
    togVoice: $('tog-voice'),
    rowVoice: $('row-voice'),

    histCount: $('hist-count'),
    histList:  $('hist-list'),

    syncSetup: $('sync-setup'),
    inUrl:     $('in-sync-url'),
    inToken:   $('in-sync-token'),
    syncMsg:   $('sync-msg')
  };

  var RING_C = 2 * Math.PI * 88;   // matches r="88" in index.html

  /* ==========================================================
     9. State + timer
     ========================================================== */

  var state = {
    timeline: [],
    idx: 0,
    running: false,
    endsAt: 0,        // performance.now() deadline for current segment
    segTotalMs: 0,    // current segment length, incl. any +15s
    remainingMs: 0,   // used while paused
    startedAt: null,
    raf: null,
    lastBeepSec: null,
    finished: false
  };

  var painted = { sec: -1, idx: -1, total: -1, kind: '' };

  function seg()  { return state.timeline[state.idx]; }
  function segMs(i) { return state.timeline[i].seconds * 1000; }

  function tailSeconds(fromIdx) {
    var s = 0;
    for (var i = fromIdx; i < state.timeline.length; i++) s += state.timeline[i].seconds;
    return s;
  }

  function currentRemainingMs() {
    return state.running
      ? Math.max(0, state.endsAt - performance.now())
      : state.remainingMs;
  }

  function loadSegment(i, opts) {
    opts = opts || {};
    state.idx = i;
    state.segTotalMs = segMs(i);
    state.lastBeepSec = null;
    if (state.running) state.endsAt = performance.now() + state.segTotalMs;
    else state.remainingMs = state.segTotalMs;
    paintSegment(seg());
    if (opts.announce !== false) {
      if (opts.chime !== false) beepTransition();
      announce(seg());
    }
  }

  /* Advance past every segment whose deadline has passed. This is what makes
     backgrounding the tab safe: rAF stops while hidden, so on return we may be
     several segments behind and must catch up from the clock, not from ticks. */
  function catchUp() {
    if (!state.running) return;
    var now = performance.now();
    var guard = 0;
    while (state.running && now >= state.endsAt && guard++ < 500) {
      if (state.idx >= state.timeline.length - 1) { finish(); return; }
      var overshoot = now - state.endsAt;
      state.idx++;
      state.segTotalMs = segMs(state.idx);
      state.endsAt += state.segTotalMs;
      state.lastBeepSec = null;
      paintSegment(seg());
      // Stay quiet while fast-forwarding through missed segments.
      if (overshoot < 1500) { beepTransition(); announce(seg()); }
    }
  }

  function tick() {
    if (!state.running) return;
    catchUp();
    if (!state.running) return;

    var remain = state.endsAt - performance.now();
    var secLeft = Math.max(0, Math.ceil(remain / 1000));

    if (secLeft <= 3 && secLeft >= 1 && secLeft !== state.lastBeepSec) {
      state.lastBeepSec = secLeft;
      beepCount();
    }

    paintTime(secLeft, remain);
    state.raf = requestAnimationFrame(tick);
  }

  /* ==========================================================
     10. Painting
     ========================================================== */

  var mediaWanted = null;

  /* `hidden` is an HTMLElement IDL property — SVGElement does not have it, so
     `svg.hidden = true` sets a JS expando and the element keeps rendering.
     Toggling the attribute works for both. */
  function setHidden(node, on) {
    if (on) node.setAttribute('hidden', '');
    else node.removeAttribute('hidden');
  }

  function paintSegment(s) {
    if (painted.idx === state.idx) return;
    painted.idx = state.idx;

    el.body.setAttribute('data-kind', s.kind);
    el.label.textContent = s.label;
    el.name.textContent = s.name;
    el.cue.textContent = s.cue;
    el.kindTag.textContent = KIND_TAG[s.kind] || '';

    // "Next up" belongs on the rest segments — that is when she needs it.
    var showNext = (s.kind === 'recover' || s.kind === 'break') && s.nextName;
    el.next.hidden = !showNext;
    if (showNext) el.next.textContent = 'Next up: ' + s.nextName;

    applyVisual(s);
  }

  /* Visual priority: YouTube clip, then a local media loop, then nothing —
     in which case the panel collapses and the name and cue carry the
     instruction on their own.

     Video shows only while the clock runs. A paused YouTube player replaces
     the frame with its own chrome — title bar, play button, share, "More
     videos" thumbnails, and the captions come back — so pausing swaps to a
     plain card of the same size instead. */
  function applyVisual(s) {
    var useVideo   = !!(s.clip && ytUsable() && state.running);
    var showPaused = !!(s.clip && ytUsable() && !state.running);

    setHidden(el.videoBox, !useVideo);
    setHidden(el.pausedCard, !showPaused);

    if (useVideo || showPaused) {
      el.mediaBox.classList.remove('is-empty');
      setHidden(el.media, true);
      el.media.onload = el.media.onerror = null;
      el.media.removeAttribute('src');
      mediaWanted = null;
      if (useVideo) {
        if (!sameClip(yt.clip, s.clip)) playClip(s.clip);
        else if (yt.paused) resumeClip();
      }
      return;
    }

    // Not showing video on this segment — don't leave it playing unseen.
    stopClip();

    /* `want` guards against a slow image resolving after she has already
       skipped on — without it a late onload would show the wrong exercise. */
    var want = s.media || null;
    mediaWanted = want;
    el.media.onload = el.media.onerror = null;

    if (want) {
      setHidden(el.media, true);
      el.mediaBox.classList.add('is-empty');
      el.media.onload = function () {
        if (mediaWanted !== want) return;
        setHidden(el.media, false);
        el.mediaBox.classList.remove('is-empty');
      };
      el.media.onerror = function () {
        if (mediaWanted !== want) return;
        setHidden(el.media, true);
        el.mediaBox.classList.add('is-empty');
      };
      el.media.src = want;
    } else {
      setHidden(el.media, true);
      el.media.removeAttribute('src');
      el.mediaBox.classList.add('is-empty');
    }
  }

  /* Re-run the visual choice for the segment on screen. Called when the
     player becomes ready or fails after the segment was already painted. */
  function refreshVisual() {
    if (el.scWorkout.hidden) return;
    var s = state.timeline[state.idx];
    if (s) applyVisual(s);
  }

  function paintTime(secLeft, remainMs) {
    if (secLeft !== painted.sec) {
      painted.sec = secLeft;
      el.seconds.textContent = secLeft;

      var totalLeft = Math.ceil(remainMs / 1000) + tailSeconds(state.idx + 1);
      if (totalLeft !== painted.total) {
        painted.total = totalLeft;
        el.total.textContent = fmtClock(totalLeft) + ' left';
      }
    }
    var frac = state.segTotalMs > 0 ? Math.max(0, remainMs) / state.segTotalMs : 0;
    el.ringFill.style.strokeDashoffset = (RING_C * (1 - frac)).toFixed(1);
  }

  function repaintAll() {
    painted.idx = -1; painted.sec = -1; painted.total = -1;
    paintSegment(seg());
    var r = currentRemainingMs();
    paintTime(Math.max(0, Math.ceil(r / 1000)), r);
  }

  /* ==========================================================
     11. Transport
     ========================================================== */

  function showScreen(which) {
    el.scStart.hidden    = (which !== 'start');
    el.scWorkout.hidden  = (which !== 'workout');
    el.scFinished.hidden = (which !== 'finished');
  }

  function start() {
    initAudio();
    state.timeline = buildTimeline(settings);
    state.idx = 0;
    state.running = true;
    state.finished = false;
    state.startedAt = Date.now();
    state.segTotalMs = segMs(0);
    state.endsAt = performance.now() + state.segTotalMs;
    state.lastBeepSec = null;

    showScreen('workout');
    el.body.removeAttribute('data-paused');
    el.toggle.textContent = 'Pause';
    painted.idx = -1;
    paintSegment(seg());
    say('Warm up. ' + seg().name + '.');
    acquireWakeLock();
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(tick);
  }

  function pause() {
    if (!state.running) return;
    state.remainingMs = Math.max(0, state.endsAt - performance.now());
    state.running = false;
    cancelAnimationFrame(state.raf);
    hushSpeech();
    pauseClip();
    releaseWakeLock();
    el.body.setAttribute('data-paused', 'true');
    el.toggle.textContent = 'Resume';
    refreshVisual();
  }

  function resume() {
    if (state.running || state.finished) return;
    initAudio();
    state.running = true;
    state.endsAt = performance.now() + state.remainingMs;
    el.body.removeAttribute('data-paused');
    el.toggle.textContent = 'Pause';
    resumeClip();
    refreshVisual();
    acquireWakeLock();
    state.raf = requestAnimationFrame(tick);
  }

  function jump(delta) {
    if (state.finished) return;
    hushSpeech();
    var elapsed = state.segTotalMs - currentRemainingMs();

    if (delta < 0 && elapsed > 3000) {
      loadSegment(state.idx, { chime: false });   // restart current
    } else {
      var target = state.idx + delta;
      if (target < 0) target = 0;
      if (target > state.timeline.length - 1) { finish(); return; }
      loadSegment(target, { chime: false });
    }
    repaintAll();
  }

  function extend(ms) {
    if (state.finished) return;
    state.segTotalMs += ms;
    if (state.running) state.endsAt += ms;
    else state.remainingMs += ms;
    painted.sec = -1; painted.total = -1;
    var r = currentRemainingMs();
    paintTime(Math.ceil(r / 1000), r);
  }

  function reset() {
    state.running = false;
    cancelAnimationFrame(state.raf);
    hushSpeech();
    stopClip();
    releaseWakeLock();
    state.idx = 0;
    state.startedAt = null;
    state.finished = false;
    painted.idx = -1;
    el.body.removeAttribute('data-paused');
    el.body.setAttribute('data-kind', 'idle');
    showScreen('start');
  }

  function finish() {
    // Idempotent on purpose. Several paths can reach here (skipping past the
    // last segment, the clock running out, catching up after a backgrounded
    // tab) and a second call would write a duplicate history row and a
    // duplicate Sheet row.
    if (state.finished) return;
    state.finished = true;

    var endedAt = Date.now();
    var startedAt = state.startedAt;

    state.running = false;
    cancelAnimationFrame(state.raf);
    stopClip();
    releaseWakeLock();
    el.body.setAttribute('data-kind', 'finished');

    var durationSec = startedAt ? Math.round((endedAt - startedAt) / 1000) : 0;

    // Completed sessions only. An abandoned session leaves no trace,
    // locally or in the Sheet.
    var entry = {
      startedAt: startedAt ? new Date(startedAt).toISOString() : null,
      endedAt: new Date(endedAt).toISOString(),
      durationSec: durationSec,
      completed: true
    };
    var hist = LS.get(K.history, []) || [];
    hist.push(entry);
    if (hist.length > 200) hist = hist.slice(-200);
    LS.set(K.history, hist);

    Sync.queue('history', {
      started_at: entry.startedAt,
      ended_at: entry.endedAt,
      duration_sec: durationSec,
      work_sec: settings.work,
      rest_sec: settings.rest,
      break_sec: settings.waterBreak
    });

    el.finTime.textContent = fmtClock(durationSec) + ' of movement';
    el.finCount.textContent = hist.length === 1
      ? 'Your first session. '
      : 'Session number ' + hist.length + '.';

    showScreen('finished');
    beepFinish();
    say('All done. Great work.');
  }

  /* ==========================================================
     12. Settings panel
     ========================================================== */

  function saveSettings() {
    LS.set(K.settings, settings);
    queueSettingsSync();
  }

  function renderSettings() {
    ['work', 'rest', 'waterBreak'].forEach(function (k) {
      $('val-' + k).textContent = settings[k] + 's';
    });
    el.togBeeps.setAttribute('aria-checked', settings.beeps ? 'true' : 'false');
    el.togVoice.setAttribute('aria-checked', settings.voice ? 'true' : 'false');
    el.settingsTotal.textContent =
      'A full session runs ' + fmtClock(timelineSeconds(buildTimeline(settings))) + '.';
    renderStartSummary();
    renderSyncStatus();
    el.inUrl.value = syncCfg.url;
    el.inToken.value = syncCfg.token;
  }

  function renderSyncStatus() {
    var text = Sync.statusText();
    if (!text) { el.syncStatus.hidden = true; return; }
    el.syncStatus.hidden = false;
    el.syncStatus.textContent = text;
  }

  function renderStartSummary() {
    var mins = Math.round(timelineSeconds(buildTimeline(settings)) / 60);
    el.startSummary.textContent =
      mins + ' minutes · ' + ROUNDS + ' rounds · ' + settings.work + 's work / ' +
      settings.rest + 's recover';
  }

  function bump(key, delta) {
    var lim = LIMITS[key];
    var next = settings[key] + delta;
    if (next < lim[0] || next > lim[1]) return;
    settings[key] = next;
    saveSettings();
    renderSettings();
  }

  function syncMsg(text, cls) {
    if (!text) { el.syncMsg.hidden = true; return; }
    el.syncMsg.hidden = false;
    el.syncMsg.className = 'sync-msg ' + (cls || '');
    el.syncMsg.textContent = text;
  }

  function showBootstrapped() {
    renderSettings();
    el.syncSetup.open = true;
    syncMsg('Sync set up on this device.', 'ok');
    openPanel(el.pSettings);
    renderSyncStatus();
    Sync.flush();
  }

  function testSync() {
    if (!Sync.enabled()) { syncMsg('Enter a URL first.', 'bad'); return; }
    syncMsg('Testing…', 'busy');

    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

    fetch(syncCfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: syncCfg.token, type: 'ping', device: deviceId }),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      var data = null;
      try { data = JSON.parse(text); } catch (e) {}
      if (!data) throw new Error('Unexpected reply — check the URL ends in /exec');
      if (data.ok === false) throw new Error(data.error || 'rejected');
      syncMsg('Connected. Nothing was written to the sheet.', 'ok');
      Sync.flush();
    }).catch(function (err) {
      clearTimeout(timer);
      var m = String(err && err.message || err);
      if (/abort/i.test(m))       m = 'Timed out. Check the URL and that access is set to Anyone.';
      else if (/bad token/i.test(m)) m = 'Token rejected — it must match SHARED_TOKEN in Code.gs.';
      else if (/Failed to fetch|NetworkError|Load failed/i.test(m))
        m = 'Could not reach it. Check the URL ends in /exec, not /dev.';
      syncMsg(m, 'bad');
    });
  }

  /* ==========================================================
     13. History panel
     ========================================================== */

  function renderHistory() {
    var hist = (LS.get(K.history, []) || []).slice().reverse();
    el.histList.innerHTML = '';

    if (!hist.length) {
      el.histCount.textContent = '';
      var li = document.createElement('li');
      li.className = 'hist-empty';
      li.textContent = 'No sessions yet. Finish one and it will show up here.';
      el.histList.appendChild(li);
      return;
    }

    el.histCount.textContent = hist.length +
      (hist.length === 1 ? ' completed session' : ' completed sessions');

    hist.forEach(function (h) {
      var when = h.endedAt ? new Date(h.endedAt) : null;
      var li = document.createElement('li');

      var left = document.createElement('span');
      left.textContent = when
        ? when.toLocaleDateString(undefined,
            { weekday: 'short', day: 'numeric', month: 'short' })
        : 'Session';

      var right = document.createElement('span');
      right.className = 'hist-dur';
      right.textContent = fmtClock(h.durationSec || 0);

      li.appendChild(left);
      li.appendChild(right);
      el.histList.appendChild(li);
    });
  }

  /* ==========================================================
     14. Wiring
     ========================================================== */

  function openPanel(p)  { p.hidden = false; }
  function closePanel(p) { p.hidden = true; }

  $('btn-start').addEventListener('click', start);
  $('btn-again').addEventListener('click', start);
  $('btn-done').addEventListener('click', reset);
  $('btn-reset').addEventListener('click', reset);

  el.toggle.addEventListener('click', function () {
    if (state.running) pause(); else resume();
  });
  $('btn-next').addEventListener('click', function () { jump(1); });
  $('btn-prev').addEventListener('click', function () { jump(-1); });
  $('btn-plus').addEventListener('click', function () { extend(15000); });

  $('btn-open-settings').addEventListener('click', function () {
    renderSettings(); openPanel(el.pSettings);
  });
  $('btn-close-settings').addEventListener('click', function () {
    closePanel(el.pSettings);
  });
  $('btn-open-history').addEventListener('click', function () {
    renderHistory(); openPanel(el.pHistory);
  });
  $('btn-open-history-2').addEventListener('click', function () {
    renderHistory(); openPanel(el.pHistory);
  });
  $('btn-close-history').addEventListener('click', function () {
    closePanel(el.pHistory);
  });

  el.pSettings.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-delta]');
    if (!btn) return;
    bump(btn.getAttribute('data-key'), parseInt(btn.getAttribute('data-delta'), 10));
  });

  el.togBeeps.addEventListener('click', function () {
    settings.beeps = !settings.beeps;
    saveSettings(); renderSettings();
    if (settings.beeps) { initAudio(); setTimeout(beepCount, 60); }
  });

  el.togVoice.addEventListener('click', function () {
    settings.voice = !settings.voice;
    saveSettings(); renderSettings();
    if (settings.voice) say('Spoken cues on.'); else hushSpeech();
  });

  $('btn-defaults').addEventListener('click', function () {
    Object.keys(DEFAULTS).forEach(function (k) { settings[k] = DEFAULTS[k]; });
    saveSettings(); renderSettings();
  });

  $('btn-sync-save').addEventListener('click', function () {
    var url = el.inUrl.value.trim();
    if (url && url.indexOf('http') !== 0) {
      syncMsg('That does not look like a URL.', 'bad'); return;
    }
    if (url && !/\/exec\/?$/.test(url)) {
      syncMsg('Warning: an Apps Script URL should end in /exec. Saved anyway.', 'bad');
    } else {
      syncMsg('Saved on this device.', 'ok');
    }
    saveSyncCfg(url, el.inToken.value);
    renderSyncStatus();
    Sync.flush();
  });

  $('btn-sync-test').addEventListener('click', function () {
    saveSyncCfg(el.inUrl.value, el.inToken.value);
    testSync();
  });

  $('btn-sync-clear').addEventListener('click', function () {
    if (!window.confirm('Remove the sync settings from this device?')) return;
    clearSyncCfg();
    el.inUrl.value = ''; el.inToken.value = '';
    syncMsg('Cleared. Sessions are saved on this device only.', 'ok');
    renderSyncStatus();
  });

  $('btn-sync-link').addEventListener('click', function () {
    if (!Sync.enabled()) { syncMsg('Save a URL first.', 'bad'); return; }
    var link = setupLink();
    var done = function () {
      syncMsg('Setup link copied. Open it once on her device, then delete it.', 'ok');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done).catch(function () {
        window.prompt('Copy this setup link:', link);
      });
    } else {
      window.prompt('Copy this setup link:', link);
    }
  });

  $('btn-clear-hist').addEventListener('click', function () {
    if (!window.confirm('Delete all saved sessions on this device?')) return;
    LS.set(K.history, []);
    renderHistory();
  });

  // Space / arrows for anyone using this on a laptop.
  document.addEventListener('keydown', function (e) {
    if (el.scWorkout.hidden || !el.pSettings.hidden || !el.pHistory.hidden) return;
    if (e.key === ' ') { e.preventDefault(); state.running ? pause() : resume(); }
    if (e.key === 'ArrowRight') jump(1);
    if (e.key === 'ArrowLeft')  jump(-1);
  });

  // rAF is throttled or stopped entirely while hidden, so re-sync from the
  // clock on return rather than trusting the frame loop to have kept counting.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    Sync.flush();
    if (!state.running) return;
    acquireWakeLock();      // the lock is dropped automatically when hidden
    catchUp();
    if (state.running) {
      repaintAll();
      refreshVisual();       // the iframe is throttled while hidden too
      cancelAnimationFrame(state.raf);
      state.raf = requestAnimationFrame(tick);
    }
  });

  window.addEventListener('online', function () { Sync.flush(); });

  /* ==========================================================
     15. Boot
     ========================================================== */

  if (!speechOK) el.rowVoice.hidden = true;
  el.ringFill.style.strokeDasharray = RING_C.toFixed(1);

  loadYouTube();
  loadSyncCfg();
  if (bootstrapFromHash()) showBootstrapped();

  /* Tapping the setup link while the app is already open is a same-document
     navigation — the page never reloads, so the load-time bootstrap above
     would never run. Catch it here too. */
  window.addEventListener('hashchange', function () {
    if (bootstrapFromHash()) showBootstrapped();
  });

  renderStartSummary();
  renderSyncStatus();
  Sync.flush();
  showScreen('start');

})();
