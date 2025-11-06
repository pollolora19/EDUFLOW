// core.js - Core functionality and data persistence
/*
    KEYWORDS: storage, user, achievement, persistence
    PURPOSE: Provee utilidades centrales (Storage), gestión de usuario (UserManager)
                     y sistema de notificaciones/logros (AchievementSystem).

    USAGE HIGHLIGHTS:
    - Storage.get/set: envoltorio seguro sobre localStorage (JSON)
    - UserManager: init(), login(), register(), logout(), generateAvatar()
    - AchievementSystem.show(title, desc): muestra notificaciones temporales

    Nota para la sustentación: muestra `Storage.get(StorageKeys.USER)` en consola
    para ejemplificar persistencia local.
*/

// Keys used to store different data structures in localStorage.
// Keep keys centrally defined to avoid typos across modules.
const StorageKeys = {
    TASKS: 'eduflow_tasks',           // Array of task objects
    FLASHCARDS: 'eduflow_flashcards', // Array of flashcard objects
    USER: 'eduflow_user',             // Current user object (simple simulated auth)
    MOODS: 'eduflow_moods',           // Array of mood entries
    POMODORO_STATS: 'eduflow_pomodoro' // Object with pomodoro statistics
};

// Local storage helper functions
// Thin wrapper around localStorage with JSON (de)serialization and error handling.
// Using this wrapper keeps other modules simple and defensive.
const Storage = {
    // Safely read a JSON value from localStorage. Returns parsed object or null.
    get: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            // If parsing fails or access is denied, log and return null so callers can handle it.
            console.error('Error reading from storage:', err);
            return null;
        }
    },

    // Safely write a JSON value to localStorage. Non-fatal on error.
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            // Quota exceeded or other errors should not crash the app in the UI.
            console.error('Error writing to storage:', err);
        }
    }
};

// User management (Simplified - no login required)
const UserManager = {
    currentUser: {
        username: 'estudiante',
        displayName: 'Estudiante',
        avatar: '👨‍🎓'
    },

    // Initialize and return user: prefer stored user from Storage, fallback to default
    init() {
        try {
            const stored = Storage.get(StorageKeys.USER);
            if (stored && stored.username) {
                this.currentUser = stored;
            }
        } catch (err) {
            console.warn('UserManager: could not read stored user', err);
        }
        return this.currentUser;
    }
};

// Achievement system
// Lightweight achievement/toast UI.
// It expects specific DOM elements to exist in index.html: #achievement, #achievementTitle, #achievementDesc
const AchievementSystem = {
    // Display a transient notification. Non-blocking and uses a CSS class for show/hide.
    show(title, description) {
        const achievement = document.getElementById('achievement');
        if (!achievement) return; // If UI isn't present (e.g., login view), do nothing.

        // Update title/description and toggle visible class for a few seconds.
        document.getElementById('achievementTitle').textContent = title;
        document.getElementById('achievementDesc').textContent = description;
        achievement.classList.add('show');
        setTimeout(() => achievement.classList.remove('show'), 3000);
    }
};

// Export modules
export {
    StorageKeys,
    Storage,
    UserManager,
    AchievementSystem
};