// Email Writing Script - Separate functionality for email writing tips
let emailTipsData = {};
let emailTipsSections = {};
let germanVoice = null;
let voicesLoaded = false;

// Load email writing tips and initialize
async function loadEmailWritingTips() {
    try {
        // Initialize speech synthesis voices
        initializeVoices();
        if ('speechSynthesis' in window && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = initializeVoices;
        }

        const response = await fetch('./email-writing.txt');
        const text = await response.text();
        parseEmailWritingTips(text);
        generateEmailWritingCards();
        initializeEmailWritingCards();
    } catch (error) {
        console.error('Error loading email writing tips:', error);
    }
}

function parseEmailWritingTips(text) {
    const lines = text.split('\n');
    let currentSection = '';

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#')) {
            if (line.includes('# ')) {
                currentSection = line.replace('# ', '').toLowerCase().replace(/\s+/g, '-');
                emailTipsSections[currentSection] = [];
            }
        } else if (line && !line.startsWith('//') && line.includes('|')) {
            const parts = line.split('|');
            if (parts.length >= 4) {
                const russian = parts[0].trim();
                const german = parts[1].trim();
                const english = parts[2].trim();
                let examples = [];
                for (let i = 4; i < parts.length; i += 2) {
                    if (parts[i] && parts[i+1]) {
                        examples.push({
                            german: parts[i].trim().replace(/\.$/, '') + '.',
                            russian: parts[i+1].trim().replace(/\.$/, '') + '.'
                        });
                    }
                }
                emailTipsSections[currentSection].push({
                    russian,
                    german,
                    english,
                    examples
                });
            }
        }
    }
}

function generateEmailWritingCards() {
    const container = document.querySelector('.email-cards');
    if (!container) {
        console.error('Email cards container not found');
        return;
    }
    container.innerHTML = '';

    Object.keys(emailTipsSections).forEach(sectionKey => {
        const sectionName = sectionKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const sectionData = emailTipsSections[sectionKey];

        let sectionHtml = `
            <div class="email-section">
                <h3>${sectionName}</h3>
                <div class="email-tips-grid">
        `;

        sectionData.forEach((tip, index) => {
            sectionHtml += `
                    <div class="email-tip-card" data-section="${sectionKey}" data-index="${index}">
                        <div class="card-inner">
                            <div class="card-front">
                                <h4>${tip.russian}</h4>
                                <p>${tip.german}</p>
                                ${tip.examples && tip.examples.length > 0 ? '<button class="examples-btn" data-tip-index="' + index + '">📚 Examples</button>' : ''}
                            </div>
                            <div class="card-back">
                                <h4>${tip.russian}</h4>
                                <p>${tip.german}</p>
                                ${tip.examples && tip.examples.length > 0 ? '<button class="examples-btn" data-tip-index="' + index + '">📚 Examples</button>' : ''}
                            </div>
                        </div>
            `;



            sectionHtml += `
                    </div>
            `;
        });

        sectionHtml += `
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', sectionHtml);
    });
}

function initializeEmailWritingCards() {
    const emailCards = document.querySelectorAll('.email-tip-card');
    emailCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Prevent flip if clicking on examples button
            if (e.target.closest('.examples-btn')) return;
            
        });
    });

    // Initialize examples buttons
    const examplesBtns = document.querySelectorAll('.examples-btn');
    examplesBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const tipIndex = this.getAttribute('data-tip-index');
            const sectionKey = this.closest('.email-tip-card').getAttribute('data-section');
            const tip = emailTipsSections[sectionKey][parseInt(tipIndex)];
            showExamplesModal(tip);
        });
    });

    // Back button functionality
    const backBtn = document.querySelector('.back-to-vocab-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
}

function showExamplesModal(tip) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'examples-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h3>Examples for: ${tip.russian}</h3>
            <div class="examples-list">
                ${tip.examples.map(example => `
                    <div class="example-item">
                        <div class="example-card">
                            <div class="card-inner">
                                <div class="card-front">
                                    <div class="russian-text">${example.russian}</div>
                                    <button class="speak-btn" data-text="${example.german.replace(/[.,]$/, '')}">🔊</button>
                                </div>
                                <div class="card-back">
                                    <div class="german-text">${example.german}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Initialize example cards in modal
    const exampleCards = modal.querySelectorAll('.example-card');
    exampleCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('flipped');
        });
    });

    // Add speak functionality
    const speakBtns = modal.querySelectorAll('.speak-btn');
    speakBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            speakText(this.getAttribute('data-text'));
        });
    });
}

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
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 0.9;
        if (germanVoice) {
            utterance.voice = germanVoice;
            utterance.lang = germanVoice.lang;
        }
        speechSynthesis.speak(utterance);
    } else {
        alert('Speech synthesis not supported in this browser.');
    }
}

// Expose function globally for dynamic loading
window.loadEmailWritingTips = loadEmailWritingTips;

// Initialize email writing when the script loads (for standalone use)
document.addEventListener('DOMContentLoaded', loadEmailWritingTips);
