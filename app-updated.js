// Core App Logic - Enhanced Version
const app = {
  currentUser: null,
  currentCourse: null,
  currentModule: null,
  courses: [],
  users: [],
  masterPassword: "hardwork",
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
  setupEventListeners() {
    document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
    document.getElementById('pinInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') this.handleLogin();
    });
    document.getElementById('passwordInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') this.handleLogin();
    });
    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    document.getElementById('startExamBtn').addEventListener('click', () => this.showExam());
    document.getElementById('closeExamBtn').addEventListener('click', () => this.hideExam());
    document.getElementById('submitExamBtn').addEventListener('click', () => this.submitExam());
    document.getElementById('pdfFullscreenBtn')?.addEventListener('click', () => this.togglePdfFullscreen());
  },
  handleLogin() {
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
    
    if (password !== this.masterPassword) {
      this.showError('Invalid password. Please try again.');
      return;
    }

    this.currentUser = user;
    this.showLoginSuccess();
    this.renderCourseList();
    this.renderNewSection();
  },
  renderNewSection() {
    const section = document.getElementById('newSection');
    const list = document.getElementById('newList');
    if (!section || !list || !this.currentUser) return;

    const newCourses = this.courses.filter(course =>
      course.isNew && this.currentUser.accessibleCourses.includes(course.id)
    );

    if (newCourses.length === 0) {
      section.hidden = true;
      list.innerHTML = '';
      return;
    }

    section.hidden = false;
    list.innerHTML = newCourses.map(course => `
      <div class="new-card">
        <div>
          <h4>${course.title}</h4>
          <p>${course.description}</p>
        </div>
        <div class="meta-row">
          <span>${course.totalModules} modules</span>
          <button class="secondary" data-id="${course.id}">Open</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => this.selectCourse(btn.dataset.id));
    });
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
          <span class="muted" style="font-size: 0.9rem;">${course.totalModules} modules • ${course.exam.totalQuestions} questions</span>
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

    document.getElementById('courseTitle').textContent = `📖 ${this.currentCourse.title}`;
    document.getElementById('courseDescription').textContent = this.currentCourse.description;

    const meta = document.getElementById('courseMeta');
    meta.innerHTML = `
      <div class="tag">📚 ${this.currentCourse.totalModules} Modules</div>
      <div class="tag">📄 ${this.currentCourse.pdfFile}</div>
      <div class="tag">✅ ${this.currentCourse.exam.totalQuestions} Questions</div>
      <div class="tag" style="cursor: pointer; background: linear-gradient(135deg, #667eea, #764ba2); color: white;" onclick="app.showFirstModule()">
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
    document.getElementById('moduleTitle').textContent = `📚 ${mod.title}`;
    
    let levelIcon = '🟢';
    if (mod.level === 'Intermediate') levelIcon = '🟡';
    if (mod.level === 'Advanced') levelIcon = '🔴';
    document.getElementById('moduleLevel').textContent = `${levelIcon} ${mod.level}`;

    // Objectives
    const objectives = document.getElementById('moduleObjectives');
    objectives.innerHTML = mod.objectives.map(obj => `<li>✓ ${obj}</li>`).join('');

    // Key Concepts
    const concepts = document.getElementById('moduleConcepts');
    concepts.innerHTML = mod.concepts.map(concept => `<li><strong>• ${concept}</strong></li>`).join('');

    // Examples
    const examples = document.getElementById('moduleExamples');
    examples.innerHTML = mod.examples.map(ex => `<li>💡 ${ex}</li>`).join('');

    // Practice Tasks
    const practice = document.getElementById('modulePractice');
    practice.innerHTML = mod.practice.map(task => `<li>📋 ${task}</li>`).join('');

    // Deep Notes
    const notes = document.getElementById('moduleNotes');
    notes.innerHTML = `<p>${mod.deepNotes}</p>`;

    // PDF Viewer
    const pdfPath = `./pdfs/${this.currentCourse.pdfFile}`;
    document.getElementById('pdfViewer').src = pdfPath;

    // Progress
    const moduleIndex = this.currentCourse.modules.findIndex(m => m.id === this.currentModule.id);
    const progressPercent = ((moduleIndex + 1) / this.currentCourse.modules.length * 100);
    document.getElementById('progressInfo').innerHTML = `
      <strong style="display: block; margin-bottom: 8px;">📊 Module ${moduleIndex + 1}/${this.currentCourse.modules.length}</strong>
      <div style="height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 8px;">
        <div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, #667eea, #48bb78); border-radius: 999px; transition: width 0.3s ease;"></div>
      </div>
      <p style="margin: 0; font-size: 0.85rem; color: #718096;">${Math.round(progressPercent)}% Complete</p>
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
      nav += `<button class="ghost" onclick="app.selectModule('${modules[currentIndex - 1].id}')">← Previous Module</button>`;
    } else {
      nav += '<div></div>';
    }

    nav += '<div style="flex: 1;"></div>';

    if (currentIndex < modules.length - 1) {
      nav += `<button class="ghost" onclick="app.selectModule('${modules[currentIndex + 1].id}')">Next Module →</button>`;
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
    document.getElementById('examTitle').textContent = `📝 ${exam.title}`;
    document.getElementById('examIntro').textContent = `${exam.intro} (Passing Score: ${exam.passingScore}%)`;

    const form = document.getElementById('examForm');
    form.innerHTML = exam.questions.map((q, idx) => `
      <div class="question" style="margin-bottom: 24px; padding: 16px; background: linear-gradient(135deg, #f7fafc, #edf2f7); border-left: 4px solid #667eea; border-radius: 12px;">
        <h3 style="margin: 0 0 12px 0; font-size: 1rem; color: #1a202c;">Q${idx + 1}. ${q.question}</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${q.options.map((opt, i) => `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; transition: all 0.2s;">
              <input type="radio" name="q${q.id}" value="${i}" style="width: 18px; height: 18px; cursor: pointer;" />
              <span style="flex: 1;">${opt}</span>
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
      } else {
        answers.push({ questionId: q.id, selected: -1, correct: q.correct });
      }
    });

    const percentage = (correctCount / exam.questions.length) * 100;
    const passed = percentage >= exam.passingScore;

    const resultDiv = document.getElementById('examResult');
    resultDiv.innerHTML = `
      <div style="padding: 20px; background: ${passed ? 'linear-gradient(135deg, #ecfccb, #c6f6d5)' : 'linear-gradient(135deg, #fecaca, #fed7d7)'}; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 1.3rem; color: ${passed ? '#166534' : '#991b1b'};">
          ${passed ? '✅ PASSED!' : '❌ NOT PASSED'}
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 1.2rem; color: ${passed ? '#15803d' : '#b91c1c'};">
          Score: <strong>${correctCount}/${exam.questions.length} (${Math.round(percentage)}%)</strong>
        </p>
        <p style="margin: 0; color: #666;">Passing Score Required: ${exam.passingScore}%</p>
      </div>
      <div style="margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
        <h3 style="margin: 20px 0 16px 0;">📋 Detailed Review</h3>
        ${answers.map(ans => {
          const q = exam.questions.find(x => x.id === ans.questionId);
          const isCorrect = ans.selected === ans.correct;
          const notAnswered = ans.selected === -1;
          return `
            <div style="margin-bottom: 20px; padding: 16px; background: ${isCorrect ? '#f0fdf4' : notAnswered ? '#fef3c7' : '#fef2f2'}; border-left: 4px solid ${isCorrect ? '#22c55e' : notAnswered ? '#eab308' : '#ef4444'}; border-radius: 8px;">
              <strong style="color: #1a202c; display: block; margin-bottom: 8px;">Q: ${q.question}</strong>
              <p style="margin: 8px 0; color: ${isCorrect ? '#16a34a' : notAnswered ? '#92400e' : '#dc2626'}; font-weight: 500;">
                Your answer: <span>${notAnswered ? '(Not answered)' : q.options[ans.selected]}</span>
              </p>
              <p style="margin: 8px 0; color: #15803d; font-weight: 500;">✓ Correct: ${q.options[ans.correct]}</p>
              <p style="margin: 12px 0 0 0; color: #666; font-size: 0.95rem; font-style: italic;">💡 ${q.explanation}</p>
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
