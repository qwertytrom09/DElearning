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
let currentPages = {
    environment: 1,
    society: 1,
    culture: 1,
    technology: 1,
    politics: 1
};
const PAGE_SIZE = 21;

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
                let examples = [];

                // Parse examples (pairs of German|Russian)
                for (let i = 4; i < parts.length; i += 2) {
                    if (parts[i] && parts[i+1]) {
                        examples.push({
                            german: parts[i].trim().replace(/\.$/, '') + '.',
                            russian: parts[i+1].trim().replace(/\.$/, '') + '.'
                        });
                    }
                }

                topics[currentTopic].push({
                    russian,
                    german,
                    english,
                    plural,
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
        card.addEventListener('click', function() {
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
            const german = card.querySelector('.card-back h2').textContent.split('<br>')[0];
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
        dictionary.push({ wordId, ...wordData, dateAdded });
        sortDictionaryByDate();
        saveDictionary();
        updateDictionaryDisplay();
        hideDictionaryWords();
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

    // Use dictionary words if available, otherwise use current topic vocabulary
    let availableWords = [];
    if (dictionary.length > 0) {
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
        wordElement.textContent = word.russian;
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
    const testOverlay = document.querySelector('.test-overlay');
    testOverlay.classList.remove('active');
    selectedRussianWord = null;
    testWords = [];
    correctMatches = 0;
    mistakeCount = 0;
}

function updateDictionaryDisplay() {
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
}

function startSelectedTest() {
    const testOverlay = document.querySelector('.test-overlay');
    testOverlay.classList.add('active');

    // Filter dictionary words by selected dates
    let availableWords = dictionary.filter(item => selectedDates.has(item.dateAdded)).map(item => ({
        russian: item.russian,
        german: item.german,
        english: item.english,
        plural: item.plural
    }));

    if (availableWords.length === 0) {
        alert('No words selected for testing.');
        testOverlay.classList.remove('active');
        return;
    }

    // Use the filtered words for the test
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
        wordElement.textContent = word.russian;
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

function initializeApp() {
    const topicButtons = document.querySelectorAll('.topic-btn');
    const cardContainers = document.querySelectorAll('.cards-container');

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
            card.addEventListener('click', function() {
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

    function handleAudioClick(event) {
        event.stopPropagation();
        const button = event.target;
        const word = button.getAttribute('data-word');
        if (!word) return;
        speakWord(word, button);
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

    // Examples functionality
    function initializeExamplesButtons() {
        const examplesButtons = document.querySelectorAll('.cards-container.active .examples-btn');
        examplesButtons.forEach(button => {
            button.addEventListener('click', handleExamplesClick);
        });
    }

    function handleExamplesClick(event) {
        event.stopPropagation();
        const button = event.target;
        const word = button.getAttribute('data-word');
        if (!word || !examplesData[word]) return;
        showExamplesModal(word, examplesData[word]);
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
    }



    initializeAudioButtons();
    initializeExamplesButtons();

    // Dictionary cards functionality
    function initializeDictionaryCards() {
        const cards = document.querySelectorAll('.dictionary-cards .card');
        cards.forEach(card => {
            card.addEventListener('click', function() {
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

    burgerMenu.addEventListener('click', function(event) {
        event.stopPropagation();
        menuDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!menuDropdown.contains(event.target) && !burgerMenu.contains(event.target)) {
            menuDropdown.classList.remove('active');
        }
    });

    dictionaryBtn.addEventListener('click', function() {
        menuDropdown.classList.remove('active');
        // Sort dictionary words by date added (oldest first)
        sortDictionaryByDate();
        updateDictionaryDisplay();
        dictionaryOverlay.classList.add('active');
        initializeDictionaryCards();
    });

    closeDictionary.addEventListener('click', function() {
        dictionaryOverlay.classList.remove('active');
        // Reset all cards to show Russian (front) side when exiting dictionary
        document.querySelectorAll('.card.flipped').forEach(card => card.classList.remove('flipped'));
    });

    dictionaryOverlay.addEventListener('click', function(event) {
        if (event.target === dictionaryOverlay) {
            dictionaryOverlay.classList.remove('active');
            // Reset all cards to show Russian (front) side when exiting dictionary
            document.querySelectorAll('.card.flipped').forEach(card => card.classList.remove('flipped'));
        }
    });

    // Arrow button functionality
    function initializeArrowButtons() {
        const arrowButtons = document.querySelectorAll('.arrow-btn');
        arrowButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                const wordId = this.getAttribute('data-word-id');
                const card = this.closest('.card');
                const russian = card.querySelector('.card-front h2').textContent;
                const german = card.querySelector('.card-back h2').textContent.split('<br>')[0];
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
    const testBtn = document.querySelector('#test-btn');
    const closeTestBtn = document.querySelector('.close-test');
    const completeTestBtn = document.querySelector('.complete-test');
    const restartTestBtn = document.querySelector('.restart-test');

    testBtn.addEventListener('click', function() {
        document.querySelector('.menu-dropdown').classList.remove('active');
        startTest();
    });

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

            if (action === 'schreiben') {
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

function showEmailWritingTips() {
    // Navigate to the standalone email writing page
    window.location.href = 'email-writing.html';
}

// Start the app
document.addEventListener('DOMContentLoaded', function() {
    loadVocabulary();
    initializeHeaderButtons();
});
