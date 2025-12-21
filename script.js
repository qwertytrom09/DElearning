// Global variables
let examplesData = {};
let germanVoice = null;
let voicesLoaded = false;
let dictionary = [];

// Load vocabulary and initialize
async function loadVocabulary() {
    try {
        const response = await fetch('vocabulary.txt');
        const text = await response.text();
        parseVocabulary(text);
        generateCards();
        initializeApp();
    } catch (error) {
        console.error('Error loading vocabulary:', error);
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
                topics[currentTopic] = [];
            }
        } else if (line && !line.startsWith('//') && line.includes('|')) {
            const parts = line.split('|');
            if (parts.length >= 4) {
                const russian = parts[0].trim();
                const german = parts[1].trim();
                const english = parts[2].trim();
                const plural = parts[3].trim();
                let examples = [];
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

    // Generate examplesData
    Object.keys(topics).forEach(topic => {
        topics[topic].forEach(word => {
            examplesData[word.russian] = word.examples;
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
        let html = `<div class="cards-container ${className}${active}">\n`;

        topics[topic].forEach(word => {
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
            html += `        <div class="card ${articleClass}" data-word-id="${wordId}">
            <div class="card-inner">
                <div class="card-front">
                    <h2>${word.russian}</h2>
                    <button class="arrow-btn" data-word-id="${wordId}" aria-label="Add to dictionary">→</button>
                </div>
                <div class="card-back">
                    <h2>${word.german}${pluralHtml}</h2>
                    <p>${word.english}</p>
                    <button class="audio-btn" data-word="${word.german}" aria-label="Pronounce ${word.german}">🔊</button>
                    <button class="examples-btn" data-word="${word.russian}" aria-label="Show examples">📝</button>
                </div>
            </div>
        </div>\n`;
        });

        html += '    </div>';

        // Insert into DOM
        const container = document.querySelector(`.${className}`);
        if (container) {
            container.outerHTML = html;
        }
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
        const dateAdded = new Date().toLocaleDateString('de-DE');
        dictionary.push({ wordId, ...wordData, dateAdded });
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

function updateDictionaryDisplay() {
    const dictionaryCards = document.querySelector('.dictionary-cards');
    dictionaryCards.innerHTML = '';

    if (dictionary.length === 0) {
        dictionaryCards.innerHTML = '<p>No words in dictionary yet.</p>';
        return;
    }

    dictionary.forEach(item => {
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
        const cardHtml = `
            <div class="card ${articleClass}" data-word-id="${item.wordId}">
                <div class="card-inner">
                    <div class="card-front">
                        <h2>${item.russian}</h2>
                        <button class="remove-btn" data-word-id="${item.wordId}">✕</button>
                    </div>
                    <div class="card-back">
                        <h2>${item.german}${pluralHtml}</h2>
                        <p>${item.english}</p>
                        <button class="audio-btn" data-word="${item.german}" aria-label="Pronounce ${item.german}">🔊</button>
                        <button class="examples-btn" data-word="${item.russian}" aria-label="Show examples">📝</button>
                    </div>
                </div>
            </div>
        `;
        dictionaryCards.insertAdjacentHTML('beforeend', cardHtml);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.dictionary-cards .remove-btn').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            const wordId = this.getAttribute('data-word-id');
            removeFromDictionary(wordId);
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

function initializeApp() {
    const topicButtons = document.querySelectorAll('.topic-btn');
    const cardContainers = document.querySelectorAll('.cards-container');

    // Initialize speech synthesis voices
    function initializeVoices() {
        if ('speechSynthesis' in window) {
            let voices = speechSynthesis.getVoices();
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
            if (germanVoice) {
                console.log('German voice loaded:', germanVoice.name);
            } else {
                console.log('No German voice found, will use fallback');
            }
        }
    }

    initializeVoices();
    if ('speechSynthesis' in window && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = initializeVoices;
    }

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
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'de-DE';
            utterance.rate = 0.75;
            utterance.pitch = 1.2;
            utterance.volume = 0.8;
            if (germanVoice) {
                utterance.voice = germanVoice;
                utterance.lang = germanVoice.lang;
            }
            button.classList.add('playing');
            button.textContent = '🔊';
            utterance.onstart = () => button.classList.add('speaking');
            utterance.onend = () => {
                button.classList.remove('playing', 'speaking');
                button.textContent = '🔊';
            };
            utterance.onerror = () => {
                button.classList.remove('playing', 'speaking');
                button.textContent = '❌';
                setTimeout(() => button.textContent = '🔊', 1500);
            };
            // Make the flash go away after half a second
            setTimeout(() => {
                button.classList.remove('playing');
            }, 500);
            setTimeout(() => speechSynthesis.speak(utterance), 100);
        } else {
            showPronunciationGuide(button, word);
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
        examples.forEach(example => {
            const exampleItem = document.createElement('div');
            exampleItem.className = 'example-item';
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

    function speakSentence(sentence, button) {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.lang = 'de-DE';
            utterance.rate = 0.8;
            utterance.pitch = 1.1;
            utterance.volume = 0.9;
            if (germanVoice) {
                utterance.voice = germanVoice;
                utterance.lang = germanVoice.lang;
            }
            button.classList.add('playing');
            button.textContent = '🔊';
            utterance.onstart = () => button.classList.add('speaking');
            utterance.onend = () => {
                button.classList.remove('playing', 'speaking');
                button.textContent = '🔊';
            };
            utterance.onerror = () => {
                button.classList.remove('playing', 'speaking');
                button.textContent = '❌';
                setTimeout(() => button.textContent = '🔊', 1500);
            };
            // Make the flash go away after half a second
            setTimeout(() => {
                button.classList.remove('playing');
            }, 500);
            setTimeout(() => speechSynthesis.speak(utterance), 100);
        } else {
            button.textContent = '❌';
            setTimeout(() => button.textContent = '🔊', 1500);
        }
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
        // Shuffle dictionary words each time it opens
        dictionary.sort(() => Math.random() - 0.5);
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

    // Test functionality
    let selectedRussianWord = null;
    let testWords = [];
    let correctMatches = 0;
    let mistakeCount = 0;

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
                console.log('Perfect score! Showing complete button');
            } else {
                completeBtn.style.display = 'none';
                restartBtn.style.display = 'block';
                console.log('Mistakes made, showing restart button. Mistakes:', mistakeCount);
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
