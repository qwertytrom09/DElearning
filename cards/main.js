// Main initialization and event handlers
function initializeApp() {
    const topicButtons = document.querySelectorAll('.topic-btn');
    const cardContainers = document.querySelectorAll('.cards-container');

    // Initialize search and filters after vocabulary is loaded
    initializeSearchAndFilters();

    // Try to initialize voices immediately and also on voiceschanged event
    initializeVoices();
    if ('speechSynthesis' in window && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = initializeVoices;
    }

    // Fallback: try to initialize voices after a short delay if not loaded yet
    setTimeout(() => {
        if (!voicesLoaded) {
            initializeVoices();
        }
    }, 1000);

    // Topic switching
    topicButtons.forEach(button => {
        button.addEventListener('click', function() {
            const topic = this.getAttribute('data-topic');

            // If currently searching, clear search first
            if (currentSearchTerm) {
                document.getElementById('search-input').value = '';
                currentSearchTerm = '';
                applyFilters();
            }

            topicButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            cardContainers.forEach(container => {
                container.classList.remove('active');
            });
            const selectedContainer = document.querySelector(`.topic-${topic}`);
            if (selectedContainer) {
                selectedContainer.classList.add('active');
                // Populate if not populated
                if (!selectedContainer.querySelector('.card')) {
                    populateContainer(selectedContainer, window.vocabularyData[topic], currentPages[topic], PAGE_SIZE, topic);
                    updatePagination(selectedContainer, topic, window.vocabularyData[topic].length, PAGE_SIZE);
                }
            }
        });
    });

    // Flip card functionality
    function initializeCards() {
        const cards = document.querySelectorAll('.cards-container.active .card');
        cards.forEach(card => {
            card.addEventListener('click', function(event) {
                // Don't flip if clicking on a button
                if (event.target.tagName === 'BUTTON') return;
                this.classList.toggle('flipped');
            });
            card.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.classList.toggle('flipped');
                }
            });
            card.setAttribute('tabindex', '0');
        });
    }

    initializeCards();
    topicButtons.forEach(button => {
        button.addEventListener('click', function() {
            setTimeout(() => {
                initializeCards();
                initializeAudioButtons();
                initializeExamplesButtons();
                initializeArrowButtons();
                hideDictionaryWords();
            }, 50);
        });
    });

    // Audio functionality
    function initializeAudioButtons() {
        const audioButtons = document.querySelectorAll('.cards-container.active .audio-btn');
        audioButtons.forEach(button => {
            button.addEventListener('click', handleAudioClick);
        });
    }

    // Examples functionality
    function initializeExamplesButtons() {
        const examplesButtons = document.querySelectorAll('.cards-container.active .examples-btn');
        examplesButtons.forEach(button => {
            button.addEventListener('click', handleExamplesClick);
        });
    }

    initializeAudioButtons();
    initializeExamplesButtons();

    // Dictionary cards functionality
    function initializeDictionaryCards() {
        const cards = document.querySelectorAll('.dictionary-cards .card');
        cards.forEach(card => {
            card.addEventListener('click', function(event) {
                // Don't flip if clicking on a button
                if (event.target.tagName === 'BUTTON') return;
                this.classList.toggle('flipped');
            });
            card.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.classList.toggle('flipped');
                }
            });
            card.setAttribute('tabindex', '0');
        });

        // Initialize audio and examples for dictionary
        const audioButtons = document.querySelectorAll('.dictionary-cards .audio-btn');
        audioButtons.forEach(button => {
            button.addEventListener('click', handleAudioClick);
        });

        const examplesButtons = document.querySelectorAll('.dictionary-cards .examples-btn');
        examplesButtons.forEach(button => {
            button.addEventListener('click', handleExamplesClick);
        });
    }

    // Burger menu functionality
    const burgerMenu = document.querySelector('.burger-menu');
    const menuDropdown = document.querySelector('.menu-dropdown');
    const dictionaryOverlay = document.querySelector('.dictionary-overlay');
    const closeDictionary = document.querySelector('.close-dictionary');
    const dictionaryBtn = document.querySelector('#dictionary-btn');

    if (burgerMenu) {
        burgerMenu.addEventListener('click', function(event) {
            event.stopPropagation();
            if (menuDropdown) menuDropdown.classList.toggle('active');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (menuDropdown && burgerMenu) {
            if (!menuDropdown.contains(event.target) && !burgerMenu.contains(event.target)) {
                menuDropdown.classList.remove('active');
            }
        }
    });

    if (dictionaryBtn) {
        dictionaryBtn.addEventListener('click', function() {
            if (menuDropdown) menuDropdown.classList.remove('active');
            // Sort dictionary words by date added (oldest first)
            sortDictionaryByDate();
            updateDictionaryDisplay();
            if (dictionaryOverlay) dictionaryOverlay.classList.add('active');
            initializeDictionaryCards();
        });
    }

    const achievementsBtn = document.querySelector('#achievements-btn');
    const achievementsOverlay = document.querySelector('.achievements-overlay');
    const closeAchievements = document.querySelector('.close-achievements');

    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', function() {
            if (menuDropdown) menuDropdown.classList.remove('active');
            updateAchievementsDisplay();
            if (achievementsOverlay) achievementsOverlay.classList.add('active');
        });
    }

    if (closeAchievements) {
        closeAchievements.addEventListener('click', function() {
            if (achievementsOverlay) achievementsOverlay.classList.remove('active');
        });
    }

    if (closeDictionary) {
        closeDictionary.addEventListener('click', function() {
            if (dictionaryOverlay) dictionaryOverlay.classList.remove('active');
            // Reset all cards to show Russian (front) side when exiting dictionary
            document.querySelectorAll('.card.flipped').forEach(card => card.classList.remove('flipped'));
        });
    }

    // Test selection functionality
    const testSelectionBtn = document.querySelector('#test-selection-btn');
    const testSelectionOverlay = document.querySelector('.test-selection-overlay');
    const closeTestSelection = document.querySelector('.close-test-selection');

    if (testSelectionBtn) {
        testSelectionBtn.addEventListener('click', function() {
            menuDropdown.classList.remove('active');
            if (testSelectionOverlay) testSelectionOverlay.classList.add('active');
        });
    }

    if (closeTestSelection) {
        closeTestSelection.addEventListener('click', function() {
            if (testSelectionOverlay) testSelectionOverlay.classList.remove('active');
        });
    }

    if (testSelectionOverlay) {
        testSelectionOverlay.addEventListener('click', function(event) {
            if (event.target === testSelectionOverlay) {
                testSelectionOverlay.classList.remove('active');
            }
        });
    }

    // Test type selection
    document.querySelectorAll('.start-test-btn').forEach(btn => {
        btn.addEventListener('click', function(event) {
            const testType = event.currentTarget.getAttribute('data-test-type');
            testSelectionOverlay.classList.remove('active');

            switch(testType) {
                case 'matching':
                    startTest();
                    break;
                case 'gap-fill':
                    startGapFillExercise();
                    break;
                case 'word-order':
                    startWordOrderExercise();
                    break;
                case 'preposition':
                    startPrepositionExercise();
                    break;
            }
        });
    });

    // Reset progress button functionality
    const resetProgressBtn = document.getElementById('reset-progress-btn');
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener('click', resetAllProgress);
    }

    // Overlay click handlers
    if (achievementsOverlay) {
        achievementsOverlay.addEventListener('click', function(event) {
            if (event.target === achievementsOverlay) {
                achievementsOverlay.classList.remove('active');
            }
        });
    }

    if (dictionaryOverlay) {
        dictionaryOverlay.addEventListener('click', function(event) {
            if (event.target === dictionaryOverlay) {
                dictionaryOverlay.classList.remove('active');
                // Reset all cards to show Russian (front) side when exiting dictionary
                document.querySelectorAll('.card.flipped').forEach(card => card.classList.remove('flipped'));
            }
        });
    }

    // Arrow button functionality
    function initializeArrowButtons() {
        const arrowButtons = document.querySelectorAll('.arrow-btn');
        arrowButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                const wordId = this.getAttribute('data-word-id');
                const card = this.closest('.card');
                const russian = card.querySelector('.card-front h2').textContent;
                const german = card.querySelector('.card-back h2').textContent.split('\n')[0].trim();
                const english = card.querySelector('.card-back p').textContent;
                const plural = card.querySelector('.card-back h2 small') ?
                    card.querySelector('.card-back h2 small').textContent.replace('(Die ', '').replace(')', '') : '';

                addToDictionary(wordId, {
                    russian,
                    german,
                    english,
                    plural
                });
                this.style.display = 'none';
            });
        });
    }

    initializeArrowButtons();

    // Load dictionary on app start
    loadDictionary();
}

