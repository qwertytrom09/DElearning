// Achievements system - separate file for better code organization

// Achievement definitions
function initializeAchievements() {
    achievements = [
        { id: 'first_words', name: 'First Steps', description: 'Add your first 5 words to the dictionary', threshold: 5, icon: '🌱' },
        { id: 'growing_vocabulary', name: 'Growing Vocabulary', description: 'Reach 10 words in your dictionary', threshold: 10, icon: '📚' },
        { id: 'vocabulary_builder', name: 'Vocabulary Builder', description: 'Collect 25 words in your dictionary', threshold: 25, icon: '🏗️' },
        { id: 'word_master', name: 'Word Master', description: 'Achieve 50 words in your dictionary', threshold: 50, icon: '🎓' },
        { id: 'linguistic_expert', name: 'Linguistic Expert', description: 'Master 100 words in your dictionary', threshold: 100, icon: '🧠' },
        { id: 'german_scholar', name: 'German Scholar', description: 'Reach 200 words in your dictionary', threshold: 200, icon: '🎖️' },
        { id: 'language_virtuoso', name: 'Language Virtuoso', description: 'Collect 500 words in your dictionary', threshold: 500, icon: '🏆' }
    ];
}

function loadAchievements() {
    const saved = localStorage.getItem('germanVocabularyAchievements');
    if (saved) {
        unlockedAchievements = new Set(JSON.parse(saved));
    }
}

function saveAchievements() {
    localStorage.setItem('germanVocabularyAchievements', JSON.stringify([...unlockedAchievements]));
}

function checkAchievements() {
    const wordCount = dictionary.length;
    let newAchievements = [];
    let majorAchievements = [];

    achievements.forEach(achievement => {
        if (!unlockedAchievements.has(achievement.id) && wordCount >= achievement.threshold) {
            unlockedAchievements.add(achievement.id);
            newAchievements.push(achievement);

            // Consider achievements with 50+ words as major milestones
            if (achievement.threshold >= 50) {
                majorAchievements.push(achievement);
            }
        }
    });

    if (newAchievements.length > 0) {
        saveAchievements();
        showAchievementNotification(newAchievements);

        // Show celebration screen for major achievements
        if (majorAchievements.length > 0) {
            setTimeout(() => {
                showCelebrationScreen(majorAchievements);
            }, 2000); // Wait for notification to finish
        }
    }
}

function showAchievementNotification(newAchievements) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-content">
            <h3>🏆 Achievement Unlocked!</h3>
            ${newAchievements.map(achievement => `
                <div class="achievement-item">
                    <span class="achievement-icon">${achievement.icon}</span>
                    <div class="achievement-details">
                        <strong>${achievement.name}</strong>
                        <p>${achievement.description}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 500);
    }, 4000);
}

function createAchievementsSection() {
    const achievementsContainer = document.createElement('div');
    achievementsContainer.className = 'achievements-section';
    achievementsContainer.innerHTML = `
        <h3>Achievements</h3>
        <div class="achievements-grid">
            ${achievements.map(achievement => {
                const isUnlocked = unlockedAchievements.has(achievement.id);
                return `
                    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${isUnlocked ? achievement.icon : '🔒'}</div>
                        <div class="achievement-info">
                            <h4>${achievement.name}</h4>
                            <p>${achievement.description}</p>
                            <small>${achievement.threshold} words required</small>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    return achievementsContainer;
}

function updateAchievementsDisplay() {
    // Update stats
    const totalWordsStat = document.getElementById('total-words-stat');
    const unlockedAchievementsStat = document.getElementById('unlocked-achievements-stat');
    const achievementProgressStat = document.getElementById('achievement-progress-stat');

    totalWordsStat.textContent = dictionary.length;
    unlockedAchievementsStat.textContent = unlockedAchievements.size;

    const progressPercent = achievements.length > 0 ? Math.round((unlockedAchievements.size / achievements.length) * 100) : 0;
    achievementProgressStat.textContent = `${progressPercent}%`;

    // Update achievements showcase
    const achievementsShowcase = document.querySelector('.achievements-showcase');
    achievementsShowcase.innerHTML = '';

    achievements.forEach(achievement => {
        const isUnlocked = unlockedAchievements.has(achievement.id);
        const achievementCard = document.createElement('div');
        achievementCard.className = `achievement-showcase-card ${isUnlocked ? 'unlocked' : 'locked'}`;

        achievementCard.innerHTML = `
            <div class="achievement-showcase-icon">${isUnlocked ? achievement.icon : '🔒'}</div>
            <div class="achievement-showcase-content">
                <h4>${achievement.name}</h4>
                <p>${achievement.description}</p>
                <div class="achievement-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min((dictionary.length / achievement.threshold) * 100, 100)}%"></div>
                    </div>
                    <span class="progress-text">${Math.min(dictionary.length, achievement.threshold)}/${achievement.threshold}</span>
                </div>
            </div>
        `;

    achievementsShowcase.appendChild(achievementCard);
});
}

function showCelebrationScreen(majorAchievements) {
    // Create celebration overlay
    const celebrationOverlay = document.createElement('div');
    celebrationOverlay.className = 'celebration-overlay';
    celebrationOverlay.innerHTML = `
        <div class="celebration-content">
            <div class="celebration-stars">
                ${Array(20).fill().map(() => '<div class="star">⭐</div>').join('')}
            </div>
            <div class="celebration-confetti">
                ${Array(30).fill().map((_, i) =>
                    `<div class="confetti confetti-${i % 5}" style="left: ${Math.random() * 100}%; animation-delay: ${Math.random() * 2}s;">🎉</div>`
                ).join('')}
            </div>
            <div class="celebration-header">
                <h1>🎊 Congratulations! 🎊</h1>
                <h2>Major Achievement Unlocked!</h2>
            </div>
            <div class="celebration-achievements">
                ${majorAchievements.map(achievement => `
                    <div class="celebration-achievement">
                        <div class="celebration-icon">${achievement.icon}</div>
                        <div class="celebration-details">
                            <h3>${achievement.name}</h3>
                            <p>${achievement.description}</p>
                            <div class="celebration-milestone">${achievement.threshold} Words!</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="celebration-message">
                <p>You're making amazing progress in your German learning journey!</p>
                <p>Keep up the great work! 🚀</p>
            </div>
            <button class="celebration-continue">Continue Learning</button>
        </div>
    `;

    document.body.appendChild(celebrationOverlay);

    // Add event listener to continue button
    const continueBtn = celebrationOverlay.querySelector('.celebration-continue');
    continueBtn.addEventListener('click', () => {
        celebrationOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (celebrationOverlay.parentElement) {
                celebrationOverlay.remove();
            }
        }, 500);
    });

    // Auto-remove after 8 seconds if not clicked
    setTimeout(() => {
        if (celebrationOverlay.parentElement && !celebrationOverlay.classList.contains('fade-out')) {
            celebrationOverlay.classList.add('fade-out');
            setTimeout(() => {
                if (celebrationOverlay.parentElement) {
                    celebrationOverlay.remove();
                }
            }, 500);
        }
    }, 8000);
}

// Initialize achievements system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize global variables if not already defined
    if (typeof achievements === 'undefined') {
        achievements = [];
        unlockedAchievements = new Set();
    }

    // Initialize achievements
    initializeAchievements();
    loadAchievements();
    checkAchievements(); // Check achievements on load
});
