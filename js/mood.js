// mood.js - Mood tracking functionality
/*
    KEYWORDS: mood, wellbeing, recommendations, history
    PURPOSE: Registrar el estado de ánimo diario del usuario, mostrar un
                     historial de 7 días y recomendaciones adaptadas.

    MAIN METHODS:
    - bindEvents(): enlaza los botones de ánimo en la UI
    - selectMood(level): registra la selección, guarda y actualiza UI
    - renderMoodHistory(): muestra los últimos registros (hasta 7)
    - updateMoodRecommendations(level): genera recomendaciones según nivel
    - getAverageMood(days)/getMoodTrend(): utilidades analíticas simples
*/
import { StorageKeys, Storage, AchievementSystem } from './core.js';

class MoodManager {
    constructor() {
        this.moodHistory = [];
        this.load();
    }

    // Attach click handlers to the mood option buttons.
    // This method is called from app.bindEvents() during app initialization.
    bindEvents() {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const level = parseInt(btn.dataset.mood, 10);
                this.selectMood(level);
            });
        });
    }

    load() {
        this.moodHistory = Storage.get(StorageKeys.MOODS) || [];
        this.renderMoodHistory();
    }

    save() {
        Storage.set(StorageKeys.MOODS, this.moodHistory);
    }

    selectMood(level) {
        // Visually mark selected button and update the intensity bar.
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
        const selectedBtn = document.querySelector(`[data-mood="${level}"]`);
        if (selectedBtn) selectedBtn.classList.add('selected');

        const intensity = level * 20; // convert 1-5 scale to percentage (20-100)
        const intensityFill = document.getElementById('intensityFill');
        if (intensityFill) intensityFill.style.width = intensity + '%';

        // Short explanatory text shown under the intensity bar.
        const texts = {
            5: '¡Excelente! 🚀 Puedes asumir tareas complejas y desafiantes.',
            4: 'Muy bien! 💪 Buen momento para estudiar y ser productivo.',
            3: 'Normal. 📚 Tareas moderadas son recomendadas.',
            2: 'Un poco bajo. ☕ Considera tareas más ligeras hoy.',
            1: 'Descansa. 🌙 Prioriza tu bienestar y recuperación.'
        };

        const intensityText = document.getElementById('intensityText');
        if (intensityText) intensityText.textContent = texts[level];

        // Record the mood entry. Data shape:
        // { date: 'DD/MM/YYYY', mood: 1-5, timestamp: ISO }
        this.moodHistory.push({
            date: new Date().toLocaleDateString('es'),
            mood: level,
            timestamp: new Date().toISOString()
        });

        // Persist and update UI components.
        this.save();
        this.renderMoodHistory();
        this.updateMoodRecommendations(level);
        AchievementSystem.show('😊 Estado Registrado', 'Ánimo guardado exitosamente');
    }

    renderMoodHistory() {
        const history = document.getElementById('moodHistory');
        if (!history) return; // DOM not ready or section not present
        if (this.moodHistory.length === 0) {
            history.innerHTML = '<p class="empty-message">Aún no hay registro de ánimo</p>';
            return;
        }

        const last7 = this.moodHistory.slice(-7);
        // Render the last 7 entries with an emoji and a small progress bar per entry.
        history.innerHTML = last7.map(entry => {
            const emojis = ['😢', '😔', '😐', '🙂', '😄'];
            const colors = ['#ef4444', '#f59e0b', '#94a3b8', '#10b981', '#4f46e5'];
            return `
                <div class="mood-entry">
                    <div class="mood-info">
                        <p class="mood-date">${entry.date}</p>
                        <p class="mood-capacity">Capacidad: ${entry.mood * 20}%</p>
                    </div>
                    <div class="mood-indicator">
                        <div class="mood-bar">
                            <div class="mood-bar-fill" style="width: ${entry.mood * 20}%; background: ${colors[entry.mood - 1]};"></div>
                        </div>
                        <span class="mood-emoji">${emojis[entry.mood - 1]}</span>
                    </div>
                </div>`;
        }).join('');
    }

    updateMoodRecommendations(level) {
        const recommendations = {
            5: ['🎯 Enfrenta tus tareas más difíciles', '📚 Sesiones de estudio largas', '🧠 Proyectos complejos'],
            4: ['✅ Completa tareas pendientes', '📖 Repaso de materias', '💡 Aprendizaje nuevo'],
            3: ['📝 Tareas rutinarias', '🔄 Repasos ligeros', '⏰ Sesiones cortas'],
            2: ['☕ Toma descansos frecuentes', '🎵 Actividades relajantes', '📱 Tareas simples'],
            1: ['🌙 Descansa adecuadamente', '🧘 Meditación o yoga', '💤 Prioriza tu sueño']
        };

        const container = document.getElementById('moodRecommendations');
        if (!container) return;
        container.innerHTML = recommendations[level].map(rec => `
            <div class="recommendation-card">
                <p>${rec}</p>
            </div>
        `).join('');
    }

    getAverageMood(days = 7) {
        const recent = this.moodHistory.slice(-days);
        if (recent.length === 0) return 0;
        
        const sum = recent.reduce((acc, entry) => acc + entry.mood, 0);
        return Math.round((sum / recent.length) * 10) / 10;
    }

    getMoodTrend() {
        if (this.moodHistory.length < 2) return 'neutral';
        
        const recent = this.moodHistory.slice(-3);
        const average = this.getAverageMood(3);
        const previousAverage = this.getAverageMood(6);
        
        if (average > previousAverage) return 'improving';
        if (average < previousAverage) return 'declining';
        return 'stable';
    }
}

// Export module
export const moodManager = new MoodManager();
window.moodManager = moodManager;