(function(){
  "use strict";

  // ---------------------------------------------------------------
  // Evidence pool — each item is intercepted data the detective
  // must reproduce a matching sample of.
  // ---------------------------------------------------------------
  const POOL = [
    { display: "/^[A-Z]{2}\\d{4}$/",                    regex: /^[A-Z]{2}\d{4}$/,                    tag: "LICENSE PLATE" },
    { display: "/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/", regex: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, tag: "IP ADDRESS" },
    { display: "/^#[a-zA-Z0-9_]+$/",                    regex: /^#[a-zA-Z0-9_]+$/,                    tag: "COMMS TAG" },
    { display: "/^[A-Za-z0-9]{8,}$/",                   regex: /^[A-Za-z0-9]{8,}$/,                   tag: "ACCESS CODE" },
    { display: "/^\\d{2}:\\d{2}$/",                     regex: /^\d{2}:\d{2}$/,                       tag: "TIMESTAMP" },
    { display: "/^[A-Z]\\d{9}$/",                       regex: /^[A-Z]\d{9}$/,                        tag: "PASSPORT NO." },
    { display: "/^[a-z]+_[a-z]+$/",                     regex: /^[a-z]+_[a-z]+$/,                     tag: "ALIAS HANDLE" },
    { display: "/^\\(\\d{3}\\)\\s\\d{3}-\\d{4}$/",      regex: /^\(\d{3}\)\s\d{3}-\d{4}$/,            tag: "PHONE INTERCEPT" },
    { display: "/^[A-Za-z]+\\d{2,4}$/",                 regex: /^[A-Za-z]+\d{2,4}$/,                  tag: "CODENAME" },
    { display: "/^[A-Z]{3}-\\d{3}$/",                   regex: /^[A-Z]{3}-\d{3}$/,                    tag: "CASE REFERENCE" }
  ];

  const TOTAL_ROUNDS = 8;
  const POINTS_PER_MATCH = 10;
  const ROUND_TIME_LIMIT = 30; // seconds allowed per case

  let queue = [];
  let roundIndex = 0;
  let score = 0;
  let correctCount = 0;
  let skippedCount = 0;
  let timedOutCount = 0;
  let roundStartTime = 0;
  let timerHandle = null;
  let timeoutFired = false;

  const screenEl = document.getElementById("screen");

  function shuffle(arr){
    const a = arr.slice();
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function elapsedSeconds(){
    return (Date.now() - roundStartTime) / 1000;
  }

  function renderWelcome(){
    stopTimer();
    screenEl.innerHTML = `
      <div class="letterhead">
        <div>
          <div class="agency">PATTERN DIVISION</div>
          <div class="sub">Regex Challenge Game &mdash; Field Manual</div>
        </div>
        <div class="stamp-mini">CONFIDENTIAL</div>
      </div>

      <h1 class="logo">Open a New Case</h1>
      <p class="tagline">
        Intercepted patterns keep coming across the desk. For each one,
        write a sample that fits the pattern exactly. You have
        <span class="redact">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        30 seconds per case &mdash; answer fast for full points, or the case goes cold.
      </p>

      <div class="btn-row">
        <button class="btn" id="startBtn">[ OPEN CASE FILE ]</button>
      </div>
    `;
    document.getElementById("startBtn").addEventListener("click", startGame);
  }

  function startGame(){
    queue = shuffle(POOL).slice(0, TOTAL_ROUNDS);
    roundIndex = 0;
    score = 0;
    correctCount = 0;
    skippedCount = 0;
    timedOutCount = 0;
    renderChallenge();
  }

  function renderChallenge(){
    stopTimer();
    const challenge = queue[roundIndex];
    roundStartTime = Date.now();
    timeoutFired = false;

    screenEl.innerHTML = `
      <div class="letterhead">
        <div>
          <div class="agency">PATTERN DIVISION</div>
          <div class="sub">Case ${roundIndex + 1} of ${TOTAL_ROUNDS}</div>
        </div>
        <div class="stamp-mini">${challenge.tag}</div>
      </div>

      <div class="case-meta">
        <span>POINTS ON FILE <b id="hudScore">${score}</b></span>
        <span>CLOCK <b id="hudTime">${ROUND_TIME_LIMIT}s</b></span>
      </div>

      <div class="evidence-label">INTERCEPTED PATTERN &mdash; submit a sample that matches:</div>
      <div class="evidence-box">
        <div class="pin"></div>
        <div class="pattern-text">${challenge.display}</div>
      </div>

      <div class="field-row">
        <label>SAMPLE:</label>
        <input type="text" id="answerInput" autocomplete="off" autocapitalize="off"
               autocorrect="off" spellcheck="false" placeholder="write a matching value..." />
      </div>
      <div class="feedback-text" id="feedback" role="status"></div>

      <div class="btn-row">
        <button class="btn" id="submitBtn">[ SUBMIT EVIDENCE ]</button>
        <button class="btn ghost" id="skipBtn">[ SKIP CASE ]</button>
      </div>

      <div class="stamp-overlay" id="stampOverlay"></div>
    `;

    const input = document.getElementById("answerInput");
    input.focus();
    input.addEventListener("keydown", (e) => { if(e.key === "Enter") submitAnswer(); });
    document.getElementById("submitBtn").addEventListener("click", submitAnswer);
    document.getElementById("skipBtn").addEventListener("click", skipChallenge);

    startTimer();
  }

  function startTimer(){
    timerHandle = setInterval(() => {
      const remaining = Math.max(0, ROUND_TIME_LIMIT - Math.floor(elapsedSeconds()));
      const el = document.getElementById("hudTime");
      if(el) el.textContent = remaining + "s";
      if(remaining <= 0 && !timeoutFired){
        timeoutFired = true;
        handleTimeout();
      }
    }, 250);
  }

  function stopTimer(){
    if(timerHandle){ clearInterval(timerHandle); timerHandle = null; }
  }

  function handleTimeout(){
    stopTimer();
    const input = document.getElementById("answerInput");
    const submitBtn = document.getElementById("submitBtn");
    const skipBtn = document.getElementById("skipBtn");
    const feedback = document.getElementById("feedback");
    const stamp = document.getElementById("stampOverlay");

    if(input) input.disabled = true;
    if(submitBtn) submitBtn.disabled = true;
    if(skipBtn) skipBtn.disabled = true;
    if(feedback) feedback.textContent = "Time's up — case marked incomplete.";
    if(stamp){
      stamp.className = "";
      void stamp.offsetWidth;
      stamp.textContent = "TIME'S UP";
      stamp.className = "stamp-overlay show-wrong";
    }

    timedOutCount++;
    setTimeout(() => {
      roundIndex++;
      if(roundIndex >= TOTAL_ROUNDS) renderEnd();
      else renderChallenge();
    }, 900);
  }

  function submitAnswer(){
    if(timeoutFired) return;
    const input = document.getElementById("answerInput");
    const feedback = document.getElementById("feedback");
    const stamp = document.getElementById("stampOverlay");
    const challenge = queue[roundIndex];
    const value = input.value.trim();

    if(value.length === 0){
      feedback.textContent = "The file needs a sample before it can be stamped.";
      return;
    }

    const isMatch = challenge.regex.test(value);

    if(isMatch){
      const secs = elapsedSeconds();
      const earned = Math.max(1, POINTS_PER_MATCH - Math.floor(secs / 20));
      score += earned;
      correctCount++;
      feedback.textContent = `Confirmed in ${secs.toFixed(1)}s — +${earned} pts.`;
      stamp.textContent = "MATCH CONFIRMED";
      stamp.className = "stamp-overlay show-correct";
      document.getElementById("hudScore").textContent = score;
      input.disabled = true;
      document.getElementById("submitBtn").disabled = true;
      setTimeout(() => {
        roundIndex++;
        if(roundIndex >= TOTAL_ROUNDS) renderEnd();
        else renderChallenge();
      }, 750);
    } else {
      feedback.textContent = "Doesn't match the pattern — revise or skip the case.";
      stamp.className = "";
      void stamp.offsetWidth;
      stamp.textContent = "NO MATCH";
      stamp.className = "stamp-overlay show-wrong";
      input.select();
    }
  }

  function skipChallenge(){
    if(timeoutFired) return;
    skippedCount++;
    roundIndex++;
    if(roundIndex >= TOTAL_ROUNDS) renderEnd();
    else renderChallenge();
  }

  function renderEnd(){
    stopTimer();
    const maxScore = TOTAL_ROUNDS * POINTS_PER_MATCH;
    let rank;
    if(score >= maxScore * 0.8) rank = "MASTER PATTERN ANALYST";
    else if(score >= maxScore * 0.5) rank = "SENIOR INVESTIGATOR";
    else rank = "ROOKIE DETECTIVE";

    screenEl.innerHTML = `
      <div class="letterhead">
        <div>
          <div class="agency">PATTERN DIVISION</div>
          <div class="sub">Final Report</div>
        </div>
        <div class="stamp-mini" style="color:var(--stamp-green); border-color:var(--stamp-green);">CASE CLOSED</div>
      </div>

      <div class="end-score">${score} <span style="font-size:15px;color:var(--ink-dim)">/ ${maxScore} pts</span></div>
      <div class="end-rank">RANK AWARDED &mdash; ${rank}</div>

      <div class="stat-lines">
        <div>Cases solved: <b>${correctCount} / ${TOTAL_ROUNDS}</b></div>
        <div>Cases skipped: <b>${skippedCount}</b></div>
        <div>Cases timed out: <b>${timedOutCount}</b></div>
        <div>Clearance rate: <b>${Math.round((correctCount / TOTAL_ROUNDS) * 100)}%</b></div>
        <div>Avg points per case: <b>${(score / TOTAL_ROUNDS).toFixed(1)}</b></div>
      </div>

      <div class="btn-row">
        <button class="btn" id="restartBtn">[ OPEN NEW CASE FILE ]</button>
      </div>
    `;
    document.getElementById("restartBtn").addEventListener("click", startGame);
  }

  renderWelcome();
})();
