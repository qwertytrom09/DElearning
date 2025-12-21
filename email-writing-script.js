// Email Writing Script - Separate functionality for email writing tips
let emailTipsData = {};
let emailTipsSections = {};
let germanVoice = null;
let voicesLoaded = false;

// Load email writing tips and initialize
async function loadEmailWritingTips() {
    console.log('loadEmailWritingTips called');
    try {
        // Initialize speech synthesis voices
        initializeVoices();
        if ('speechSynthesis' in window && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = initializeVoices;
        }

        console.log('Fetching email-writing.txt...');
        const response = await fetch('./email-writing.txt');
        const text = await response.text();
        console.log('Email writing text loaded, length:', text.length);
        parseEmailWritingTips(text);
        console.log('Parsed email tips sections:', Object.keys(emailTipsSections));
        generateEmailWritingCards();
        initializeEmailWritingCards();
        console.log('Email writing cards initialized');
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

    console.log('Generating cards for sections:', Object.keys(emailTipsSections));

    Object.keys(emailTipsSections).forEach(sectionKey => {
        const sectionName = sectionKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const sectionData = emailTipsSections[sectionKey];
        console.log(`Section ${sectionKey}: ${sectionData.length} cards`);

        let sectionHtml = `
            <div class="email-section">
                <h3>${sectionName}</h3>
                <div class="email-tips-grid">
        `;

        sectionData.forEach((tip, index) => {
            sectionHtml += `
                    <div class="email-tip-card" data-section="${sectionKey}" data-index="${index}">
                        <div class="card-front">
                            <h4>${tip.russian}</h4>
                            <p>${tip.german}</p>
                        </div>
                        <div class="card-back">
                            <h4>${tip.russian}</h4>
                            <p>${tip.german}</p>
            `;

            if (tip.examples && tip.examples.length > 0) {
                sectionHtml += '<div class="examples-section"><h5>Examples:</h5>';
                tip.examples.forEach(example => {
                    sectionHtml += `
                        <div class="example-item">
                            <div class="russian">${example.russian}</div>
                            <div class="german">${example.german}</div>
                        </div>
                    `;
                });
                sectionHtml += '</div>';
            }

            sectionHtml += `
                        </div>
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
        card.addEventListener('click', function() {
            const sectionKey = this.getAttribute('data-section');
            const index = parseInt(this.getAttribute('data-index'));
            const tip = emailTipsSections[sectionKey][index];
            if (tip.examples && tip.examples.length > 0) {
                showExamplesModal(tip);
            }
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
                        <div class="russian">${example.russian}</div>
                        <div class="german">${example.german} <button class="speak-btn" data-text="${example.german.replace(/[.,]$/, '')}">🔊</button></div>
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

    // Add speak functionality
    modal.querySelectorAll('.speak-btn').forEach(btn => {
        btn.addEventListener('click', function() {
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
        if (germanVoice) {
            console.log('German voice loaded for email writing:', germanVoice.name);
        } else {
            console.log('No German voice found for email writing, will use fallback');
        }
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
