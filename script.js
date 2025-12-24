// Global variables
let examplesData = {};
let germanVoice = null;
let voicesLoaded = false;
let speechQueue = [];
let isSpeaking = false;
let dictionary = [];
let selectedDates = new Set();
let selectedRussianWord = null;
let testWords = [];
let correctMatches = 0;
let mistakeCount = 0;
let expandedDateGroups = new Set();

// Exercise data
let wordOrderExercises = [];
let prepositionExercises = [];

// Current exercise state
let currentExerciseType = null;
let currentExercise = null;
let exerciseScore = 0;

// Search and filter variables
let currentSearchTerm = '';
let currentDifficultyFilter = 'all';
let currentTagFilter = 'all';
let allCardsData = [];


let currentPages = {
    environment: 1,
    society: 1,
    culture: 1,
    technology: 1,
    politics: 1
};
const PAGE_SIZE = 12;

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

// Load vocabulary and initialize
async function loadVocabulary() {
    try {
        showLoadingState('Loading vocabulary...');
        const response = await fetch('vocabulary.txt');
        if (!response.ok) {
            throw new Error(`Failed to load vocabulary: ${response.status}`);
        }
        const text = await response.text();
        parseVocabulary(text);
        generateCards();
        hideLoadingState();
        initializeApp();
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        showErrorMessage('Failed to load vocabulary. Please refresh the page.');
        hideLoadingState();
    }
}

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

function parseVocabulary(text) {
    const lines = text.split('\n');
    let currentTopic = '';
    const topics = {};

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#')) {
            if (line.includes('Topic')) {
                currentTopic = line.replace('#', '').replace('Topic', '').trim().toLowerCase();
                if (!topics[currentTopic]) {
                    topics[currentTopic] = [];
                }
            }
        } else if (line && !line.startsWith('//') && line.includes('|')) {
            if (!currentTopic) continue; // Skip if no topic set yet

            const parts = line.split('|');
            if (parts.length >= 3) { // Require at least Russian|German|English
                const russian = parts[0].trim();
                const german = parts[1].trim();
                const english = parts[2].trim();
                const plural = parts.length > 3 ? parts[3].trim() : '';
                const difficulty = parts.length > 4 ? parts[4].trim() : 'intermediate';
                const tags = parts.length > 5 ? parts[5].trim().split(',').map(tag => tag.trim()) : ['common'];
                let examples = [];

                // Parse examples (pairs of German|Russian) starting from index 6, but handle cases where some fields are empty
                let exampleStartIndex = 6;
                if (parts.length > 6) {
                    // Check if what we think is tags is actually the first German example
                    if (parts[5] && parts[5].includes(' ')) {
                        // If tags field contains spaces, it might be the first German example
                        exampleStartIndex = 5;
                    }
                    // Parse examples (pairs of German|Russian)
                    for (let i = exampleStartIndex; i < parts.length; i += 2) {
                        if (parts[i] && parts[i+1]) {
                            examples.push({
                                german: parts[i].trim().replace(/\.$/, '') + '.',
                                russian: parts[i+1].trim().replace(/\.$/, '') + '.'
                            });
                        }
                    }
                }

                topics[currentTopic].push({
                    russian,
                    german,
                    english,
                    plural,
                    difficulty,
                    tags,
                    examples
                });
            }
        }
    }

    // Store in global variable
    window.vocabularyData = topics;

    // Generate examplesData with deduplication
    Object.keys(topics).forEach(topic => {
        topics[topic].forEach(word => {
            if (word.examples && word.examples.length > 0) {
                examplesData[word.russian] = word.examples;
            }
        });
    });
}

function generateCards() {
    const topics = window.vocabularyData;
    const topicClassMap = {
        'environment': 'topic-environment',
        'society': 'topic-society',
        'culture': 'topic-culture',
        'technology': 'topic-technology',
        'politics': 'topic-politics'
    };

    Object.keys(topics).forEach(topic => {
        const className = topicClassMap[topic];
        const active = topic === 'environment' ? ' active' : '';

        // Create container element
        const container = document.createElement('div');
        container.className = `cards-container ${className}${active}`;

        // Add pagination controls
        const paginationDiv = createPagination(topic, topics[topic].length, PAGE_SIZE);
        container.appendChild(paginationDiv);

        // Populate if active
        if (topic === 'environment') {
            populateContainer(container, topics[topic], currentPages[topic], PAGE_SIZE, topic);
        }

        // Replace existing container
        const existingContainer = document.querySelector(`.${className}`);
        if (existingContainer) {
            existingContainer.parentNode.replaceChild(container, existingContainer);
        } else {
            document.body.appendChild(container);
        }
    });

    updateTopicButtons();
}

