// app.js - Main application functionality
/*
    KEYWORDS: app lifecycle, init, ui bindings, navigation
    PURPOSE: Controlador principal. Inicializa managers, enlaza eventos y
                     controla la navegación entre secciones.

    IMPORTANT FUNCTIONS:
    - init(): consulta UserManager, muestra login o inicializa la app
    - initializeUI(): sincroniza UI con datos (avatar, dashboard, stats)
    - bindEvents(): enlaza botones de navegación, acciones de tareas y ánimo
    - showSection(sectionId): muestra una sección concreta y refresca su estado

    TIP: Para la sustentación, abre la consola y ejecuta `app.showSection('tareas')`
    para demostrar cómo se actualiza la vista y se enlazan eventos.
*/
import { UserManager, AchievementSystem, Storage, StorageKeys } from './core.js';
import { taskManager } from './tasks.js';
import { flashcardManager } from './flashcards.js';
import { pomodoroManager } from './pomodoro.js';
import { calendarManager } from './calendar.js';
import { moodManager } from './mood.js';

class App {
    constructor() {
        // Track which section is visible in the UI
        this.currentSection = 'home';
        // Current user object (from UserManager)
        this.user = null;
        // Note: we don't auto-init in constructor to allow index.html to import app and attach window references first.
    }

    // Inicializa la aplicación. Llamado una vez desde index.html después de cargar los módulos.
    async init() {
        // Initialize user from UserManager (which reads storage) so registered users persist
        this.user = UserManager.init();

        // Inicializar la app directamente
        this.initializeApp();
    }

    // Called after a successful login or when a stored user exists.
    initializeApp() {
        // Sync the UI with the internal state and attach event handlers.
        this.initializeUI();
        this.bindEvents();
    }

    // Perform initial rendering of UI elements and refresh feature views.
    initializeUI() {
        // Show avatar and personalized greeting
        this.updateAvatarUI();
        document.querySelector('.header h1').textContent = `Hola, ${this.user.displayName} 👋`;

        // Trigger each manager to render its content so the dashboard is up-to-date.
        this.updateDashboard();
        taskManager.renderTasks();            // populate task list and stats
        flashcardManager.renderCards();       // show flashcards and subjects
        calendarManager.renderCalendar();     // build weekly calendar
        moodManager.renderMoodHistory();      // show last 7 mood entries
        pomodoroManager.updateStats();        // refresh pomodoro metrics
    }

