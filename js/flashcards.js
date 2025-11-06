// flashcards.js - Flashcard study system
/*
    KEYWORDS: flashcards, study, spaced repetition (simple), subjects
    PURPOSE: Crear, mostrar y navegar flashcards; llevar conteo de repasos y
                     presentar tarjetas volteables en la UI.

    MAIN METHODS:
    - addFlashcard(cardData): valida y añade una tarjeta
    - displayCurrentCard()/nextCard()/previousCard(): logica de navegación
    - markReviewed(): marca la tarjeta como repasada y avanza
    - renderSubjects(): lista materias y permite estudiar por materia
    - renderCards(): refresca la UI (tarjeta + lista de materias)
*/
import { StorageKeys, Storage, AchievementSystem } from './core.js';

class FlashcardManager {
    constructor() {
        this.flashcards = [];
        this.currentCardIndex = 0;
        this.load();
    }

    load() {
        this.flashcards = Storage.get(StorageKeys.FLASHCARDS) || [];
    }

    save() {
        Storage.set(StorageKeys.FLASHCARDS, this.flashcards);
    }

    addFlashcard(cardData) {
        // Validate required fields for a flashcard
        if (!cardData.subject || !cardData.question || !cardData.answer) {
            throw new Error('Subject, question and answer are required');
        }

        // Card schema: id, subject, question, answer, review metadata
        const card = {
            id: Date.now(),
            subject: cardData.subject,
            question: cardData.question,
            answer: cardData.answer,
            reviews: 0,
            lastReviewed: null
        };

        // Persist and refresh UI
        this.flashcards.push(card);
        this.save();
        AchievementSystem.show('🎴 Flashcard Creada', 'Nueva tarjeta añadida');
        this.renderCards();
        return card;
    }

    nextCard() {
        this.currentCardIndex = (this.currentCardIndex + 1) % this.flashcards.length;
        this.displayCurrentCard();
    }

    previousCard() {
        this.currentCardIndex = (this.currentCardIndex - 1 + this.flashcards.length) % this.flashcards.length;
        this.displayCurrentCard();
    }

    markReviewed() {
        if (this.flashcards.length > 0) {
            const card = this.flashcards[this.currentCardIndex];
            card.reviews++;
            card.lastReviewed = new Date().toISOString();
            this.save();
            AchievementSystem.show('📚 Repaso Completado', '+5 XP ganados');
            this.nextCard();
        }
    }

    displayCurrentCard() {
        const display = document.getElementById('flashcardDisplay');
        const progress = document.getElementById('flashProgress');

        if (this.flashcards.length === 0) {
            display.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🎴</div>
                    <p>No hay flashcards creadas</p>
                </div>`;
            progress.textContent = '';
            return;
        }

        // Show the current card and progress (index / total)
        const card = this.flashcards[this.currentCardIndex];
        progress.textContent = `${this.currentCardIndex + 1}/${this.flashcards.length}`;

        // HTML includes a click-to-flip behavior using a simple class toggle.
        display.innerHTML = `
            <div class="flashcard-container">
                <div class="flashcard" onclick="this.classList.toggle('flipped')">
                    <div class="flashcard-front">
                        <div class="flashcard-subject">${card.subject}</div>
                        <p>${card.question}</p>
                    </div>
                    <div class="flashcard-back">
                        <div class="flashcard-subject">${card.subject}</div>
                        <p>${card.answer}</p>
                    </div>
                </div>
            </div>
            <div class="flashcard-controls">
                <button class="btn btn-secondary" onclick="flashcardManager.previousCard()">← Anterior</button>
                <button class="btn btn-primary" onclick="flashcardManager.markReviewed()">✓ Repasada</button>
                <button class="btn btn-secondary" onclick="flashcardManager.nextCard()">Siguiente →</button>
            </div>`;
    }

    renderSubjects() {
        const container = document.getElementById('subjectsList');
        const subjects = [...new Set(this.flashcards.map(f => f.subject))];

        if (subjects.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; font-size: 14px;">No hay materias registradas</p>';
            return;
        }

        container.innerHTML = subjects.map(subject => {
            const count = this.flashcards.filter(f => f.subject === subject).length;
            return `
                <div class="subject-card">
                    <div class="subject-info">
                        <h4>${subject}</h4>
                        <p>${count} flashcards</p>
                    </div>
                    <button class="btn btn-primary" onclick="flashcardManager.studySubject('${subject}')">
                        Estudiar
                    </button>
                </div>`;
        }).join('');
    }

    studySubject(subject) {
        const subjectCards = this.flashcards.filter(f => f.subject === subject);
        if (subjectCards.length > 0) {
            this.currentCardIndex = this.flashcards.indexOf(subjectCards[0]);
            document.querySelector('[data-section="flashcards"]').click();
            this.displayCurrentCard();
        }
    }

    renderCards() {
        this.displayCurrentCard();
        this.renderSubjects();
    }
}

// Export module
export const flashcardManager = new FlashcardManager();
window.flashcardManager = flashcardManager;  // Hacer disponible globalmente