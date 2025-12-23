// Achievements system - separate file for better code organization

// Global achievement tracking variables
let listeningCount = 0;
let perfectTestsCount = 0;
let totalTestsCount = 0;
let examplesViewedCount = 0;
let sentencesListenedCount = 0;

// Achievement definitions
function initializeAchievements() {
    achievements = [
        // Vocabulary achievements
        { id: 'word_master', name: 'Word Master', description: 'Achieve 50 words in your dictionary', threshold: 50, type: 'vocabulary', icon: '🎓' },
        { id: 'polyglot_initiate', name: 'Polyglot Initiate', description: 'Master 75 words in your dictionary', threshold: 75, type: 'vocabulary', icon: '🌍' },
        { id: 'linguistic_expert', name: 'Linguistic Expert', description: 'Master 100 words in your dictionary', threshold: 100, type: 'vocabulary', icon: '🧠' },
        { id: 'language_enthusiast', name: 'Language Enthusiast', description: 'Reach 150 words in your dictionary', threshold: 150, type: 'vocabulary', icon: '💡' },
        { id: 'german_scholar', name: 'German Scholar', description: 'Reach 200 words in your dictionary', threshold: 200, type: 'vocabulary', icon: '🎖️' },
        { id: 'german_master', name: 'German Master', description: 'Collect 300 words in your dictionary', threshold: 300, type: 'vocabulary', icon: '👑' },
        { id: 'language_virtuoso', name: 'Language Virtuoso', description: 'Collect 500 words in your dictionary', threshold: 500, type: 'vocabulary', icon: '🏆' },
        { id: 'ultimate_scholar', name: 'Ultimate Scholar', description: 'Achieve linguistic mastery with 1000 words', threshold: 1000, type: 'vocabulary', icon: '⭐' },

        // Listening achievements
        { id: 'audio_enthusiast', name: 'Audio Enthusiast', description: 'Listen to 50 German words', threshold: 50, type: 'listening', icon: '🎧' },
        { id: 'listening_expert', name: 'Listening Expert', description: 'Listen to 100 German words', threshold: 100, type: 'listening', icon: '👂' },
        { id: 'sound_master', name: 'Sound Master', description: 'Listen to 250 German words', threshold: 250, type: 'listening', icon: '🔈' },

        // Test achievements
        { id: 'first_perfect_test', name: 'Perfect Score!', description: 'Complete a test with zero mistakes', threshold: 1, type: 'test', icon: '🎯' },
        { id: 'test_beginner', name: 'Test Beginner', description: 'Complete your first test', threshold: 1, type: 'test_total', icon: '📝' },
        { id: 'quiz_master', name: 'Quiz Master', description: 'Complete 25 tests', threshold: 25, type: 'test_total', icon: '📊' },
        { id: 'assessment_pro', name: 'Assessment Pro', description: 'Complete 50 tests', threshold: 50, type: 'test_total', icon: '📈' },
        { id: 'test_champion', name: 'Test Champion', description: 'Complete 5 perfect tests', threshold: 5, type: 'test', icon: '🏅' },
        { id: 'perfectionist', name: 'Perfectionist', description: 'Complete 10 perfect tests', threshold: 10, type: 'test', icon: '💎' },
        { id: 'accuracy_ace', name: 'Accuracy Ace', description: 'Complete 25 perfect tests', threshold: 25, type: 'test', icon: '🎪' },
        { id: 'flawless_scholar', name: 'Flawless Scholar', description: 'Complete 50 perfect tests', threshold: 50, type: 'test', icon: '👑' },

        // Learning achievements
        { id: 'example_explorer', name: 'Example Explorer', description: 'View 20 word examples', threshold: 20, type: 'examples', icon: '📖' },
        { id: 'sentence_master', name: 'Sentence Master', description: 'Listen to 50 example sentences', threshold: 50, type: 'examples', icon: '🎵' },

        // Hidden achievements (not visible until unlocked)
        { id: 'dedicated_learner', name: 'Dedicated Learner', description: 'Complete 100 total tests', threshold: 100, type: 'test_total', icon: '🎓', hidden: true },
        { id: 'perfection_master', name: 'Perfection Master', description: 'Complete 100 perfect tests', threshold: 100, type: 'test', icon: '💎', hidden: true },
        { id: 'audio_enthusiast_extreme', name: 'Audio Enthusiast Extreme', description: 'Listen to 500 German words', threshold: 500, type: 'listening', icon: '🎧', hidden: true },
        { id: 'example_master', name: 'Example Master', description: 'View 100 word examples', threshold: 100, type: 'examples', icon: '�', hidden: true }
    ];
}

function loadAchievements() {
    const saved = localStorage.getItem('germanVocabularyAchievements');
    if (saved) {
        unlockedAchievements = new Set(JSON.parse(saved));
    }

    // Load achievement tracking data
    const trackingData = localStorage.getItem('germanVocabularyAchievementTracking');
    if (trackingData) {
        const data = JSON.parse(trackingData);
        listeningCount = data.listeningCount || 0;
        perfectTestsCount = data.perfectTestsCount || 0;
        totalTestsCount = data.totalTestsCount || 0;
        examplesViewedCount = data.examplesViewedCount || 0;
        sentencesListenedCount = data.sentencesListenedCount || 0;
    }
}

function saveAchievements() {
    localStorage.setItem('germanVocabularyAchievements', JSON.stringify([...unlockedAchievements]));

    // Save achievement tracking data
    const trackingData = {
        listeningCount,
        perfectTestsCount,
        totalTestsCount,
        examplesViewedCount,
        sentencesListenedCount
    };
    localStorage.setItem('germanVocabularyAchievementTracking', JSON.stringify(trackingData));
}

