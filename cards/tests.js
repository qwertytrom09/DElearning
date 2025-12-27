// Global variables for tests

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
