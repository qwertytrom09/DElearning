// Global variables for cards
let currentPages = {
    environment: 1,
    society: 1,
    culture: 1,
    technology: 1,
    politics: 1,
    food: 1,
    travel: 1,
    health: 1,
    business: 1,
    education: 1,
    arts: 1
};
const PAGE_SIZE = 12;

function generateCards() {
    const topics = window.vocabularyData;
    const topicClassMap = {
        'environment': 'topic-environment',
        'society': 'topic-society',
        'culture': 'topic-culture',
        'technology': 'topic-technology',
        'politics': 'topic-politics',
        'food': 'topic-food',
        'travel': 'topic-travel',
        'health': 'topic-health',
        'business': 'topic-business',
        'education': 'topic-education',
        'arts': 'topic-arts'
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
            'politics': 'Politik',
            'food': 'Essen & Kochen',
            'travel': 'Reisen & Verkehr',
            'health': 'Gesundheit & Medizin',
            'business': 'Geschäft & Finanzen',
            'education': 'Bildung & Wissenschaft',
            'arts': 'Kunst & Literatur'
        }[topic];
        if (btn) {
            btn.textContent = `${baseText} (${currentPages[topic]}/${totalPages})`;
        }
    });
}

function initializeCardsForContainer(container) {
    const cards = container.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', function(event) {
            // Don't flip if clicking on a button
            if (event.target.tagName === 'BUTTON') return;
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
            const german = card.querySelector('.card-back h2').textContent.split('\n')[0].trim();
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