function checkAchievements() {
    let newAchievements = [];
    let majorAchievements = [];

    achievements.forEach(achievement => {
        if (unlockedAchievements.has(achievement.id)) return; // Already unlocked

        let thresholdMet = false;
        let currentValue = 0;

        switch (achievement.type) {
            case 'vocabulary':
                currentValue = dictionary.length;
                thresholdMet = currentValue >= achievement.threshold;
                break;
            case 'listening':
                currentValue = listeningCount;
                thresholdMet = currentValue >= achievement.threshold;
                break;
            case 'test':
                currentValue = perfectTestsCount;
                thresholdMet = currentValue >= achievement.threshold;
                break;
            case 'test_total':
                currentValue = totalTestsCount;
                thresholdMet = currentValue >= achievement.threshold;
                break;
            case 'examples':
                if (achievement.id === 'example_explorer') {
                    currentValue = examplesViewedCount;
                    thresholdMet = currentValue >= achievement.threshold;
                } else if (achievement.id === 'sentence_master') {
                    currentValue = sentencesListenedCount;
                    thresholdMet = currentValue >= achievement.threshold;
                }
                break;
        }

        if (thresholdMet) {
            unlockedAchievements.add(achievement.id);
            newAchievements.push(achievement);

            // Consider vocabulary achievements with 50+ words as major milestones
            if (achievement.type === 'vocabulary' && achievement.threshold >= 50) {
                majorAchievements.push(achievement);
            }
        }
    });

    if (newAchievements.length > 0) {
        saveAchievements();

        // Show achievements one by one with delays
        if (newAchievements.length === 1) {
            // Single achievement - show immediately
            showAchievementNotification([newAchievements[0]]);
        } else {
            // Multiple achievements - show sequentially
            newAchievements.forEach((achievement, index) => {
                setTimeout(() => {
                    showAchievementNotification([achievement]);
                }, index * 2500); // 2.5 second delay between each notification
            });
        }

        // Show celebration screen for major achievements after all notifications
        if (majorAchievements.length > 0) {
            const celebrationDelay = newAchievements.length * 2500 + 1000; // Wait for all notifications + 1 second
            setTimeout(() => {
                showCelebrationScreen(majorAchievements);
            }, celebrationDelay);
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
                const isSecret = ['dedicated_learner', 'perfection_master', 'audio_enthusiast_extreme', 'example_master'].includes(achievement.id);
                const secretClass = isSecret ? ' secret' : '';
                return `
                    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}${secretClass}">
                        <div class="achievement-icon">${isUnlocked ? achievement.icon : '🔒'}</div>
                        <div class="achievement-info">
                            <h4>${achievement.name}${isSecret && isUnlocked ? ' ✨' : isSecret ? ' 🔒' : ''}</h4>
                            <p>${isSecret && !isUnlocked ? '???' : achievement.description}</p>
                            <small>${isSecret && !isUnlocked ? '??? required' : `${achievement.threshold} required`}</small>
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

        // Show all achievements, but mark secret ones visually

        // Get current progress value based on achievement type
        let currentValue = 0;
        switch (achievement.type) {
            case 'vocabulary':
                currentValue = dictionary.length;
                break;
            case 'listening':
                currentValue = listeningCount;
                break;
            case 'test':
                currentValue = perfectTestsCount;
                break;
            case 'test_total':
                currentValue = totalTestsCount;
                break;
            case 'examples':
                if (achievement.id === 'example_explorer') {
                    currentValue = examplesViewedCount;
                } else if (achievement.id === 'sentence_master') {
                    currentValue = sentencesListenedCount;
                }
                break;
        }

        const progressPercent = Math.min((currentValue / achievement.threshold) * 100, 100);
        const achievementCard = document.createElement('div');
        achievementCard.className = `achievement-showcase-card ${isUnlocked ? 'unlocked' : 'locked'}`;

        // Add special styling for secret achievements
        const isSecret = ['dedicated_learner', 'perfection_master', 'audio_enthusiast_extreme', 'example_master'].includes(achievement.id);
        const secretClass = isSecret ? ' secret' : '';
        const justUnlockedClass = isSecret && isUnlocked ? ' just-unlocked' : '';

        achievementCard.innerHTML = `
            <div class="achievement-showcase-icon">${isUnlocked ? achievement.icon : '🔒'}</div>
            <div class="achievement-showcase-content">
                <h4>${achievement.name}${isSecret && isUnlocked ? ' ✨' : isSecret ? ' 🔒' : ''}</h4>
                <p>${isSecret && !isUnlocked ? '???' : achievement.description}</p>
                <div class="achievement-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${isSecret && !isUnlocked ? '???/???' : `${Math.min(currentValue, achievement.threshold)}/${achievement.threshold}`}</span>
                </div>
            </div>
        `;

        achievementCard.className += secretClass + justUnlockedClass;

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

// Achievement tracking functions
function trackListening() {
    listeningCount++;
    saveAchievements();
    checkAchievements();
}

function trackPerfectTest() {
    perfectTestsCount++;
    saveAchievements();
    checkAchievements();
}

function trackTotalTest() {
    totalTestsCount++;
    saveAchievements();
    checkAchievements();
}

function trackExamplesViewed() {
    examplesViewedCount++;
    saveAchievements();
    checkAchievements();
}

function trackSentenceListened() {
    sentencesListenedCount++;
    saveAchievements();
    checkAchievements();
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
