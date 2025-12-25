// Global variables for dictionary
let dictionary = [];
let selectedDates = new Set();
let expandedDateGroups = new Set();

function loadDictionary() {
    const saved = localStorage.getItem('germanVocabularyDictionary');
    if (saved) {
        dictionary = JSON.parse(saved);
        // Add dates to existing words that don't have them
        let hasChanges = false;
        dictionary.forEach(item => {
            if (!item.dateAdded) {
                item.dateAdded = 'Before date tracking';
                hasChanges = true;
            }
            // Add examples to existing words that don't have them
            if (!item.examples || item.examples.length === 0) {
                // Find examples from vocabulary data
                Object.keys(window.vocabularyData || {}).forEach(topic => {
                    const word = window.vocabularyData[topic].find(w =>
                        w.russian === item.russian && w.german === item.german
                    );
                    if (word && word.examples) {
                        item.examples = word.examples;
                        hasChanges = true;
                    }
                });
            }
        });
        // Fix german text for existing entries that may have newlines
        dictionary.forEach(item => {
            if (item.german.includes('\n')) {
                item.german = item.german.split('\n')[0].trim();
                hasChanges = true;
            }
        });
        if (hasChanges) {
            saveDictionary();
        }
    } else {
        // Add some sample words with dates for demonstration
        dictionary = [
            {
                wordId: 'environment-die natur',
                russian: 'природа',
                german: 'die Natur',
                english: 'nature',
                plural: '',
                dateAdded: 'December 20, 2025'
            },
            {
                wordId: 'environment-der baum',
                russian: 'дерево',
                german: 'der Baum',
                english: 'tree',
                plural: 'die Bäume',
                dateAdded: 'December 21, 2025'
            },
            {
                wordId: 'environment-das wasser',
                russian: 'вода',
                german: 'das Wasser',
                english: 'water',
                plural: '',
                dateAdded: 'December 21, 2025'
            }
        ];
        saveDictionary();
    }
    updateDictionaryDisplay();
    hideDictionaryWords();

    // Check achievements after dictionary is loaded
    if (typeof checkAchievements === 'function') {
        checkAchievements();
    }
}

function saveDictionary() {
    localStorage.setItem('germanVocabularyDictionary', JSON.stringify(dictionary));
}

function addToDictionary(wordId, wordData) {
    if (!dictionary.find(item => item.wordId === wordId)) {
        const date = new Date();
        const dateAdded = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Find examples for this word from vocabulary data
        let examples = [];
        Object.keys(window.vocabularyData || {}).forEach(topic => {
            const word = window.vocabularyData[topic].find(w =>
                w.russian === wordData.russian && w.german === wordData.german
            );
            if (word && word.examples) {
                examples = word.examples;
            }
        });

        dictionary.push({ wordId, ...wordData, examples, dateAdded });
        sortDictionaryByDate();
        saveDictionary();
        updateDictionaryDisplay();
        hideDictionaryWords();

        // Check for achievements after adding a word
        if (typeof checkAchievements === 'function') {
            checkAchievements();
        }
    }
}

function removeFromDictionary(wordId) {
    dictionary = dictionary.filter(item => item.wordId !== wordId);
    saveDictionary();
    updateDictionaryDisplay();
    showDictionaryWords();
}

function toggleDateSelection(date) {
    const btn = document.querySelector(`.select-date-btn[data-date="${date}"]`);
    const container = document.querySelector(`.date-header-container[data-date="${date}"]`);

    if (selectedDates.has(date)) {
        selectedDates.delete(date);
        btn.textContent = '➕ Test';
        btn.classList.remove('selected');
        container.classList.remove('selected');
    } else {
        selectedDates.add(date);
        btn.textContent = '✅ Selected';
        btn.classList.add('selected');
        container.classList.add('selected');
    }

    updateSelectedDatesDisplay();
}

function updateSelectedDatesDisplay() {
    const selectedCount = document.querySelector('.selected-count');
    const startBtn = document.querySelector('.start-selected-test-btn');

    selectedCount.textContent = `${selectedDates.size} date${selectedDates.size === 1 ? '' : 's'} selected`;

    if (selectedDates.size > 0) {
        startBtn.disabled = false;
        startBtn.textContent = `Start Test with ${selectedDates.size} Date${selectedDates.size === 1 ? '' : 's'}`;
    } else {
        startBtn.disabled = true;
        startBtn.textContent = 'Start Test with Selected';
    }
}