// Header buttons functionality
function initializeHeaderButtons() {
    const headerButtons = document.querySelectorAll('.header-btn');

    headerButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');

            if (action === 'gap-fill') {
                startGapFillExercise();
            } else if (action === 'word-order') {
                startWordOrderExercise();
            } else if (action === 'preposition') {
                startPrepositionExercise();
            } else if (action === 'schreiben') {
                showEmailWritingTips();
            } else if (action === 'sprechen') {
                // Future functionality for speaking
                alert('Sprechen functionality coming soon!');
            } else if (action === 'wortschatz') {
                // Return to vocabulary view
                const emailContainer = document.querySelector('.email-writing-container');
                if (emailContainer) {
                    emailContainer.remove();
                }

                // Show vocabulary elements
                document.querySelector('.topic-nav').style.display = '';
                document.querySelector('header p').style.display = '';

                // Show the active topic cards
                const activeTopicBtn = document.querySelector('.topic-btn.active');
                if (activeTopicBtn) {
                    const topic = activeTopicBtn.getAttribute('data-topic');
                    const selectedContainer = document.querySelector(`.topic-${topic}`);
                    if (selectedContainer) {
                        selectedContainer.classList.add('active');
                    }
                }
            }
        });
    });
}

// Test event listeners
document.addEventListener('DOMContentLoaded', function() {
    const closeTestBtn = document.querySelector('.close-test');
    const completeTestBtn = document.querySelector('.complete-test');
    const restartTestBtn = document.querySelector('.restart-test');

    closeTestBtn.addEventListener('click', closeTest);
    completeTestBtn.addEventListener('click', closeTest);
    restartTestBtn.addEventListener('click', startTest);

    // Close test when clicking outside
    const testOverlay = document.querySelector('.test-overlay');
    testOverlay.addEventListener('click', function(event) {
        if (event.target === testOverlay) {
            closeTest();
        }
    });
});

// Start the app
document.addEventListener('DOMContentLoaded', async function() {
    await loadVocabulary();
    await initializeExercises();
    initializeApp();
    initializeHeaderButtons();
});