function createCardElement(word, topic) {
    const pluralHtml = word.plural ? `<br><small>(Die ${word.plural})</small>` : '';
    const wordId = `${topic}-${word.russian.replace(/\s+/g, '-').toLowerCase()}`;

    // Determine article class
    const germanLower = word.german.toLowerCase();
    let articleClass = '';
    if (germanLower.startsWith('der ')) {
        articleClass = 'article-der';
    } else if (germanLower.startsWith('die ')) {
        articleClass = 'article-die';
    } else if (germanLower.startsWith('das ')) {
        articleClass = 'article-das';
    }

    // Create card elements
    const card = document.createElement('div');
    card.className = `card ${articleClass}`;
    card.setAttribute('data-word-id', wordId);

    const cardInner = document.createElement('div');
    cardInner.className = 'card-inner';

    const cardFront = document.createElement('div');
    cardFront.className = 'card-front';

    const frontH2 = document.createElement('h2');
    frontH2.textContent = word.russian;
    cardFront.appendChild(frontH2);

    const audioBtn = document.createElement('button');
    audioBtn.className = 'audio-btn';
    audioBtn.setAttribute('data-word', word.german);
    audioBtn.setAttribute('aria-label', `Pronounce ${word.german}`);
    audioBtn.textContent = '🔊';
    cardFront.appendChild(audioBtn);

    const arrowBtn = document.createElement('button');
    arrowBtn.className = 'arrow-btn';
    arrowBtn.setAttribute('data-word-id', wordId);
    arrowBtn.setAttribute('aria-label', 'Add to dictionary');
    arrowBtn.textContent = '→';
    cardFront.appendChild(arrowBtn);

    const cardBack = document.createElement('div');
    cardBack.className = 'card-back';

    const backH2 = document.createElement('h2');
    backH2.innerHTML = `${word.german}${pluralHtml}`;
    cardBack.appendChild(backH2);

    const backP = document.createElement('p');
    backP.textContent = word.english;
    cardBack.appendChild(backP);

    const examplesBtn = document.createElement('button');
    examplesBtn.className = 'examples-btn';
    examplesBtn.setAttribute('data-word', word.russian);
    examplesBtn.setAttribute('aria-label', 'Show examples');
    examplesBtn.textContent = '📝';
    cardBack.appendChild(examplesBtn);

    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    card.appendChild(cardInner);

    return card;
}

function populateContainer(container, words, page, pageSize, topic) {
    // Clear existing cards
    const existingCards = container.querySelectorAll('.card');
    existingCards.forEach(card => card.remove());

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const wordsToShow = words.slice(start, end);

    const fragment = document.createDocumentFragment();
    wordsToShow.forEach(word => {
        const card = createCardElement(word, topic);
        fragment.appendChild(card);
    });

    // Insert before pagination
    const pagination = container.querySelector('.pagination-controls');
    container.insertBefore(fragment, pagination);
}

function createPagination(topic, totalWords, pageSize) {
    const totalPages = Math.ceil(totalWords / pageSize);
    const div = document.createElement('div');
    div.className = 'pagination-controls';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.className = 'pagination-btn prev-btn';
    prevBtn.disabled = currentPages[topic] === 1;
    prevBtn.addEventListener('click', () => changePage(topic, currentPages[topic] - 1, pageSize));

    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `${currentPages[topic]} / ${totalPages}`;

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'pagination-btn next-btn';
    nextBtn.disabled = currentPages[topic] === totalPages;
    nextBtn.addEventListener('click', () => changePage(topic, currentPages[topic] + 1, pageSize));

    div.appendChild(prevBtn);
    div.appendChild(pageInfo);
    div.appendChild(nextBtn);

    return div;
}

function changePage(topic, newPage, pageSize) {
    currentPages[topic] = newPage;
    const container = document.querySelector(`.topic-${topic}`);
    populateContainer(container, window.vocabularyData[topic], newPage, pageSize, topic);
    updatePagination(container, topic, window.vocabularyData[topic].length, pageSize);
    updateTopicButtons();

    // Reinitialize cards for the new page
    initializeCardsForContainer(container);
    initializeAudioButtonsForContainer(container);
    initializeExamplesButtonsForContainer(container);
    initializeArrowButtonsForContainer(container);
    hideDictionaryWords();
}

function updatePagination(container, topic, totalWords, pageSize) {
    const totalPages = Math.ceil(totalWords / pageSize);
    const pageInfo = container.querySelector('.page-info');
    pageInfo.textContent = `${currentPages[topic]} / ${totalPages}`;

    const prevBtn = container.querySelector('.prev-btn');
    prevBtn.disabled = currentPages[topic] === 1;

    const nextBtn = container.querySelector('.next-btn');
    nextBtn.disabled = currentPages[topic] === totalPages;
}

function updateTopicButtons() {
    Object.keys(window.vocabularyData).forEach(topic => {
        const totalPages = Math.ceil(window.vocabularyData[topic].length / PAGE_SIZE);
        const btn = document.querySelector(`.topic-btn[data-topic="${topic}"]`);
        const baseText = {
            'environment': 'Umwelt',
            'society': 'Gesellschaft',
            'culture': 'Kultur',
            'technology': 'Technologie',
            'politics': 'Politik'
        }[topic];
        btn.textContent = `${baseText} (${currentPages[topic]}/${totalPages})`;
    });
}

