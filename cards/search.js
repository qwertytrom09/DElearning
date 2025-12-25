// Search and filter variables
let currentSearchTerm = '';
let currentDifficultyFilter = 'all';
let currentTagFilter = 'all';
let allCardsData = [];

// Search and filter functions
function initializeSearchAndFilters() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const tagFilter = document.getElementById('tag-filter');

    // Check if vocabulary data is loaded
    if (!window.vocabularyData) {
        console.warn('Vocabulary data not loaded yet, retrying in 100ms...');
        setTimeout(initializeSearchAndFilters, 100);
        return;
    }

    // Initialize allCardsData
    allCardsData = [];
    Object.keys(window.vocabularyData).forEach(topic => {
        window.vocabularyData[topic].forEach((word, index) => {
            allCardsData.push({
                ...word,
                topic: topic,
                originalIndex: index
            });
        });
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentSearchTerm = this.value.toLowerCase().trim();
            applyFilters();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            currentSearchTerm = '';
            applyFilters();
        });
    }

    // Filter functionality
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', function() {
            currentDifficultyFilter = this.value;
            applyFilters();
        });
    }

    if (tagFilter) {
        tagFilter.addEventListener('change', function() {
            currentTagFilter = this.value;
            applyFilters();
        });
    }
}

function applyFilters() {
    let filteredCards = [...allCardsData];

    // Apply search filter
    if (currentSearchTerm) {
        filteredCards = filteredCards.filter(card =>
            card.russian.toLowerCase().includes(currentSearchTerm) ||
            card.german.toLowerCase().includes(currentSearchTerm) ||
            card.english.toLowerCase().includes(currentSearchTerm)
        );
    }

    // Apply difficulty filter
    if (currentDifficultyFilter !== 'all') {
        filteredCards = filteredCards.filter(card => card.difficulty === currentDifficultyFilter);
    }

    // Apply tag filter
    if (currentTagFilter !== 'all') {
        filteredCards = filteredCards.filter(card => card.tags.includes(currentTagFilter));
    }

    // Update display
    updateFilteredCards(filteredCards);
}

function updateFilteredCards(filteredCards) {
    // Clear all topic containers
    document.querySelectorAll('.cards-container').forEach(container => {
        const existingCards = container.querySelectorAll('.card');
        existingCards.forEach(card => card.remove());
        const noResults = container.querySelector('.no-results');
        if (noResults) noResults.remove();
        container.classList.remove('active');
    });

    if (filteredCards.length === 0) {
        // Show no results message in active container
        const activeContainer = document.querySelector('.cards-container.active');
        if (activeContainer) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = '<p>No words match your search criteria.</p>';
            activeContainer.insertBefore(noResults, activeContainer.querySelector('.pagination-controls'));
            activeContainer.classList.add('active');
        }
        return;
    }

    // Group by topic
    const groupedByTopic = {};
    filteredCards.forEach(card => {
        if (!groupedByTopic[card.topic]) {
            groupedByTopic[card.topic] = [];
        }
        groupedByTopic[card.topic].push(card);
    });

    if (currentSearchTerm) {
        // When searching, show all topics that have results
        Object.keys(groupedByTopic).forEach(topic => {
            const container = document.querySelector(`.topic-${topic}`);
            if (container && groupedByTopic[topic].length > 0) {
                const fragment = document.createDocumentFragment();
                groupedByTopic[topic].forEach(word => {
                    const card = createCardElement(word, topic);
                    fragment.appendChild(card);
                });
                const pagination = container.querySelector('.pagination-controls');
                container.insertBefore(fragment, pagination);
                container.classList.add('active');

                // Reinitialize card functionality
                initializeCardsForContainer(container);
                initializeAudioButtonsForContainer(container);
                initializeExamplesButtonsForContainer(container);
                initializeArrowButtonsForContainer(container);
                hideDictionaryWords();
            }
        });
    } else {
        // Normal topic view
        const activeTopic = document.querySelector('.topic-btn.active').getAttribute('data-topic');
        const activeContainer = document.querySelector(`.topic-${activeTopic}`);

        if (activeContainer && groupedByTopic[activeTopic]) {
            const fragment = document.createDocumentFragment();
            groupedByTopic[activeTopic].forEach(word => {
                const card = createCardElement(word, activeTopic);
                fragment.appendChild(card);
            });
            const pagination = activeContainer.querySelector('.pagination-controls');
            activeContainer.insertBefore(fragment, pagination);
            activeContainer.classList.add('active');

            // Reinitialize card functionality
            initializeCardsForContainer(activeContainer);
            initializeAudioButtonsForContainer(activeContainer);
            initializeExamplesButtonsForContainer(activeContainer);
            initializeArrowButtonsForContainer(activeContainer);
            hideDictionaryWords();
        }
    }
}
