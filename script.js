// Global variables
let examplesData = {};
let germanVoice = null;
let voicesLoaded = false;

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
                const examples = parts.slice(4).filter(e => e.trim()).map(e => e.trim().replace(/\.$/, '') + '.');
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
            examplesData[word.russian] = word.examples.map(example => ({
                german: example,
                russian: word.russian
            }));
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
            html += `        <div class="card">
            <div class="card-inner">
                <div class="card-front">
                    <h2>${word.russian}</h2>
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
            setTimeout(() => speechSynthesis.speak(utterance), 100);
        } else {
            button.textContent = '❌';
            setTimeout(() => button.textContent = '🔊', 1500);
        }
    }

    initializeAudioButtons();
    initializeExamplesButtons();
}

// Start the app
document.addEventListener('DOMContentLoaded', loadVocabulary);