function initializeCardsForContainer(container) {
    const cards = container.querySelectorAll('.card');
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

function initializeAudioButtonsForContainer(container) {
    const audioButtons = container.querySelectorAll('.audio-btn');
    audioButtons.forEach(button => {
        button.addEventListener('click', handleAudioClick);
    });
}

function initializeExamplesButtonsForContainer(container) {
    const examplesButtons = container.querySelectorAll('.examples-btn');
    examplesButtons.forEach(button => {
        button.addEventListener('click', handleExamplesClick);
    });
}

function initializeArrowButtonsForContainer(container) {
    const arrowButtons = container.querySelectorAll('.arrow-btn');
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

// Dictionary functions
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

function startTest() {
    const testOverlay = document.querySelector('.test-overlay');
    testOverlay.classList.add('active');

    // Use selected words if available (from dictionary date selection), otherwise use dictionary words or current topic vocabulary
    let availableWords = [];
    if (window.selectedTestWords && window.selectedTestWords.length > 0) {
        // Use selected words from dictionary
        availableWords = window.selectedTestWords;
        // Clear selected words after use
        window.selectedTestWords = [];
    } else if (dictionary.length > 0) {
        availableWords = dictionary.map(item => ({
            russian: item.russian,
            german: item.german,
            english: item.english,
            plural: item.plural
        }));
    } else {
        const activeTopic = document.querySelector('.topic-btn.active').getAttribute('data-topic');
        if (window.vocabularyData && window.vocabularyData[activeTopic]) {
            availableWords = window.vocabularyData[activeTopic];
        }
    }

    // Use all available words for the test
    testWords = [...availableWords];

    // Thoroughly shuffle the test words
    testWords.sort(() => Math.random() - 0.5);

    // Shuffle the German words separately for additional mixing
    const germanWords = testWords.map(word => word.german).sort(() => Math.random() - 0.5);

    // Display Russian words
    const russianWordsContainer = document.querySelector('.russian-words');
    russianWordsContainer.innerHTML = '';
    testWords.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = 'test-word russian-word';

        // Create text node for Russian word
        const textNode = document.createTextNode(word.russian + ' ');
        wordElement.appendChild(textNode);

        // Create audio button
        const audioBtn = document.createElement('button');
        audioBtn.className = 'test-audio-btn';
        audioBtn.setAttribute('data-word', word.german);
        audioBtn.textContent = '🔊';
        audioBtn.addEventListener('click', handleAudioClick);
        wordElement.appendChild(audioBtn);

        wordElement.setAttribute('data-german', word.german);
        wordElement.addEventListener('click', selectRussianWord);
        russianWordsContainer.appendChild(wordElement);
    });

    // Display German words
    const germanWordsContainer = document.querySelector('.german-words');
    germanWordsContainer.innerHTML = '';
    germanWords.forEach(germanWord => {
        const wordElement = document.createElement('div');
        wordElement.className = 'test-word german-word';
        wordElement.textContent = germanWord;
        wordElement.addEventListener('click', selectGermanWord);
        germanWordsContainer.appendChild(wordElement);
    });

    // Reset state
    selectedRussianWord = null;
    correctMatches = 0;
    mistakeCount = 0;
    // Hide buttons
    document.querySelector('.complete-test').style.display = 'none';
    document.querySelector('.restart-test').style.display = 'none';
    updateTestProgress();
}

function selectRussianWord(event) {
    const wordElement = event.target;

    // If clicking on audio button, don't select
    if (event.target.classList.contains('test-audio-btn')) return;

    // If a Russian word was already selected, deselect it
    if (selectedRussianWord) {
        selectedRussianWord.classList.remove('selected');
    }

    // If clicking the same word, deselect it
    if (selectedRussianWord === wordElement) {
        selectedRussianWord = null;
        return;
    }

    // Select the new word
    selectedRussianWord = wordElement;
    wordElement.classList.add('selected');
}

function selectGermanWord(event) {
    if (!selectedRussianWord) return;

    const germanWordElement = event.target;
    const selectedGerman = germanWordElement.textContent;
    const correctGerman = selectedRussianWord.getAttribute('data-german');

    if (selectedGerman === correctGerman) {
        // Correct match
        selectedRussianWord.classList.remove('selected');
        selectedRussianWord.classList.add('correct');
        germanWordElement.classList.add('correct');
        correctMatches++;

        // Disable clicking on matched words
        selectedRussianWord.style.pointerEvents = 'none';
        germanWordElement.style.pointerEvents = 'none';
    } else {
        // Incorrect match - flash red for 0.5 seconds
        selectedRussianWord.classList.remove('selected');
        selectedRussianWord.classList.add('wrong-flash');
        germanWordElement.classList.add('wrong-flash');

        // Remove the flash class after animation completes
        setTimeout(() => {
            selectedRussianWord.classList.remove('wrong-flash');
            germanWordElement.classList.remove('wrong-flash');
        }, 500);

        mistakeCount++;
    }

    selectedRussianWord = null;
    updateTestProgress();

    // Check if test is complete
    if (correctMatches === testWords.length) {
        const completeBtn = document.querySelector('.complete-test');
        const restartBtn = document.querySelector('.restart-test');
        if (mistakeCount === 0) {
            completeBtn.style.display = 'block';
            restartBtn.style.display = 'none';
        } else {
            completeBtn.style.display = 'none';
            restartBtn.style.display = 'block';
        }
        setTimeout(() => {
            alert(`Congratulations! You completed the test!\nCorrect: ${correctMatches}\nMistakes: ${mistakeCount}`);
        }, 500);
    }
}

function updateTestProgress() {
    const correctCountElement = document.querySelector('.correct-count');
    const totalCountElement = document.querySelector('.total-count');
    const mistakesCountElement = document.querySelector('.mistakes-count');

    correctCountElement.textContent = correctMatches;
    totalCountElement.textContent = testWords.length;
    mistakesCountElement.textContent = mistakeCount;
}

function closeTest() {
    // Track total test completion
    if (testWords.length > 0) {
        if (typeof trackTotalTest === 'function') {
            trackTotalTest();
        }
    }

    // Check for perfect test achievement before closing
    if (correctMatches === testWords.length && mistakeCount === 0 && testWords.length > 0) {
        // Track perfect test achievement
        if (typeof trackPerfectTest === 'function') {
            trackPerfectTest();
        }
    }



    const testOverlay = document.querySelector('.test-overlay');
    testOverlay.classList.remove('active');
    selectedRussianWord = null;
    testWords = [];
    correctMatches = 0;
    mistakeCount = 0;
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

// Initialize speech synthesis voices
function initializeVoices() {
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        germanVoice = voices.find(voice => voice.lang === 'de-DE' && voice.localService);
        if (!germanVoice) {
            germanVoice = voices.find(voice => voice.lang.startsWith('de'));
        }
        if (!germanVoice) {
            germanVoice = voices.find(voice =>
                voice.name.toLowerCase().includes('german') ||
                voice.name.toLowerCase().includes('deutsch') ||
                voice.name.toLowerCase().includes('deutsche')
            );
        }
        voicesLoaded = true;
    }
}

