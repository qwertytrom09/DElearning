// Global variables for exercises
let wordOrderExercises = [];
let prepositionExercises = [];

// Current exercise state
let currentExerciseType = null;
let currentExercise = null;
let exerciseScore = 0;

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
