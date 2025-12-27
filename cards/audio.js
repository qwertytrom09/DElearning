// Global variables for audio
let speechQueue = [];
let isSpeaking = false;

// Initialize speech synthesis voices
function initializeVoices() {
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        window.germanVoice = voices.find(voice => voice.lang === 'de-DE' && voice.localService);
        if (!window.germanVoice) {
            window.germanVoice = voices.find(voice => voice.lang.startsWith('de'));
        }
        if (!window.germanVoice) {
            window.germanVoice = voices.find(voice =>
                voice.name.toLowerCase().includes('german') ||
                voice.name.toLowerCase().includes('deutsch') ||
                voice.name.toLowerCase().includes('deutsche')
            );
        }
        window.voicesLoaded = true;
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

    if (window.germanVoice) {
        utterance.voice = window.germanVoice;
        utterance.lang = window.germanVoice.lang;
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
    if (!word || !window.examplesData[word]) return;
    showExamplesModal(word, window.examplesData[word]);
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