function handleAudioClick(event) {
    event.stopPropagation();
    const button = event.target;
    const word = button.getAttribute('data-word');
    if (!word) return;
    speakWord(word, button);
    // Track listening achievement
    if (typeof trackListening === 'function') {
        trackListening();
    }
}

function speakWord(word, button) {
    if ('speechSynthesis' in window) {
        // Add to speech queue
        speechQueue.push({
            text: word,
            button: button,
            utterance: createUtterance(word)
        });
        processSpeechQueue();
    } else {
        showPronunciationGuide(button, word);
    }
}

function speakSentence(sentence, button) {
    if ('speechSynthesis' in window) {
        // Add to speech queue with higher priority
        speechQueue.unshift({
            text: sentence,
            button: button,
            utterance: createUtterance(sentence, true)
        });
        processSpeechQueue();
    } else {
        button.textContent = '❌';
        setTimeout(() => button.textContent = '🔊', 1500);
    }
}

function createUtterance(text, isSentence = false) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = isSentence ? 0.8 : 0.75;
    utterance.pitch = isSentence ? 1.1 : 1.2;
    utterance.volume = 0.9;

    if (germanVoice) {
        utterance.voice = germanVoice;
        utterance.lang = germanVoice.lang;
    }

    return utterance;
}

function processSpeechQueue() {
    if (isSpeaking || speechQueue.length === 0) return;

    isSpeaking = true;
    const item = speechQueue.shift();
    const { utterance, button } = item;

    // Update button state
    if (button) {
        button.classList.add('playing');
        button.textContent = '🔊';
    }

    utterance.onstart = () => {
        if (button) button.classList.add('speaking');
    };

    utterance.onend = () => {
        if (button) {
            button.classList.remove('playing', 'speaking');
            button.textContent = '🔊';
        }
        isSpeaking = false;
        // Process next item in queue
        setTimeout(processSpeechQueue, 100);
    };

    utterance.onerror = () => {
        console.error('Speech synthesis error');
        if (button) {
            button.classList.remove('playing', 'speaking');
            button.textContent = '❌';
            setTimeout(() => button.textContent = '🔊', 1500);
        }
        isSpeaking = false;
        // Process next item in queue
        setTimeout(processSpeechQueue, 100);
    };

    // Make the flash go away after half a second
    if (button) {
        setTimeout(() => {
            button.classList.remove('playing');
        }, 500);
    }

    try {
        speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Speech synthesis failed:', error);
        if (button) {
            button.classList.remove('playing', 'speaking');
            button.textContent = '❌';
            setTimeout(() => button.textContent = '🔊', 1500);
        }
        isSpeaking = false;
        setTimeout(processSpeechQueue, 100);
    }
}

