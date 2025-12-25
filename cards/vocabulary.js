// Global variables for vocabulary
let examplesData = {};

// Temporary UI functions (will be replaced by ui.js)
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
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        showErrorMessage('Failed to load vocabulary. Please refresh the page.');
        hideLoadingState();
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
                // Handle topics with "&" by taking only the first part
                if (currentTopic.includes('&')) {
                    currentTopic = currentTopic.split('&')[0].trim();
                }
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
