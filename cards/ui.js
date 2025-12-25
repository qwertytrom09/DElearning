// UI helper functions
function showLoadingState(message = 'Loading...') {
    let loader = document.querySelector('.loading-overlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(loader);
    } else {
        loader.querySelector('p').textContent = message;
    }
    loader.style.display = 'flex';
}

function hideLoadingState() {
    const loader = document.querySelector('.loading-overlay');
    if (loader) {
        loader.style.display = 'none';
    }
}

function showErrorMessage(message) {
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <p>${message}</p>
                <button class="error-close">×</button>
            </div>
        `;
        document.body.appendChild(errorDiv);

        errorDiv.querySelector('.error-close').addEventListener('click', () => {
            errorDiv.remove();
        });
    } else {
        errorDiv.querySelector('p').textContent = message;
        errorDiv.style.display = 'flex';
    }
}

function resetAllProgress() {
    // Show confirmation dialog
    const confirmed = confirm('⚠️ Are you sure you want to reset ALL progress?\n\nThis will permanently delete:\n• All words in your dictionary\n• All unlocked achievements\n\nThis action cannot be undone!');

    if (!confirmed) {
        return; // User cancelled
    }

    // Clear localStorage
    localStorage.removeItem('germanVocabularyDictionary');
    localStorage.removeItem('germanVocabularyAchievements');
    localStorage.removeItem('germanVocabularyAchievementTracking');

    // Reset global variables
    dictionary = [];
    if (typeof unlockedAchievements !== 'undefined') {
        unlockedAchievements.clear();
    }

    // Update UI
    updateDictionaryDisplay();
    updateAchievementsDisplay();

    // Show arrow buttons again (since all words were removed)
    document.querySelectorAll('.arrow-btn').forEach(btn => {
        btn.style.display = '';
    });

    // Close achievements overlay
    const achievementsOverlay = document.querySelector('.achievements-overlay');
    if (achievementsOverlay) {
        achievementsOverlay.classList.remove('active');
    }

    // Show success message
    alert('✅ All progress has been reset!\n\nYou can start building your vocabulary from scratch.');
}

function showEmailWritingTips() {
    // Navigate to the standalone email writing page
    window.location.href = 'email-writing.html';
}

// Function to translate English meanings to Russian for hints
function getRussianMeaning(englishWord) {
    const translations = {
        'nature': 'природа',
        'environment': 'окружающая среда',
        'climate change': 'изменение климата',
        'pollution': 'загрязнение',
        'renewable': 'возобновляемая'
    };
    return translations[englishWord.toLowerCase()] || englishWord;
}