    // Attach event listeners to static UI elements. Dynamic elements (e.g. task action buttons)
    // are bound by their respective managers after rendering.
    bindEvents() {
        // Bottom navigation: show the corresponding section when a nav button is clicked.
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.showSection(item.dataset.section));
        });

        // Floating action button: quick-add focuses the task title input.
        document.querySelector('.fab').addEventListener('click', () => this.quickAdd());

        // Task filter tabs: delegate to taskManager to apply the filter and rerender.
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => taskManager.filterTasks(tab.dataset.filter));
        });

        // Provide a window-level handler used by index.html's Add Task button.
        // Keeping a global short function simplifies the HTML and presentation.
        window.handleAddTask = () => {
            const taskData = {
                title: document.getElementById('taskTitle').value,
                desc: document.getElementById('taskDesc').value,
                date: document.getElementById('taskDate').value,
                time: document.getElementById('taskTime').value,
                priority: document.getElementById('taskPriority').value
            };

            if (!taskData.title || !taskData.date) {
                alert('Por favor completa al menos el título y la fecha');
                return;
            }

            // Use the TaskManager API to create the task and let it re-render.
            taskManager.addTask(taskData);
            
            // Clear form after successful add to provide immediate feedback.
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskDesc').value = '';
            document.getElementById('taskTime').value = '';
            document.getElementById('taskPriority').value = 'media';
        };

        // If MoodManager exposes a bindEvents method, call it to attach its buttons.
        if (moodManager && typeof moodManager.bindEvents === 'function') {
            moodManager.bindEvents();
        }

        // Pomodoro mode buttons: switch mode when clicked
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (pomodoroManager && pomodoroManager.modes && pomodoroManager.modes[mode]) {
                    pomodoroManager.setMode(mode, pomodoroManager.modes[mode].time);
                }
            });
        });

        // Settings: expose toggle function globally so the header button can call it
        window.showSettings = () => this.toggleSettings();

        // Attach profile picture input handler and settings buttons (if present)
        const profileInput = document.getElementById('profilePicInput');
        if (profileInput) {
            profileInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                // Read file as data URL
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        this.user.avatar = reader.result; // data URL
                        // Persist to storage
                        try {
                            Storage.set(StorageKeys.USER, this.user);
                        } catch (err) {
                            // fallback to localStorage directly
                            localStorage.setItem(StorageKeys.USER, JSON.stringify(this.user));
                        }
                        // Update UI
                        this.updateAvatarUI();
                        const settingsAvatar = document.getElementById('settingsAvatar');
                        if (settingsAvatar) settingsAvatar.src = this.user.avatar;
                    } catch (err) {
                        console.error('Error al guardar la imagen de perfil:', err);
                        alert('No se pudo guardar la imagen. Revisa la consola.');
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        const viewAccountBtn = document.getElementById('viewAccountBtn');
        if (viewAccountBtn) viewAccountBtn.addEventListener('click', () => {
            // close settings and navigate to profile page
            const panel = document.getElementById('settingsPanel');
            if (panel) panel.classList.remove('show');
            window.location.href = 'profile.html';
        });
    }

    // Toggle settings panel visibility
    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        if (!panel) return;
        const isShown = panel.classList.contains('show');
        if (isShown) {
            panel.classList.remove('show');
            panel.setAttribute('aria-hidden', 'true');
        } else {
            // populate with current user info
            const nameEl = document.getElementById('settingsName');
            const emailEl = document.getElementById('settingsEmail');
            const avatarEl = document.getElementById('settingsAvatar');
            if (nameEl) nameEl.textContent = this.user.displayName || this.user.username || 'Usuario';
            if (emailEl) emailEl.textContent = this.user.email || '';
            if (avatarEl) {
                if (this.user.avatar && this.user.avatar.startsWith && this.user.avatar.startsWith('data:')) {
                    avatarEl.src = this.user.avatar;
                } else {
                    // fallback to initials/emoji image generated via CSS or leave blank
                    avatarEl.src = '';
                }
            }
            panel.classList.add('show');
            panel.setAttribute('aria-hidden', 'false');
        }
    }

    showAccount() {
        // Minimal account display: can be replaced by a modal
        alert(`Cuenta:\nNombre: ${this.user.displayName || ''}\nEmail: ${this.user.email || ''}`);
    }

    // Show a single section and update its content as needed.
    showSection(sectionId) {
        // Hide all sections and clear nav active flags.
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        
        // Activate the requested section and its nav item.
        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
        
        this.currentSection = sectionId;

        // Some sections require explicit re-rendering when they become visible.
        switch (sectionId) {
            case 'home':
                this.updateDashboard();
                break;
            case 'tareas':
                // Re-render tasks to ensure action buttons are bound after visibility change.
                taskManager.renderTasks();
                break;
            case 'calendario':
                calendarManager.renderCalendar();
                break;
            case 'flashcards':
                flashcardManager.renderCards();
                break;
            case 'pomodoro':
                // Update stats and ensure the Pomodoro task selector contains fresh tasks.
                pomodoroManager.updateStats();
                if (taskManager && typeof taskManager.populatePomodoroTasks === 'function') {
                    taskManager.populatePomodoroTasks();
                }
                break;
        }
    }

    // Refresh the small dashboard cards shown on the Home view.
    updateDashboard() {
        // Streak shown in header and main card comes from Pomodoro stats
        document.getElementById('streakDays').textContent = pomodoroManager.stats.currentStreak;

        // Compute today's completed tasks (by ISO date equality)
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = taskManager.tasks.filter(t => t.date === today);
        const completedToday = todayTasks.filter(t => t.completed).length;

        // Update DOM with composed values
        document.getElementById('completedToday').textContent = completedToday;
        document.getElementById('pomodorosToday').textContent = pomodoroManager.stats.pomodoroCount;
        document.getElementById('focusTime').textContent = 
            Math.floor(pomodoroManager.stats.totalFocusTime / 60) + 'h';

        // Weekly progress uses a fixed target (15 tasks) for the demo
        const weekTasks = taskManager.tasks.filter(t => t.completed && this.isThisWeek(t.date)).length;
        const weekPercent = Math.min((weekTasks / 15) * 100, 100);
        document.getElementById('weekProgress').textContent = `${weekTasks}/15`;
        document.getElementById('weekProgressBar').style.width = `${weekPercent}%`;
    }

    isThisWeek(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return date >= startOfWeek;
    }

    quickAdd() {
        this.showSection('tareas');
        document.getElementById('taskTitle').focus();
    }

    updateAvatarUI() {
        const avatarEl = document.querySelector('.user-avatar');
        if (!avatarEl) return;
        const avatar = this.user && this.user.avatar;
        if (avatar && avatar.startsWith && avatar.startsWith('data:')) {
            avatarEl.innerHTML = `<img src="${avatar}" alt="avatar">`;
        } else {
            // if avatar is emoji or initials, show as text
            avatarEl.textContent = avatar || (this.user && (this.user.displayName || this.user.username) ? (this.user.displayName || this.user.username).slice(0,2).toUpperCase() : 'U');
        }
    }

    // Logout: remove stored user and reload app
    logout() {
        try {
            // Remove stored user entry
            localStorage.removeItem(StorageKeys.USER);
        } catch (err) {
            console.error('Error removing stored user:', err);
        }
        // Reload to return to anonymous state
        location.reload();
    }
}

// Create and export app instance
export const app = new App();