// tasks.js - Task management functionality
/*
    KEYWORDS: tasks, CRUD, persistence, render
    PURPOSE: Gestiona las tareas del usuario: crear, eliminar, alternar completado,
                     filtrar y renderizar en la interfaz.

    MAIN METHODS:
    - load()/save(): persistencia usando Storage
    - addTask(taskData): valida campos y crea una tarea
    - toggleTask(id): marca/desmarca completada
    - deleteTask(id): elimina tarea
    - filterTasks(filter): aplica filtros y re-renderiza
    - renderTasks(): renderiza la lista y enlaza eventos a botones
    - populatePomodoroTasks(): rellena el selector del Pomodoro con tareas pendientes

    PRESENTATION TIPS:
    - Abre la consola y ejecuta `taskManager.addTask({title:'Prueba', date:'2025-10-23'})`
        para demostrar la creación y cómo se guarda en localStorage.
*/
import { StorageKeys, Storage, AchievementSystem } from './core.js';

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'todas';
        this.load();
    }

    load() {
        this.tasks = Storage.get(StorageKeys.TASKS) || [];
        // Try to populate pomodoro select if DOM is ready
        try {
            this.populatePomodoroTasks();
        } catch (e) {
            // ignore if DOM not ready
        }
    }

    save() {
        Storage.set(StorageKeys.TASKS, this.tasks);
    }

    addTask(taskData) {
        // VALIDATION: ensure required fields are provided. We throw here because
        // callers (UI or tests) should know immediately if they passed invalid data.
        if (!taskData.title || !taskData.date) {
            throw new Error('Title and date are required');
        }

        // BUILD TASK OBJECT: consistent schema used throughout the app.
        // - id: unique numeric id (timestamp-based)
        // - title: short label
        // - desc: optional longer description
        // - date: ISO date string (YYYY-MM-DD) for easy comparisons
        // - time: estimated minutes (integer)
        // - priority: alta|media|baja
        // - completed: boolean
        // - createdAt: ISO timestamp
        const task = {
            id: Date.now(),
            title: taskData.title,
            desc: taskData.desc || '',
            date: taskData.date,
            time: parseInt(taskData.time) || 25,
            priority: taskData.priority || 'media',
            completed: false,
            createdAt: new Date().toISOString()
        };

        // Persist the new task in memory and in localStorage.
        this.tasks.push(task);
        this.save();

        // Provide immediate UX feedback (toast/achievement) and update the UI.
        AchievementSystem.show('📝 Tarea Agregada', 'Nueva tarea añadida a tu lista');
        this.renderTasks();

        // Return the task (useful for automated tests or chaining calls).
        return task;
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            if (task.completed) {
                AchievementSystem.show('✅ Tarea Completada', '+10 XP ganados');
            }
            this.save();
            this.renderTasks();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
        this.renderTasks();
    }

    filterTasks(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`.filter-tab[data-filter="${filter}"]`).classList.add('active');
        this.renderTasks();
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'pendientes':
                return this.tasks.filter(t => !t.completed);
            case 'completadas':
                return this.tasks.filter(t => t.completed);
            case 'alta':
                return this.tasks.filter(t => t.priority === 'alta');
            default:
                return this.tasks;
        }
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        const filtered = this.getFilteredTasks();

        if (filtered.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <p>No hay tareas aquí</p>
                </div>`;
            return;
        }

        taskList.innerHTML = filtered.map(task => this.createTaskHTML(task)).join('');
        this.updateStats();

        // Bind action buttons after rendering
        this.bindTaskActionButtons();
        // Update pomodoro task selector
        this.populatePomodoroTasks();
    }

    createTaskHTML(task) {
        const priorityEmoji = { alta: '🔴', media: '🟡', baja: '🟢' };
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <div class="task-header">
                    <div class="task-info">
                        <h4>${task.title}</h4>
                        <p>${task.desc || 'Sin descripción'}</p>
                        <div class="task-meta">
                            <span class="task-badge ${task.priority}">
                                ${priorityEmoji[task.priority]} ${task.priority.toUpperCase()}
                            </span>
                            <span class="task-badge">
                                📅 ${new Date(task.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                            </span>
                            <span class="task-badge">
                                ⏱️ ${task.time}min
                            </span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button data-id="${task.id}" class="btn-success btn-toggle">✓</button>
                        <button data-id="${task.id}" class="btn-danger btn-delete">✕</button>
                    </div>
                </div>
            </div>`;
    }

    // Attach listeners to the toggle/delete buttons rendered in the task list
    bindTaskActionButtons() {
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            const id = parseInt(btn.dataset.id, 10);
            // remove previous handler if exists
            if (btn._handler) btn.removeEventListener('click', btn._handler);
            const handler = () => this.toggleTask(id);
            btn.addEventListener('click', handler);
            // store handler reference in element for potential future removal
            btn._handler = handler;
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            const id = parseInt(btn.dataset.id, 10);
            if (btn._handler) btn.removeEventListener('click', btn._handler);
            const handler = () => this.deleteTask(id);
            btn.addEventListener('click', handler);
            btn._handler = handler;
        });
    }

    // Populate the #pomodoroTask select with pending tasks
    populatePomodoroTasks() {
        const select = document.getElementById('pomodoroTask');
        if (!select) return;
        // Keep only pending tasks (not completed)
        const pending = this.tasks.filter(t => !t.completed).sort((a, b) => new Date(a.date) - new Date(b.date));
        // Clear current options except the placeholder
        select.innerHTML = '<option value="">Seleccionar tarea...</option>' + pending.map(t => `\n                <option value="${t.id}">${t.title} (${new Date(t.date).toLocaleDateString('es')})</option>`).join('');
    }

    updateStats() {
        const completedTasks = this.tasks.filter(t => t.completed).length;
        document.getElementById('headerTasks').textContent = `${completedTasks}/${this.tasks.length}`;
        
        // Update weekly progress
        const weekTasks = this.tasks.filter(t => t.completed && this.isThisWeek(t.date)).length;
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
}

// Export module
export const taskManager = new TaskManager();