function startSelectedTest() {
    // Filter dictionary words by selected dates
    let availableWords = dictionary.filter(item => selectedDates.has(item.dateAdded)).map(item => ({
        russian: item.russian,
        german: item.german,
        english: item.english,
        plural: item.plural
    }));

    if (availableWords.length === 0) {
        alert('No words selected for testing.');
        return;
    }

    // Store selected words globally for use in test functions
    window.selectedTestWords = [...availableWords];

    // Show test selection overlay
    const testSelectionOverlay = document.querySelector('.test-selection-overlay');
    if (testSelectionOverlay) {
        testSelectionOverlay.classList.add('active');
    }
}

function updateDictionaryDisplay() {
    // Store currently expanded date groups before recreating HTML
    const currentlyExpanded = new Set();
    document.querySelectorAll('.date-header-container.expanded').forEach(container => {
        currentlyExpanded.add(container.getAttribute('data-date'));
    });

    const dictionaryCards = document.querySelector('.dictionary-cards');
    dictionaryCards.innerHTML = '';

    if (dictionary.length === 0) {
        dictionaryCards.innerHTML = '<p>No words in dictionary yet.</p>';
        return;
    }

    // Add total word count
    const totalCountContainer = document.createElement('div');
    totalCountContainer.className = 'total-words-count';
    totalCountContainer.innerHTML = `<h2>Total words: ${dictionary.length}</h2>`;
    dictionaryCards.appendChild(totalCountContainer);

    // Group dictionary items by date
    const groupedByDate = new Map();
    dictionary.forEach(item => {
        const date = item.dateAdded;
        if (!groupedByDate.has(date)) {
            groupedByDate.set(date, []);
        }
        groupedByDate.get(date).push(item);
    });

    // Sort dates chronologically
    const sortedDates = Array.from(groupedByDate.keys()).sort((a, b) => {
        const dateA = parseDateString(a);
        const dateB = parseDateString(b);
        return dateA - dateB;
    });

    // Create HTML for each date group
    sortedDates.forEach(date => {
        const items = groupedByDate.get(date);

        // Add date heading with selection button
        const dateHeaderContainer = document.createElement('div');
        dateHeaderContainer.className = 'date-header-container';
        dateHeaderContainer.setAttribute('data-date', date);

        const dateHeading = document.createElement('h3');
        dateHeading.className = 'date-header';
        dateHeading.textContent = `Added: ${date} (${items.length} word${items.length === 1 ? '' : 's'})`;

        const selectBtn = document.createElement('button');
        selectBtn.className = 'select-date-btn';
        selectBtn.setAttribute('data-date', date);
        selectBtn.textContent = '➕ Test';
        selectBtn.title = 'Select this date group for testing';

        dateHeaderContainer.appendChild(dateHeading);
        dateHeaderContainer.appendChild(selectBtn);
        dictionaryCards.appendChild(dateHeaderContainer);

        // Create container for cards in this date group
        const dateGroupContainer = document.createElement('div');
        dateGroupContainer.className = 'date-group-cards';
        dateGroupContainer.setAttribute('data-date', date);
        dateGroupContainer.style.display = 'none'; // Initially hide

        // Add cards for this date
        items.forEach(item => {
            const pluralHtml = item.plural ? `<br><small>(Die ${item.plural})</small>` : '';
            // Determine article class
            const germanLower = item.german.toLowerCase();
            let articleClass = '';
            if (germanLower.startsWith('der ')) {
                articleClass = 'article-der';
            } else if (germanLower.startsWith('die ')) {
                articleClass = 'article-die';
            } else if (germanLower.startsWith('das ')) {
                articleClass = 'article-das';
            }

            const card = document.createElement('div');
            card.className = `card ${articleClass}`;
            card.setAttribute('data-word-id', item.wordId);

            const cardInner = document.createElement('div');
            cardInner.className = 'card-inner';

            const cardFront = document.createElement('div');
            cardFront.className = 'card-front';

            const frontH2 = document.createElement('h2');
            frontH2.textContent = item.russian;
            cardFront.appendChild(frontH2);

            const audioBtn = document.createElement('button');
            audioBtn.className = 'audio-btn';
            audioBtn.setAttribute('data-word', item.german);
            audioBtn.setAttribute('aria-label', `Pronounce ${item.german}`);
            audioBtn.textContent = '🔊';
            cardFront.appendChild(audioBtn);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.setAttribute('data-word-id', item.wordId);
            removeBtn.textContent = '✕';
            cardFront.appendChild(removeBtn);

            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';

            const backH2 = document.createElement('h2');
            backH2.innerHTML = `${item.german}${pluralHtml}`;
            cardBack.appendChild(backH2);

            const backP = document.createElement('p');
            backP.textContent = item.english;
            cardBack.appendChild(backP);

            const examplesBtn = document.createElement('button');
            examplesBtn.className = 'examples-btn';
            examplesBtn.setAttribute('data-word', item.russian);
            examplesBtn.setAttribute('aria-label', 'Show examples');
            examplesBtn.textContent = '📝';
            cardBack.appendChild(examplesBtn);

            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            card.appendChild(cardInner);
            dateGroupContainer.appendChild(card);
        });

        dictionaryCards.appendChild(dateGroupContainer);
    });

    // Add selected dates indicator and test button
    const selectedDatesContainer = document.createElement('div');
    selectedDatesContainer.className = 'selected-dates-container';
    selectedDatesContainer.innerHTML = `
        <div class="selected-dates-info">
            <span class="selected-count">0 dates selected</span>
            <button class="start-selected-test-btn" disabled>Start Test with Selected</button>
        </div>
    `;
    dictionaryCards.appendChild(selectedDatesContainer);

    // Add event listeners to remove buttons
    document.querySelectorAll('.dictionary-cards .remove-btn').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            const wordId = this.getAttribute('data-word-id');
            removeFromDictionary(wordId);
        });
    });

    // Add event listeners for date selection
    document.querySelectorAll('.select-date-btn').forEach(button => {
        button.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            toggleDateSelection(date);
        });
    });

    // Add event listener for start selected test button
    const startSelectedTestBtn = document.querySelector('.start-selected-test-btn');
    if (startSelectedTestBtn) {
        startSelectedTestBtn.addEventListener('click', startSelectedTest);
    }

    // Restore expanded state
    currentlyExpanded.forEach(date => {
        const container = document.querySelector(`.date-header-container[data-date="${date}"]`);
        const dateGroupCards = document.querySelector(`.date-group-cards[data-date="${date}"]`);
        if (container && dateGroupCards) {
            container.classList.add('expanded');
            dateGroupCards.style.display = 'grid';
            dateGroupCards.classList.add('expanded');
        }
    });

    // Add event listeners for date header expansion/collapse
    document.querySelectorAll('.date-header-container').forEach(container => {
        container.addEventListener('click', function(event) {
            // Don't toggle if clicking on the select button
            if (event.target.classList.contains('select-date-btn')) return;

            const date = this.getAttribute('data-date');
            const dateGroupCards = document.querySelector(`.date-group-cards[data-date="${date}"]`);

            if (dateGroupCards) {
                const isExpanded = this.classList.contains('expanded');
                if (isExpanded) {
                    // Collapse
                    this.classList.remove('expanded');
                    dateGroupCards.style.display = 'none';
                    dateGroupCards.classList.remove('expanded');
                } else {
                    // Expand
                    this.classList.add('expanded');
                    dateGroupCards.style.display = 'grid';
                    dateGroupCards.classList.add('expanded');
                }
            }
        });
    });
}

function hideDictionaryWords() {
    dictionary.forEach(item => {
        const arrowBtn = document.querySelector(`.arrow-btn[data-word-id="${item.wordId}"]`);
        if (arrowBtn) {
            arrowBtn.style.display = 'none';
        }
    });
}

function showDictionaryWords() {
    document.querySelectorAll('.arrow-btn').forEach(btn => {
        btn.style.display = '';
    });
    hideDictionaryWords(); // Re-hide arrows for current dictionary words
}

function sortDictionaryByDate() {
    dictionary.sort((a, b) => {
        const dateA = parseDateString(a.dateAdded);
        const dateB = parseDateString(b.dateAdded);
        return dateA - dateB; // Oldest first
    });
}

function parseDateString(dateString) {
    if (dateString === 'Before date tracking') {
        return new Date(0); // Very old date
    }

    // Try German format first (DD.MM.YYYY)
    if (dateString.includes('.')) {
        const parts = dateString.split('.');
        if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
    }

    // Try English format (Month DD, YYYY)
    return new Date(dateString);
}
