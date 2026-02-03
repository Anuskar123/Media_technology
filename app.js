// Core App Logic
const app = {
  currentUser: null,
  currentCourse: null,
  currentModule: null,
  courses: [],
  users: [],
  // Hashed password (SHA-256 hash of the actual password)
  masterPasswordHash: "307034ff261c1566ae9f3860a1662f8ec526e2fbb6ee3bf20e7282dcd29734dc",
  init() {
    this.loadData();
    this.setupEventListeners();
  },
  loadData() {
    fetch('./data/course.json')
      .then(res => res.json())
      .then(data => {
        this.courses = data.courses;
        this.users = data.users;
      })
      .catch(err => console.error('Failed to load course data:', err));
  },
  // Hash function using SHA-256
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },
  setupEventListeners() {
    document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
    document.getElementById('pinInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') this.handleLogin();
    });
    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
      document.getElementById('passwordInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') this.handleLogin();
      });
      document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
      document.getElementById('startExamBtn').addEventListener('click', () => this.showExam());
    document.getElementById('closeExamBtn').addEventListener('click', () => this.hideExam());
    document.getElementById('submitExamBtn').addEventListener('click', () => this.submitExam());
    document.getElementById('pdfFullscreenBtn')?.addEventListener('click', () => this.togglePdfFullscreen());
  },
  async handleLogin() {
    const pin = document.getElementById('pinInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    
    if (!pin) {
      this.showError('Please enter your PIN.');
      return;
    }
    if (!password) {
      this.showError('Please enter the master password.');
      return;
    }

    const user = this.users.find(u => u.pin === pin);
    if (!user) {
      this.showError('Invalid PIN. Contact the administrator.');
      return;
    }
    
    // Hash the entered password and compare with stored hash
    const passwordHash = await this.hashPassword(password);
    if (passwordHash !== this.masterPasswordHash) {
      this.showError('Invalid password. Please try again.');
      return;
    }

    this.currentUser = user;
    this.showLoginSuccess();
    this.renderCourseList();
  },
  handleLogout() {
    this.currentUser = null;
    this.currentCourse = null;
    this.currentModule = null;
    document.getElementById('loginCard').hidden = false;
    document.getElementById('contentArea').hidden = true;
    document.getElementById('userChip').hidden = true;
    document.getElementById('pinInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginError').hidden = true;
  },
  showError(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.hidden = false;
  },
  showLoginSuccess() {
    document.getElementById('loginCard').hidden = true;
    document.getElementById('contentArea').hidden = false;
    document.getElementById('userChip').hidden = false;
    document.getElementById('userName').textContent = this.currentUser.name;
    document.getElementById('loginError').hidden = true;
  },
  renderCourseList() {
    const courseList = document.getElementById('courseList');
    courseList.innerHTML = '';
    const accessibleCourses = this.courses.filter(c =>
      this.currentUser.accessibleCourses.includes(c.id)
    );
    accessibleCourses.forEach(course => {
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="course-btn" data-id="${course.id}">
          <strong>${course.title}</strong>
          <span class="muted" style="font-size: 0.9rem;">${course.totalModules} modules</span>
        </button>
      `;
      li.querySelector('button').addEventListener('click', () => this.selectCourse(course.id));
      courseList.appendChild(li);
    });
  },
  selectCourse(courseId) {
    this.currentCourse = this.courses.find(c => c.id === courseId);
    this.currentModule = null;
    this.updateCourseButtons();
    this.showCourseOverview();
  },
  updateCourseButtons() {
    document.querySelectorAll('.course-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.id === this.currentCourse.id) {
        btn.classList.add('active');
      }
    });
  },
  showCourseOverview() {
    document.getElementById('moduleArea').hidden = true;
    document.getElementById('examArea').hidden = true;
    document.getElementById('courseOverview').hidden = false;

    document.getElementById('courseTitle').textContent = this.currentCourse.title;
    document.getElementById('courseDescription').textContent = this.currentCourse.description;

    const meta = document.getElementById('courseMeta');
    meta.innerHTML = `
      <div class="tag">${this.currentCourse.totalModules} Modules</div>
      <div class="tag">PDF: ${this.currentCourse.pdfFile}</div>
      <div class="tag" style="cursor: pointer; background: #dbeafe; color: #0284c7;" onclick="app.showFirstModule()">
        → Start Learning
      </div>
    `;
  },
  showFirstModule() {
    if (this.currentCourse.modules.length > 0) {
      this.selectModule(this.currentCourse.modules[0].id);
    }
  },
  selectModule(moduleId) {
    this.currentModule = this.currentCourse.modules.find(m => m.id === moduleId);
    this.renderModule();
  },
  renderModule() {
    document.getElementById('courseOverview').hidden = true;
    document.getElementById('examArea').hidden = true;
    document.getElementById('moduleArea').hidden = false;

    const mod = this.currentModule;
    document.getElementById('moduleTitle').textContent = mod.title;
    document.getElementById('moduleLevel').textContent = '📚 ' + mod.level;

    // Objectives
    const objectives = document.getElementById('moduleObjectives');
    objectives.innerHTML = mod.objectives.map(obj => `<li>${obj}</li>`).join('');

    // Key Concepts
    const concepts = document.getElementById('moduleConcepts');
    concepts.innerHTML = mod.concepts.map(concept => `<li><strong>${concept}</strong></li>`).join('');

    // Examples
    const examples = document.getElementById('moduleExamples');
    examples.innerHTML = mod.examples.map(ex => `<li>${ex}</li>`).join('');

    // Practice Tasks
    const practice = document.getElementById('modulePractice');
    practice.innerHTML = mod.practice.map(task => `<li>${task}</li>`).join('');

    // Scenario Questions
    const scenariosContainer = document.getElementById('moduleScenarios');
    const scenarios = mod.scenarioQuestions || [];
    if (scenarios.length === 0) {
      scenariosContainer.innerHTML = '<p class="muted">No scenario questions yet.</p>';
    } else {
      scenariosContainer.innerHTML = scenarios
        .map((scenario, index) => `
          <div class="scenario-card">
            <div class="scenario-question">🧩 Scenario ${index + 1}: ${scenario.question}</div>
            <button class="ghost btn-small" data-scenario="${index}">Show Answer</button>
            <div class="scenario-answer" data-answer="${index}" hidden>${scenario.answer}</div>
          </div>
        `)
        .join('');

      scenariosContainer.querySelectorAll('button[data-scenario]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = btn.getAttribute('data-scenario');
          const answerEl = scenariosContainer.querySelector(`[data-answer="${idx}"]`);
          const isHidden = answerEl.hasAttribute('hidden');
          if (isHidden) {
            answerEl.removeAttribute('hidden');
            btn.textContent = 'Hide Answer';
          } else {
            answerEl.setAttribute('hidden', '');
            btn.textContent = 'Show Answer';
          }
        });
      });
    }

    // Deep Notes
    const notes = document.getElementById('moduleNotes');
    notes.innerHTML = `<p>${mod.deepNotes}</p>`;

    // PDF Viewer
    const pdfPath = `./pdfs/${this.currentCourse.pdfFile}`;
    document.getElementById('pdfViewer').src = pdfPath;

    // Progress
    const moduleIndex = this.currentCourse.modules.findIndex(m => m.id === this.currentModule.id);
    document.getElementById('progressInfo').innerHTML = `
      <strong>${moduleIndex + 1}/${this.currentCourse.modules.length}</strong>
      <div style="margin-top: 8px; height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
        <div style="height: 100%; width: ${((moduleIndex + 1) / this.currentCourse.modules.length * 100)}%; background: #2563eb; border-radius: 999px;"></div>
      </div>
    `;

    // Module Navigation
    this.renderModuleNavigation();
  },
  togglePdfFullscreen() {
    const pdfViewer = document.getElementById('pdfViewer');
    if (!pdfViewer) return;
    
    if (!document.fullscreenElement) {
      pdfViewer.requestFullscreen().catch(err => {
        console.log('Fullscreen request failed:', err);
        alert('Fullscreen not available in your browser');
      });
    } else {
      document.exitFullscreen();
    }
  },
  renderModuleNavigation() {
    const moduleArea = document.getElementById('moduleArea');
    const modules = this.currentCourse.modules;
    const currentIndex = modules.findIndex(m => m.id === this.currentModule.id);

    let nav = '<div style="display: flex; gap: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">';

    if (currentIndex > 0) {
      nav += `<button class="ghost" onclick="app.selectModule('${modules[currentIndex - 1].id}')">← Previous</button>`;
    }

    nav += '<div style="flex: 1;"></div>';

    if (currentIndex < modules.length - 1) {
      nav += `<button class="ghost" onclick="app.selectModule('${modules[currentIndex + 1].id}')">Next →</button>`;
    }

    nav += '</div>';
    
    let navDiv = moduleArea.querySelector('[data-nav]');
    if (!navDiv) {
      navDiv = document.createElement('div');
      navDiv.setAttribute('data-nav', 'true');
      moduleArea.appendChild(navDiv);
    }
    navDiv.innerHTML = nav;
  },
  showExam() {
    document.getElementById('courseOverview').hidden = true;
    document.getElementById('moduleArea').hidden = true;
    document.getElementById('examArea').hidden = false;

    const exam = this.currentCourse.exam;
    document.getElementById('examTitle').textContent = exam.title;
    document.getElementById('examIntro').textContent = exam.intro;

    const form = document.getElementById('examForm');
    form.innerHTML = exam.questions.map((q, idx) => `
      <div class="question" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 12px;">
        <h3 style="margin: 0 0 12px 0; font-size: 1rem;">Q${idx + 1}: ${q.question}</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${q.options.map((opt, i) => `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="q${q.id}" value="${i}" />
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');

    document.getElementById('examResult').hidden = true;
  },
  hideExam() {
    this.renderModule();
  },
  submitExam() {
    const exam = this.currentCourse.exam;
    const form = document.getElementById('examForm');
    let correctCount = 0;
    const answers = [];

    exam.questions.forEach(q => {
      const selected = form.querySelector(`input[name="q${q.id}"]:checked`);
      if (selected) {
        const answerIndex = parseInt(selected.value);
        answers.push({ questionId: q.id, selected: answerIndex, correct: q.correct });
        if (answerIndex === q.correct) correctCount++;
      }
    });

    const percentage = (correctCount / exam.questions.length) * 100;
    const passed = percentage >= exam.passingScore;

    const resultDiv = document.getElementById('examResult');
    resultDiv.innerHTML = `
      <div style="padding: 16px; background: ${passed ? '#ecfccb' : '#fecaca'}; border-radius: 10px;">
        <h3 style="margin: 0 0 8px 0;">
          ${passed ? '✓ PASSED' : '✗ FAILED'}
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 1.2rem;">
          Score: <strong>${correctCount}/${exam.questions.length} (${Math.round(percentage)}%)</strong>
        </p>
        <p style="margin: 0; color: #555;">Passing Score: ${exam.passingScore}%</p>
      </div>
      <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <h3>Review</h3>
        ${answers.map(ans => {
          const q = exam.questions.find(x => x.id === ans.questionId);
          const isCorrect = ans.selected === ans.correct;
          return `
            <div style="margin-bottom: 16px; padding: 12px; background: ${isCorrect ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; border-left: 4px solid ${isCorrect ? '#22c55e' : '#ef4444'};">
              <strong>${q.question}</strong>
              <p style="margin: 8px 0 4px 0;">Your answer: <span style="color: ${isCorrect ? '#16a34a' : '#dc2626'};">${q.options[ans.selected]}</span></p>
              <p style="margin: 4px 0 8px 0; color: #666;">Correct answer: <strong>${q.options[ans.correct]}</strong></p>
              <p style="margin: 0; font-size: 0.9rem; color: #666;"><em>${q.explanation}</em></p>
            </div>
          `;
        }).join('')}
      </div>
    `;
    resultDiv.hidden = false;
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => app.init());
