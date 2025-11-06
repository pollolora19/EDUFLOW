// pomodoro.js - Pomodoro timer functionality
/*
    KEYWORDS: timer, pomodoro, modes, stats
    PURPOSE: Implementa el temporizador Pomodoro (focus/short/long), maneja
                     estadísticas (pomodoroCount, totalFocusTime, rachas) y actualiza UI.

    MAIN METHODS:
    - setMode(mode, minutes): cambia modo y actualiza UI
    - start()/pause()/reset(): controla el temporizador
    - complete(): lógica al finalizar un periodo (actualiza stats y sugiere pausa)
    - updateStats(): refresca métricas en la UI

    NOTE: usa Storage para persistir estadísticas via StorageKeys.POMODORO_STATS
*/
import { StorageKeys, Storage, AchievementSystem } from './core.js';
import { taskManager } from './tasks.js';

class PomodoroManager {
    constructor() {
        // Current countdown in seconds. Default to 25 minutes for a focus session.
        this.time = 25 * 60;
        // Reference to the interval timer so we can pause/clear it.
        this.interval = null;
        // Running state flag to prevent multiple intervals.
        this.isRunning = false;
        // Current mode: 'focus', 'short', 'long'
        this.currentMode = 'focus';
        // Mode definitions (minutes) and labels used to reset the timer.
        this.modes = {
            focus: { time: 25, label: 'Focus' },
            short: { time: 5, label: 'Pausa Corta' },
            long: { time: 15, label: 'Pausa Larga' }
        };

        // Simple stats object persisted to storage: counts and streaks.
        this.stats = {
            pomodoroCount: 0,
            totalFocusTime: 0, // in minutes
            bestStreak: 0,
            currentStreak: 0
        };

        // Load persisted stats if available.
        this.load();
    }

    load() {
        const savedStats = Storage.get(StorageKeys.POMODORO_STATS);
        if (savedStats) {
            this.stats = { ...this.stats, ...savedStats };
        }
    }

    save() {
        Storage.set(StorageKeys.POMODORO_STATS, this.stats);
    }

    setMode(mode, minutes) {
        this.currentMode = mode;
        this.time = minutes * 60;
        this.updateDisplay();
        
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        const labels = {
            focus: 'Modo Focus',
            short: 'Pausa Corta',
            long: 'Pausa Larga'
        };
        document.getElementById('timerLabel').textContent = labels[mode];
    }

    start() {
        if (this.isRunning) return;
        // If a task is selected in the UI, store or display it (optional behavior)
        try {
            const select = document.getElementById('pomodoroTask');
            if (select && select.value) {
                const taskId = parseInt(select.value, 10);
                const task = taskManager.tasks.find(t => t.id === taskId);
                if (task) {
                    // Show task title in timer label briefly
                    document.getElementById('timerLabel').textContent = `Tarea: ${task.title}`;
                }
            }
        } catch (e) {
            // ignore DOM issues
        }

        this.isRunning = true;
        document.getElementById('timerLabel').textContent = '⏱️ En progreso...';

        const totalTime = this.time;
        this.interval = setInterval(() => {
            if (this.time > 0) {
                this.time--;
                this.updateDisplay();
                this.updateTimerCircle(this.time, totalTime);
            } else {
                this.complete();
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.interval);
        document.getElementById('timerLabel').textContent = '⏸️ Pausado';
    }

    reset() {
        this.pause();
        this.time = this.modes[this.currentMode].time * 60;
        this.updateDisplay();
        this.updateTimerCircle(this.time, this.time);
        document.getElementById('timerLabel').textContent = 'Presiona Iniciar';
    }

    complete() {
        this.pause();
        
        if (this.currentMode === 'focus') {
            this.stats.pomodoroCount++;
            this.stats.totalFocusTime += this.modes.focus.time;
            this.stats.currentStreak++;
            this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.currentStreak);
            
            this.updateStats();
            this.save();
            
            AchievementSystem.show('🍅 Pomodoro Completado!', '+15 XP • ¡Excelente trabajo!');
            
            if (this.stats.pomodoroCount % 4 === 0) {
                alert('🎉 ¡4 Pomodoros! Toma una pausa larga (15 min)');
                this.setMode('long', 15);
            } else {
                alert('✅ ¡Pomodoro completado! Toma una pausa (5 min)');
                this.setMode('short', 5);
            }
        } else {
            alert('☕ Pausa terminada. ¡Volvamos al trabajo!');
            this.setMode('focus', 25);
        }
    }

    updateDisplay() {
        const minutes = Math.floor(this.time / 60);
        const seconds = this.time % 60;
        document.getElementById('pomodoroTimer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateTimerCircle(current, total) {
        const circumference = 691; // 2 * π * radius
        const progress = (current / total) * circumference;
        document.getElementById('timerProgress').style.strokeDashoffset = circumference - progress;
    }

    updateStats() {
        // Update DOM with persisted statistics. totalFocusTime is minutes in our schema.
        document.getElementById('pomodoroCount').textContent = this.stats.pomodoroCount;
        document.getElementById('totalMinutes').textContent = this.stats.totalFocusTime + 'm';

        // Compute a simple 'focus score' — guard against divide-by-zero when no pomodoros exist.
        const focusScore = this.stats.pomodoroCount > 0
            ? Math.round((this.stats.currentStreak / this.stats.pomodoroCount) * 100)
            : 0;
        document.getElementById('focusScore').textContent = focusScore + '%';
        document.getElementById('bestStreak').textContent = this.stats.bestStreak;
    }
}

// Export module
export const pomodoroManager = new PomodoroManager();
window.pomodoroManager = pomodoroManager;  // Hacer disponible globalmente