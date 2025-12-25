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
    let currentSubsection = '';
    let currentSubsubsection = '';

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('### ')) {
            // Sub-subheading
            currentSubsubsection = line.replace('### ', '').toLowerCase().replace(/\s+/g, '-');
            if (!emailTipsSections[currentSection]) {
                emailTipsSections[currentSection] = {};
            }
            if (!emailTipsSections[currentSection][currentSubsection]) {
                emailTipsSections[currentSection][currentSubsection] = {};
            }
            if (!emailTipsSections[currentSection][currentSubsection][currentSubsubsection]) {
                emailTipsSections[currentSection][currentSubsection][currentSubsubsection] = [];
            }
        } else if (line.startsWith('## ')) {
            // Subheading
            currentSubsection = line.replace('## ', '').toLowerCase().replace(/\s+/g, '-');
            currentSubsubsection = '';
            if (!emailTipsSections[currentSection]) {
                emailTipsSections[currentSection] = {};
            }
            if (!emailTipsSections[currentSection][currentSubsection]) {
                emailTipsSections[currentSection][currentSubsection] = {};
            }
            // Also create a default subsubsection for items without subsubsections
            if (!emailTipsSections[currentSection][currentSubsection]['']) {
                emailTipsSections[currentSection][currentSubsection][''] = [];
            }
        } else if (line.startsWith('# ')) {
            // Main heading
            currentSection = line.replace('# ', '').toLowerCase().replace(/\s+/g, '-');
            currentSubsection = '';
            currentSubsubsection = '';
            if (!emailTipsSections[currentSection]) {
                emailTipsSections[currentSection] = {};
            }
            // Also create a default subsection for items without subsections
            if (!emailTipsSections[currentSection]['']) {
                emailTipsSections[currentSection][''] = [];
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

                // Add to current subsubsection, subsection, or main section
                if (currentSubsubsection && emailTipsSections[currentSection] &&
                    emailTipsSections[currentSection][currentSubsection] &&
                    emailTipsSections[currentSection][currentSubsection][currentSubsubsection]) {
                    emailTipsSections[currentSection][currentSubsection][currentSubsubsection].push({
                        russian,
                        german,
                        english,
                        examples
                    });
                } else if (currentSubsection && emailTipsSections[currentSection] &&
                          emailTipsSections[currentSection][currentSubsection] &&
                          emailTipsSections[currentSection][currentSubsection]['']) {
                    // Add to current subsection if no subsubsection
                    emailTipsSections[currentSection][currentSubsection][''].push({
                        russian,
                        german,
                        english,
                        examples
                    });
                } else if (emailTipsSections[currentSection] && emailTipsSections[currentSection]['']) {
                    // Add to main section if no subsection
                    emailTipsSections[currentSection][''].push({
                        russian,
                        german,
                        english,
                        examples
                    });
                }
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
        `;

        // Handle subsections
        Object.keys(sectionData).forEach(subsectionKey => {
            const subsectionData = sectionData[subsectionKey];

            // Check if subsectionData is an array (old structure) or object (new structure)
            if (Array.isArray(subsectionData)) {
                // Old structure: subsectionData is an array of tips
                if (subsectionData.length > 0) {
                    // Create a subsection container
                    sectionHtml += `<div class="subsection-container">`;

                    // Add subsection heading if it's not empty
                    if (subsectionKey !== '') {
                        const subsectionName = subsectionKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        sectionHtml += `<h4 class="subsection-heading">${subsectionName}</h4>`;
                    }

                    sectionHtml += `<div class="email-tips-grid">`;

                    subsectionData.forEach((tip, index) => {
                        const uniqueIndex = subsectionKey ? `${subsectionKey}-${index}` : index;
                        sectionHtml += `
                            <div class="email-tip-card" data-section="${sectionKey}" data-subsection="${subsectionKey}" data-subsubsection="" data-index="${index}">
                                <div class="card-inner">
                                    <div class="card-front">
                                        <h4>${tip.russian}</h4>
                                        <p>${tip.german}</p>
                                    </div>
                                    <div class="card-back">
                                        <h4>${tip.russian}</h4>
                                        <p>${tip.german}</p>
                                    </div>
                                </div>
                            </div>
                        `;
                    });

                    sectionHtml += `</div></div>`; // Close subsection-container
                }
            } else if (typeof subsectionData === 'object') {
                // New structure: subsectionData is an object with subsubsections
                if (subsectionKey !== '') {
                    const subsectionName = subsectionKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    sectionHtml += `<div class="subsection-container"><h4 class="subsection-heading">${subsectionName}</h4>`;
                } else {
                    sectionHtml += `<div class="subsection-container">`;
                }

                // Handle subsubsections
                Object.keys(subsectionData).forEach(subsubsectionKey => {
                    const subsubsectionData = subsectionData[subsubsectionKey];

                    if (Array.isArray(subsubsectionData) && subsubsectionData.length > 0) {
                        // Add subsubsection heading if it's not empty
                        if (subsubsectionKey !== '') {
                            const subsubsectionName = subsubsectionKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            sectionHtml += `<h5 class="subsubsection-heading">${subsubsectionName}</h5>`;
                        }

                        sectionHtml += `<div class="email-tips-grid">`;

                        subsubsectionData.forEach((tip, index) => {
                            const uniqueIndex = subsubsectionKey ? `${subsubsectionKey}-${index}` : index;
                            sectionHtml += `
                                <div class="email-tip-card" data-section="${sectionKey}" data-subsection="${subsectionKey}" data-subsubsection="${subsubsectionKey}" data-index="${index}">
                                    <div class="card-inner">
                                        <div class="card-front">
                                            <h4>${tip.russian}</h4>
                                            <p>${tip.german}</p>
                                        </div>
                                        <div class="card-back">
                                            <h4>${tip.russian}</h4>
                                            <p>${tip.german}</p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });

                        sectionHtml += `</div>`;
                    }
                });

                sectionHtml += `</div>`; // Close subsection-container
            }
        });

        sectionHtml += `</div>`;

        container.insertAdjacentHTML('beforeend', sectionHtml);
    });
}

function initializeEmailWritingCards() {
    const emailCards = document.querySelectorAll('.email-tip-card');
    emailCards.forEach(card => {
        card.addEventListener('click', function(e) {
            const tipIndex = this.getAttribute('data-index');
            const sectionKey = this.getAttribute('data-section');
            const subsectionKey = this.getAttribute('data-subsection') || '';
            const subsubsectionKey = this.getAttribute('data-subsubsection') || '';

            let tip;
            if (subsubsectionKey && emailTipsSections[sectionKey] &&
                emailTipsSections[sectionKey][subsectionKey] &&
                emailTipsSections[sectionKey][subsectionKey][subsubsectionKey]) {
                // Three-level structure
                tip = emailTipsSections[sectionKey][subsectionKey][subsubsectionKey][parseInt(tipIndex)];
            } else if (emailTipsSections[sectionKey] && emailTipsSections[sectionKey][subsectionKey]) {
                // Two-level structure
                tip = emailTipsSections[sectionKey][subsectionKey][parseInt(tipIndex)];
            } else {
                // Fallback
                tip = emailTipsSections[sectionKey][''][parseInt(tipIndex)];
            }

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
