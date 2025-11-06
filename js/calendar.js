// calendar.js - Calendar and date management
/*
    KEYWORDS: calendar, week, dates, upcoming
    PURPOSE: Renderiza la vista semanal del calendario, muestra tareas por día
                     y genera un pequeño gráfico semanal de productividad.

    MAIN METHODS:
    - renderCalendar(): construye la cuadrícula semanal y marca días con tareas
    - previousWeek()/nextWeek(): navegación semanal
    - showDayTasks(date): muestra alert con tareas del día
    - renderUpcomingTasks(): lista tareas próximas
    - renderWeeklyChart(): pequeña representación visual de tareas completadas
*/
import { taskManager } from './tasks.js';

class CalendarManager {
    constructor() {
        this.currentWeekOffset = 0;
    }

    renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const monthLabel = document.getElementById('calendarMonth');
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (this.currentWeekOffset * 7));

        const monthYear = startOfWeek.toLocaleDateString('es', { month: 'long', year: 'numeric' });
        monthLabel.textContent = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

        let html = days.map(day => `<div class="calendar-day header">${day}</div>`).join('');

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const hasTask = taskManager.tasks.some(t => t.date === dateStr && !t.completed);
            const isToday = date.toDateString() === today.toDateString();

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasTask ? 'has-task' : ''}" 
                     onclick="calendarManager.showDayTasks('${dateStr}')">
                    ${date.getDate()}
                </div>`;
        }

        grid.innerHTML = html;
        this.renderUpcomingTasks();
        this.renderWeeklyChart();
    }

    previousWeek() {
        this.currentWeekOffset--;
        this.renderCalendar();
    }

    nextWeek() {
        this.currentWeekOffset++;
        this.renderCalendar();
    }

    showDayTasks(date) {
        const dayTasks = taskManager.tasks.filter(t => t.date === date);
        if (dayTasks.length > 0) {
            const tasksText = dayTasks.map(t => `• ${t.title}`).join('\\n');
            alert(`Tareas para ${new Date(date).toLocaleDateString('es')}:\\n\\n${tasksText}`);
        } else {
            alert('No hay tareas para este día');
        }
    }

    renderUpcomingTasks() {
        const upcoming = document.getElementById('upcomingTasks');
        const futureTasks = taskManager.tasks
            .filter(t => !t.completed && new Date(t.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);

        if (futureTasks.length === 0) {
            upcoming.innerHTML = `
                <div class="empty-state">
                    <div class="icon">✨</div>
                    <p>No hay tareas pendientes</p>
                </div>`;
            return;
        }

        upcoming.innerHTML = futureTasks.map(task => {
            const priorityColor = { alta: '#ef4444', media: '#f59e0b', baja: '#10b981' };
            return `
                <div class="task-item" style="border-left-color: ${priorityColor[task.priority]};">
                    <div class="task-header">
                        <div class="task-info">
                            <h4>${task.title}</h4>
                            <p>${new Date(task.date).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    renderWeeklyChart() {
        const chart = document.getElementById('weeklyChart');
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);

        let chartHTML = '<div class="chart-container">';
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const completedCount = taskManager.tasks.filter(t => t.date === dateStr && t.completed).length;
            const height = Math.max((completedCount / 5) * 100, 10);
            
            chartHTML += `
                <div class="chart-bar">
                    <div class="bar-fill" style="height: ${height}%">
                        ${completedCount > 0 ? `<span class="bar-value">${completedCount}</span>` : ''}
                    </div>
                    <span class="bar-label">${days[i]}</span>
                </div>`;
        }
        chartHTML += '</div>';
        chart.innerHTML = chartHTML;
    }
}

// Export module
export const calendarManager = new CalendarManager();
window.calendarManager = calendarManager;  // Hacer disponible globalmente