function showPronunciationGuide(button, word) {
    const card = button.closest('.card');
    const cardFront = card.querySelector('.card-front');
    const existingGuide = cardFront.querySelector('.pronunciation-guide');
    if (existingGuide) {
        existingGuide.remove();
        button.classList.remove('active');
        return;
    }
    const guide = document.createElement('div');
    guide.className = 'pronunciation-guide';
    guide.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.95);
        padding: 1rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        text-align: center;
        z-index: 10;
        max-width: 250px;
    `;
    guide.innerHTML = `
        <strong style="color: #2c3e50; font-size: 1.2rem;">${word}</strong><br>
        <small style="color: #666;">Russian pronunciation</small><br>
        <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #e74c3c;">
            Use online tools:<br>
            • Google Translate<br>
            • Forvo.com<br>
            • Yandex Translate
        </div>
        <button onclick="this.parentElement.remove(); this.closest('.card').querySelector('.audio-btn').classList.remove('active');"
                style="margin-top: 0.5rem; padding: 0.3rem 0.6rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Close
        </button>
    `;
    button.classList.add('active');
    cardFront.appendChild(guide);
    setTimeout(() => {
        if (guide.parentElement) {
            guide.remove();
            button.classList.remove('active');
        }
    }, 10000);
}

function handleExamplesClick(event) {
    event.stopPropagation();
    const button = event.target;
    const word = button.getAttribute('data-word');
    if (!word || !examplesData[word]) return;
    showExamplesModal(word, examplesData[word]);
    // Track examples viewed achievement
    if (typeof trackExamplesViewed === 'function') {
        trackExamplesViewed();
    }
}

function showExamplesModal(word, examples) {
    const existingModal = document.querySelector('.examples-overlay');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'examples-overlay';
    const content = document.createElement('div');
    content.className = 'examples-content';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => overlay.remove();
    const title = document.createElement('h3');
    title.textContent = `Examples with "${word}"`;
    const examplesList = document.createElement('div');
    examples.forEach((example, index) => {
        const exampleItem = document.createElement('div');
        exampleItem.className = 'example-item';
        exampleItem.style.setProperty('--example-index', index);
        const germanText = document.createElement('div');
        germanText.className = 'german';
        germanText.innerHTML = `${example.german} <button class="sentence-audio-btn" data-sentence="${example.german}">🔊</button>`;
        const russianText = document.createElement('div');
        russianText.className = 'russian';
        russianText.textContent = example.russian;
        exampleItem.appendChild(germanText);
        exampleItem.appendChild(russianText);
        examplesList.appendChild(exampleItem);
    });
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(examplesList);
    overlay.appendChild(content);
    overlay.onclick = (event) => {
        if (event.target === overlay) overlay.remove();
    };
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.classList.add('active');
        initializeSentenceAudioButtons();
    }, 10);
}

function initializeSentenceAudioButtons() {
    const sentenceButtons = document.querySelectorAll('.sentence-audio-btn');
    sentenceButtons.forEach(button => {
        button.addEventListener('click', handleSentenceAudioClick);
    });
}

function handleSentenceAudioClick(event) {
    event.stopPropagation();
    const button = event.target;
    const sentence = button.getAttribute('data-sentence');
    if (!sentence) return;
    speakSentence(sentence, button);
    // Track sentence listening achievement
    if (typeof trackSentenceListened === 'function') {
        trackSentenceListened();
    }
}

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







    // Test event listeners
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



// Search and filter functions
function initializeSearchAndFilters() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const tagFilter = document.getElementById('tag-filter');

    // Check if vocabulary data is loaded
    if (!window.vocabularyData) {
        console.warn('Vocabulary data not loaded yet, retrying in 100ms...');
        setTimeout(initializeSearchAndFilters, 100);
        return;
    }

    // Initialize allCardsData
    allCardsData = [];
    Object.keys(window.vocabularyData).forEach(topic => {
        window.vocabularyData[topic].forEach((word, index) => {
            allCardsData.push({
                ...word,
                topic: topic,
                originalIndex: index
            });
        });
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentSearchTerm = this.value.toLowerCase().trim();
            applyFilters();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            currentSearchTerm = '';
            applyFilters();
        });
    }

    // Filter functionality
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', function() {
            currentDifficultyFilter = this.value;
            applyFilters();
        });
    }

    if (tagFilter) {
        tagFilter.addEventListener('change', function() {
            currentTagFilter = this.value;
            applyFilters();
        });
    }
}

function applyFilters() {
    let filteredCards = [...allCardsData];

    // Apply search filter
    if (currentSearchTerm) {
        filteredCards = filteredCards.filter(card =>
            card.russian.toLowerCase().includes(currentSearchTerm) ||
            card.german.toLowerCase().includes(currentSearchTerm) ||
            card.english.toLowerCase().includes(currentSearchTerm)
        );
    }

    // Apply difficulty filter
    if (currentDifficultyFilter !== 'all') {
        filteredCards = filteredCards.filter(card => card.difficulty === currentDifficultyFilter);
    }

    // Apply tag filter
    if (currentTagFilter !== 'all') {
        filteredCards = filteredCards.filter(card => card.tags.includes(currentTagFilter));
    }

    // Update display
    updateFilteredCards(filteredCards);
}

function updateFilteredCards(filteredCards) {
    // Clear all topic containers
    document.querySelectorAll('.cards-container').forEach(container => {
        const existingCards = container.querySelectorAll('.card');
        existingCards.forEach(card => card.remove());
        const noResults = container.querySelector('.no-results');
        if (noResults) noResults.remove();
        container.classList.remove('active');
    });

    if (filteredCards.length === 0) {
        // Show no results message in active container
        const activeContainer = document.querySelector('.cards-container.active');
        if (activeContainer) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = '<p>No words match your search criteria.</p>';
            activeContainer.insertBefore(noResults, activeContainer.querySelector('.pagination-controls'));
            activeContainer.classList.add('active');
        }
        return;
    }

    // Group by topic
    const groupedByTopic = {};
    filteredCards.forEach(card => {
        if (!groupedByTopic[card.topic]) {
            groupedByTopic[card.topic] = [];
        }
        groupedByTopic[card.topic].push(card);
    });

    if (currentSearchTerm) {
        // When searching, show all topics that have results
        Object.keys(groupedByTopic).forEach(topic => {
            const container = document.querySelector(`.topic-${topic}`);
            if (container && groupedByTopic[topic].length > 0) {
                const fragment = document.createDocumentFragment();
                groupedByTopic[topic].forEach(word => {
                    const card = createCardElement(word, topic);
                    fragment.appendChild(card);
                });
                const pagination = container.querySelector('.pagination-controls');
                container.insertBefore(fragment, pagination);
                container.classList.add('active');

                // Reinitialize card functionality
                initializeCardsForContainer(container);
                initializeAudioButtonsForContainer(container);
                initializeExamplesButtonsForContainer(container);
                initializeArrowButtonsForContainer(container);
                hideDictionaryWords();
            }
        });
    } else {
        // Normal topic view
        const activeTopic = document.querySelector('.topic-btn.active').getAttribute('data-topic');
        const activeContainer = document.querySelector(`.topic-${activeTopic}`);

        if (activeContainer && groupedByTopic[activeTopic]) {
            const fragment = document.createDocumentFragment();
            groupedByTopic[activeTopic].forEach(word => {
                const card = createCardElement(word, activeTopic);
                fragment.appendChild(card);
            });
            const pagination = activeContainer.querySelector('.pagination-controls');
            activeContainer.insertBefore(fragment, pagination);
            activeContainer.classList.add('active');

            // Reinitialize card functionality
            initializeCardsForContainer(activeContainer);
            initializeAudioButtonsForContainer(activeContainer);
            initializeExamplesButtonsForContainer(activeContainer);
            initializeArrowButtonsForContainer(activeContainer);
            hideDictionaryWords();
        }
    }
}

// Initialize exercise data
async function initializeExercises() {
    try {
        // Load grammar exercises from file
        const response = await fetch('grammar-exercises.txt');
        if (!response.ok) {
            throw new Error(`Failed to load grammar exercises: ${response.status}`);
        }
        const text = await response.text();
        parseGrammarExercises(text);
    } catch (error) {
        console.error('Error loading grammar exercises:', error);
        // Fallback to basic hardcoded exercises if file loading fails
        initializeFallbackExercises();
    }
}

function parseGrammarExercises(text) {
    const lines = text.split('\n');
    wordOrderExercises = [];
    prepositionExercises = [];

    for (let line of lines) {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('|')) {
            const parts = line.split('|');
            if (parts.length >= 2) {
                const exerciseType = parts[0].trim();

                if (exerciseType === 'WORD_ORDER' && parts.length >= 4) {
                    // WORD_ORDER|words|correctOrder|translation
                    const words = parts[1].trim().split(' ');
                    const correctOrder = parts[2].trim().split(' ');
                    const translation = parts[3].trim();

                    wordOrderExercises.push({
                        words: words,
                        correctOrder: correctOrder,
                        translation: translation
                    });
                } else if (exerciseType === 'PREPOSITION' && parts.length >= 5) {
                    // PREPOSITION|sentence|options|correctAnswer|explanation
                    const sentence = parts[1].trim();
                    const options = parts[2].trim().split(',');
                    const correctAnswer = parts[3].trim();
                    const explanation = parts[4].trim();

                    prepositionExercises.push({
                        sentence: sentence,
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: explanation
                    });
                }
            }
        }
    }
}

function initializeFallbackExercises() {
    // Fallback exercises in case file loading fails
    wordOrderExercises = [
        {
            words: ["Ich", "gehe", "ins", "Kino"],
            correctOrder: ["Ich", "gehe", "ins", "Kino"],
            translation: "I am going to the cinema"
        },
        {
            words: ["Die", "Katze", "sitzt", "auf", "dem", "Tisch"],
            correctOrder: ["Die", "Katze", "sitzt", "auf", "dem", "Tisch"],
            translation: "The cat is sitting on the table"
        }
    ];

    prepositionExercises = [
        {
            sentence: "Das Buch liegt ___ dem Tisch.",
            options: ["auf", "unter", "neben", "in"],
            correctAnswer: "auf",
            explanation: "auf = on (horizontal surface)"
        },
        {
            sentence: "Ich wohne ___ Berlin.",
            options: ["auf", "unter", "neben", "in"],
            correctAnswer: "in",
            explanation: "in = in (cities)"
        }
    ];
}

// Gap-fill exercise functions
function startGapFillExercise() {
    // Only use selected words from dictionary - no predefined exercises
    if (!window.selectedTestWords || window.selectedTestWords.length === 0) {
        alert('Please select words from your dictionary first to use Gap-Fill exercises.');
        return;
    }

    const availableWords = window.selectedTestWords;
    // Clear selected words after use
    window.selectedTestWords = [];

    if (availableWords.length === 0) {
        alert('No words available for gap-fill exercise.');
        return;
    }

    currentExerciseType = 'gap-fill-dynamic';
    exerciseScore = 0;

    // Select a random word that has examples
    const wordsWithExamples = availableWords.filter(word => word.examples && word.examples.length > 0);
    if (wordsWithExamples.length === 0) {
        alert('Selected words must have example sentences to create gap-fill exercises. Please choose different words.');
        return;
    }

    const randomWord = wordsWithExamples[Math.floor(Math.random() * wordsWithExamples.length)];
    const randomExample = randomWord.examples[Math.floor(Math.random() * randomWord.examples.length)];

    // Create the gap-fill text by replacing the German word with ___ in the example
    const germanText = randomExample.german;
    const germanWord = randomWord.german.split(' ')[0]; // Take the first word (main word without article)
    const gapText = germanText.replace(new RegExp('\\b' + germanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '___');

    currentExercise = {
        text: gapText,
        answers: [germanWord],
        explanation: `${germanWord} = ${randomWord.english}`,
        russianMeaning: randomWord.russian
    };

    const testOverlay = document.querySelector('.test-overlay');
    testOverlay.classList.add('active');

    const testContent = testOverlay.querySelector('.test-content');
    testContent.innerHTML = `
        <button class="close-test">×</button>
        <h2>Gap-Fill Exercise</h2>
        <p>Fill in the missing words in the German sentences.</p>
        <div class="exercise-container">
            <div class="exercise-text">
                ${currentExercise.text.replace(/___/g, '<input type="text" class="gap-input" placeholder="...">')}
            </div>
            <button class="check-answer-btn">Check Answer</button>
            <div class="exercise-feedback" style="display: none;"></div>
        </div>
        <div class="exercise-progress">
            <span class="exercise-score">Score: ${exerciseScore}</span>
        </div>
        <div class="exercise-controls">
            <button class="next-exercise-btn" style="display: none;">Next Exercise</button>
            <button class="finish-exercise-btn" style="display: none;">Finish</button>
        </div>
    `;

    // Add event listeners
    testContent.querySelector('.close-test').addEventListener('click', closeTest);
    testContent.querySelector('.check-answer-btn').addEventListener('click', checkGapFillAnswer);
    testContent.querySelector('.next-exercise-btn').addEventListener('click', startGapFillExercise);
    testContent.querySelector('.finish-exercise-btn').addEventListener('click', closeTest);
}

function checkGapFillAnswer() {
    const inputs = document.querySelectorAll('.gap-input');
    const feedback = document.querySelector('.exercise-feedback');
    const checkBtn = document.querySelector('.check-answer-btn');
    const nextBtn = document.querySelector('.next-exercise-btn');
    const finishBtn = document.querySelector('.finish-exercise-btn');

    let allCorrect = true;
    inputs.forEach((input, index) => {
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = currentExercise.answers[index].toLowerCase();

        if (userAnswer === correctAnswer) {
            input.classList.add('correct');
            input.classList.remove('incorrect');
        } else {
            input.classList.add('incorrect');
            input.classList.remove('correct');
            allCorrect = false;
        }
    });

    if (allCorrect) {
        exerciseScore++;
        feedback.innerHTML = `<div class="success-message">✓ Correct! ${currentExercise.explanation}</div>`;
        feedback.className = 'exercise-feedback success';
        checkBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
        finishBtn.style.display = 'inline-block';
    } else {
        feedback.innerHTML = `<div class="error-message">✗ Not quite right. The correct answer is: ${currentExercise.answers.join(', ')}</div>`;
        feedback.className = 'exercise-feedback error';
    }

    feedback.style.display = 'block';
    document.querySelector('.exercise-score').textContent = `Score: ${exerciseScore}`;
}

// Word order exercise functions
function startWordOrderExercise() {
    // Clear any selected words since word order uses predefined exercises
    if (window.selectedTestWords) {
        window.selectedTestWords = [];
    }

    if (wordOrderExercises.length === 0) {
        alert('No word order exercises available.');
        return;
    }

    currentExerciseType = 'word-order';
    currentExercise = wordOrderExercises[Math.floor(Math.random() * wordOrderExercises.length)];
    exerciseScore = 0;

    // Shuffle the words for the exercise
    const shuffledWords = [...currentExercise.words].sort(() => Math.random() - 0.5);

    const testOverlay = document.querySelector('.test-overlay');
    testOverlay.classList.add('active');

    const testContent = testOverlay.querySelector('.test-content');
    testContent.innerHTML = `
        <button class="close-test">×</button>
        <h2>Word Order Exercise</h2>
        <p>Arrange the words to form a correct German sentence.</p>
        <div class="exercise-container">
            <div class="translation-text">Translation: ${currentExercise.translation}</div>
            <div class="word-bank">
                ${shuffledWords.map(word => `<div class="word-tile" data-word="${word}">${word}</div>`).join('')}
            </div>
            <div class="sentence-area" data-correct="${currentExercise.correctOrder.join(' ')}">
                <div class="sentence-placeholder">Drop words here to build the sentence...</div>
            </div>
            <button class="check-order-btn">Check Order</button>
            <div class="exercise-feedback" style="display: none;"></div>
        </div>
        <div class="exercise-progress">
            <span class="exercise-score">Score: ${exerciseScore}</span>
        </div>
        <div class="exercise-controls">
            <button class="next-exercise-btn" style="display: none;">Next Exercise</button>
            <button class="finish-exercise-btn" style="display: none;">Finish</button>
        </div>
    `;

    // Add drag and drop functionality
    initializeDragAndDrop();

    // Add event listeners
    testContent.querySelector('.close-test').addEventListener('click', closeTest);
    testContent.querySelector('.check-order-btn').addEventListener('click', checkWordOrder);
    testContent.querySelector('.next-exercise-btn').addEventListener('click', startWordOrderExercise);
    testContent.querySelector('.finish-exercise-btn').addEventListener('click', closeTest);
}

function initializeDragAndDrop() {
    const wordTiles = document.querySelectorAll('.word-tile');
    const sentenceArea = document.querySelector('.sentence-area');
    const sentencePlaceholder = document.querySelector('.sentence-placeholder');

    wordTiles.forEach(tile => {
        tile.draggable = true;
        tile.addEventListener('dragstart', handleDragStart);
    });

    sentenceArea.addEventListener('dragover', handleDragOver);
    sentenceArea.addEventListener('drop', handleDrop);

    // Allow clicking to move words
    wordTiles.forEach(tile => {
        tile.addEventListener('click', () => moveWordToSentence(tile));
    });

    sentenceArea.addEventListener('click', (e) => {
        if (e.target.classList.contains('placed-word')) {
            moveWordBack(e.target);
        }
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.word);
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const word = e.dataTransfer.getData('text/plain');
    const draggedElement = document.querySelector('.word-tile.dragging');

    if (draggedElement) {
        moveWordToSentence(draggedElement);
        draggedElement.classList.remove('dragging');
    }
}

function moveWordToSentence(wordTile) {
    const sentenceArea = document.querySelector('.sentence-area');
    const placeholder = sentenceArea.querySelector('.sentence-placeholder');

    // Create placed word element
    const placedWord = document.createElement('span');
    placedWord.className = 'placed-word';
    placedWord.textContent = wordTile.dataset.word;
    placedWord.dataset.word = wordTile.dataset.word;

    // Add to sentence area
    if (placeholder) {
        placeholder.remove();
    }
    sentenceArea.appendChild(placedWord);

    // Remove from word bank
    wordTile.remove();
}

function moveWordBack(placedWord) {
    const wordBank = document.querySelector('.word-bank');

    // Create word tile
    const wordTile = document.createElement('div');
    wordTile.className = 'word-tile';
    wordTile.draggable = true;
    wordTile.dataset.word = placedWord.dataset.word;
    wordTile.textContent = placedWord.dataset.word;

    // Add event listeners
    wordTile.addEventListener('dragstart', handleDragStart);
    wordTile.addEventListener('click', () => moveWordToSentence(wordTile));

    // Add back to word bank
    wordBank.appendChild(wordTile);

    // Remove from sentence area
    placedWord.remove();

    // Add placeholder back if no words left
    const sentenceArea = document.querySelector('.sentence-area');
    if (sentenceArea.children.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'sentence-placeholder';
        placeholder.textContent = 'Drop words here to build the sentence...';
        sentenceArea.appendChild(placeholder);
    }
}

function checkWordOrder() {
    const sentenceArea = document.querySelector('.sentence-area');
    const placedWords = sentenceArea.querySelectorAll('.placed-word');
    const feedback = document.querySelector('.exercise-feedback');
    const checkBtn = document.querySelector('.check-order-btn');
    const nextBtn = document.querySelector('.next-exercise-btn');
    const finishBtn = document.querySelector('.finish-exercise-btn');

    const userOrder = Array.from(placedWords).map(word => word.dataset.word);
    const correctOrder = currentExercise.correctOrder;

    const isCorrect = userOrder.length === correctOrder.length &&
                     userOrder.every((word, index) => word === correctOrder[index]);

    if (isCorrect) {
        exerciseScore++;
        placedWords.forEach(word => word.classList.add('correct'));

        // Create success message with audio and confirmation
        const germanSentence = currentExercise.correctOrder.join(' ');
        feedback.innerHTML = `
            <div class="success-message">
                ✓ Perfect! The sentence is correctly ordered.
                <div class="sentence-audio-section">
                    <button class="sentence-audio-btn" data-sentence="${germanSentence}">🔊 Listen to the sentence</button>
                    <div class="sentence-confirmation">Complete sentence: "${germanSentence}"</div>
                    <div class="russian-translation">Russian: ${currentExercise.translation}</div>
                </div>
            </div>
        `;
        feedback.className = 'exercise-feedback success';

        // Add audio button event listener
        const audioBtn = feedback.querySelector('.sentence-audio-btn');
        if (audioBtn) {
            audioBtn.addEventListener('click', function() {
                const sentence = this.getAttribute('data-sentence');
                speakSentence(sentence, this);
            });
        }

        checkBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
        finishBtn.style.display = 'inline-block';
    } else {
        placedWords.forEach(word => word.classList.add('incorrect'));
        feedback.innerHTML = `<div class="error-message">✗ Not quite right. The correct order is: ${correctOrder.join(' ')}</div>`;
        feedback.className = 'exercise-feedback error';
    }

    feedback.style.display = 'block';
    document.querySelector('.exercise-score').textContent = `Score: ${exerciseScore}`;
}

// Preposition exercise functions
function startPrepositionExercise() {
    // Clear any selected words since preposition uses predefined exercises
    if (window.selectedTestWords) {
        window.selectedTestWords = [];
    }

    if (prepositionExercises.length === 0) {
        alert('No preposition exercises available.');
        return;
    }

    currentExerciseType = 'preposition';
    currentExercise = prepositionExercises[Math.floor(Math.random() * prepositionExercises.length)];
    exerciseScore = 0;

    const testOverlay = document.querySelector('.test-overlay');
    testOverlay.classList.add('active');

    const testContent = testOverlay.querySelector('.test-content');
    testContent.innerHTML = `
        <button class="close-test">×</button>
        <h2>Preposition Exercise</h2>
        <p>Choose the correct preposition to complete the sentence.</p>
        <div class="exercise-container">
            <div class="exercise-text">
                ${currentExercise.sentence}
            </div>
            <div class="preposition-options">
                ${currentExercise.options.map(option => `<button class="preposition-option" data-option="${option}">${option}</button>`).join('')}
            </div>
            <div class="exercise-feedback" style="display: none;"></div>
        </div>
        <div class="exercise-progress">
            <span class="exercise-score">Score: ${exerciseScore}</span>
        </div>
        <div class="exercise-controls">
            <button class="next-exercise-btn" style="display: none;">Next Exercise</button>
            <button class="finish-exercise-btn" style="display: none;">Finish</button>
        </div>
    `;

    // Add event listeners
    testContent.querySelector('.close-test').addEventListener('click', closeTest);
    document.querySelectorAll('.preposition-option').forEach(btn => {
        btn.addEventListener('click', selectPreposition);
    });
    testContent.querySelector('.next-exercise-btn').addEventListener('click', startPrepositionExercise);
    testContent.querySelector('.finish-exercise-btn').addEventListener('click', closeTest);
}

function selectPreposition(e) {
    const selectedOption = e.target.dataset.option;
    const feedback = document.querySelector('.exercise-feedback');
    const nextBtn = document.querySelector('.next-exercise-btn');
    const finishBtn = document.querySelector('.finish-exercise-btn');
    const options = document.querySelectorAll('.preposition-option');

    // Disable all options
    options.forEach(opt => opt.disabled = true);

    if (selectedOption === currentExercise.correctAnswer) {
        exerciseScore++;
        e.target.classList.add('correct');
        feedback.innerHTML = `<div class="success-message">✓ Correct! ${currentExercise.explanation}</div>`;
        feedback.className = 'exercise-feedback success';
    } else {
        e.target.classList.add('incorrect');
        // Highlight correct answer
        options.forEach(opt => {
            if (opt.dataset.option === currentExercise.correctAnswer) {
                opt.classList.add('correct');
            }
        });
        feedback.innerHTML = `<div class="error-message">✗ Incorrect. The correct preposition is "${currentExercise.correctAnswer}". ${currentExercise.explanation}</div>`;
        feedback.className = 'exercise-feedback error';
    }

    feedback.style.display = 'block';
    nextBtn.style.display = 'inline-block';
    finishBtn.style.display = 'inline-block';
    document.querySelector('.exercise-score').textContent = `Score: ${exerciseScore}`;
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

// Start the app
document.addEventListener('DOMContentLoaded', async function() {
    await loadVocabulary();
    await initializeExercises();
    initializeHeaderButtons();
});
