// Store all songs and current display state
let currentSortField = 'title';
let currentSortDirection = 'asc';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
let currentView = 'search'; // Default view
let currentDisplayedSongs = [];
let currentDisc = null;
let allSongs = {};
let activeSongs = [];

// DOM elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const sortByTitleBtn = document.getElementById('sortByTitle');
const sortByArtistBtn = document.getElementById('sortByArtist');
const songListElement = document.getElementById('songList');
const songListContainer = document.getElementById('songListContainer');
const searchTypeRadios = document.getElementsByName('searchType');
const resultsCountElement = document.getElementById('resultsCount');
const themeToggleBtn = document.getElementById('themeToggle');
const navItems = document.querySelectorAll('.nav-item');
const discSelectorBtn = document.getElementById('discSelectorBtn');
const discDropdown = document.getElementById('discDropdown');
const currentDiscName = document.getElementById('currentDiscName');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const showAllBtn = document.getElementById('showAllBtn');

// Initialize theme and load data
document.addEventListener('DOMContentLoaded', async () => {
    await loadDiscs();
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);
    songListElement.innerHTML = generateLoadingSkeletons(5);
    updateActiveNavItem('search');

    displaySongs(allSongs);
    setupInfiniteScroll(allSongs);
});

// Load disc configuration
async function loadDiscs() {
    try {
        const response = await fetch('discs.json');
        const discs = await response.json();
        localStorage.setItem('discs', JSON.stringify(discs));

        discDropdown.innerHTML = '';
        discs.forEach(disc => {
            const option = document.createElement('div');
            option.className = 'disc-option';
            option.textContent = disc.name;
            option.dataset.file = disc.file;
            discDropdown.appendChild(option);
        });

        setupDiscSelectorListeners();
    } catch (error) {
        console.error('Error loading discs:', error);
    }
}

function setupDiscSelectorListeners() {
    discSelectorBtn.addEventListener('click', () => {
        discDropdown.classList.toggle('show');
        discSelectorBtn.classList.toggle('active');
    });

    document.querySelectorAll('.disc-option').forEach(option => {
        option.addEventListener('click', async () => {
            await loadDisc(option.dataset.file);
            currentDiscName.textContent = option.textContent;
            discDropdown.classList.remove('show');
            discSelectorBtn.classList.remove('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!discSelectorBtn.contains(e.target) && !discDropdown.contains(e.target)) {
            discDropdown.classList.remove('show');
            discSelectorBtn.classList.remove('active');
        }
    });
}

// Load selected disc
async function loadDisc(filename) {
    try {
        if (!allSongs[filename]) {
            const response = await fetch(`discs/${filename}`);
            const text = await response.text();
            allSongs[filename] = parseCAVS(text, filename);
        }

        activeSongs = allSongs[filename];
        currentDisc = filename;
        updateResultsCount(activeSongs.length);
        displaySongs(activeSongs);
    } catch (error) {
        console.error('Error loading disc:', error);
    }
    currentDiscName.textContent = allSongs[filename][0].list; // Set the current disc name
}

// CAVS TXT parser
function parseCAVS(text, filename) {
    const discs = JSON.parse(localStorage.getItem('discs'));
    const discConfig = discs.find(d => d.file === filename);

    return text.split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [code, title, artist] = line.split('|').map(s => s.trim());
            return {
                code: code.padStart(5, '0'),
                title,
                artist,
                list: discConfig.name,
                filename
            };
        });
}

// Event listeners
searchInput.addEventListener('input', handleSearchInput);
searchButton.addEventListener('click', performSearch);
sortByTitleBtn.addEventListener('click', () => sortSongs('title'));
sortByArtistBtn.addEventListener('click', () => sortSongs('artist'));
document.querySelectorAll('input[name="searchType"]').forEach(radio => {
    radio.addEventListener('change', performSearch);
});
themeToggleBtn.addEventListener('click', toggleTheme);
document.getElementById('showFavorites').addEventListener('click', showFavorites);
document.getElementById('showRecent').addEventListener('click', showRecentlyViewed);
document.getElementById('showRandom').addEventListener('click', showRandomSongs);
document.getElementById('showSearch').addEventListener('click', performSearch);
clearSearchBtn.addEventListener('click', clearSearch);
showAllBtn.addEventListener('click', showAllSongs);

function handleSearchInput() {
    if (this.value.length > 0) {
        clearSearchBtn.classList.remove('d-none');
    } else {
        clearSearchBtn.classList.add('d-none');
    }
    debounce(performSearch)();
}

function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    }
}

// Search/filter function
function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    let searchType = Array.from(searchTypeRadios).find(radio => radio.checked).value;

    currentView = 'search';
    updateActiveNavItem('search');

    let filteredSongs = activeSongs.filter(song => {
        if (searchType === 'title' || searchType === 'all') {
            if (song.title.toLowerCase().includes(searchTerm)) return true;
        }
        if (searchType === 'artist' || searchType === 'all') {
            if (song.artist.toLowerCase().includes(searchTerm)) return true;
        }
        return false;
    });

    updateResultsCount(filteredSongs.length);
    sortSongsArray(filteredSongs);
    displaySongs(filteredSongs);
}

// Sort functions
function sortSongs(field) {
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }

    updateSortButtonsUI(field);

    let songsToDisplay = getSongsForCurrentView();
    sortSongsArray(songsToDisplay);
    displaySongs(songsToDisplay);
}

function updateSortButtonsUI(field) {
    if (field === 'title') {
        sortByTitleBtn.classList.add('active');
        sortByArtistBtn.classList.remove('active');
    } else {
        sortByArtistBtn.classList.add('active');
        sortByTitleBtn.classList.remove('active');
    }
}

function getSongsForCurrentView() {
    switch (currentView) {
        case 'favorites':
            return activeSongs.filter(song => favorites.includes(song.code));
        case 'recent':
            return activeSongs.filter(song => recentlyViewed.includes(song.code));
        case 'random':
            return [...currentDisplayedSongs];
        default:
            return [...activeSongs];
    }
}

// Helper to sort songs array
function sortSongsArray(songsArray) {
    songsArray.sort((a, b) => {
        const valueA = a[currentSortField].toLowerCase();
        const valueB = b[currentSortField].toLowerCase();
        return currentSortDirection === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
    });
}

// Display songs in the UI
function displaySongs(songs) {
    songListElement.innerHTML = '';
    const visible = Array.isArray(songs) ? songs : [];

    if (visible.length === 0) {
        showNoResults();
    } else {
        visible.forEach(song => {
            const songItem = createSongItem(song);
            songListElement.appendChild(songItem);
        });
    }

    setupInfiniteScroll();
}

function showNoResults() {
    songListElement.innerHTML = `
        <div class="text-center my-5">
            <i class="fas fa-music fa-3x mb-3" style="color: var(--text-secondary);"></i>
            <p>No songs found. Try a different search!</p>
        </div>
    `;
}

function createSongItem(song) {
    const songItem = document.createElement('li');
    songItem.className = 'song-item';
    const isFavorite = favorites.some(fav => fav.code === song.code && fav.disc === currentDisc);
    songItem.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="song-code">${song.code}</div>
            <div class="song-details">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">
                    <i class="fas fa-user-alt me-1"></i> ${song.artist}
                    <span class="song-list-badge">${song.list}</span>
                </div>
            </div>
            <button class="btn-favorite ${isFavorite ? 'active' : ''}" data-song-code="${song.code}">
                <i class="fas fa-heart"></i>
            </button>
        </div>
    `;

    songItem.querySelector('.btn-favorite').addEventListener('click', (e) => {
        toggleFavorite(song.code, e.currentTarget);
        e.stopPropagation();
    });

    songItem.addEventListener('click', () => addToRecentlyViewed(song.code));

    return songItem;
}

function setupInfiniteScroll(songs) {
    if (!songListContainer) return;
    songListContainer.addEventListener('scroll', () => {
        if (shouldLoadMore()) {
            visibleItems += 50;
            displaySongs(songs, true);
        }
    });
}

function shouldLoadMore() {
    const {scrollTop, scrollHeight, clientHeight} = songListContainer;
    return scrollTop + clientHeight >= scrollHeight - 180;
}

// Toggle favorite status
function toggleFavorite(songCode, buttonElement) {
    const index = favorites.findIndex(fav => fav.code === songCode && fav.disc === currentDisc);

    if (index === -1) {
        favorites.push({code: songCode, disc: currentDisc});
        buttonElement.classList.add('active');
        showMiniConfetti(buttonElement);
    } else {
        favorites.splice(index, 1);
        buttonElement.classList.remove('active');
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));

    if (currentView === 'favorites') {
        showFavorites();
    }
}

function showMiniConfetti(element) {
    const rect = element.getBoundingClientRect();
    confetti({
        particleCount: 50,
        spread: 70,
        origin: {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight
        }
    });
}

// Add to recently viewed
function addToRecentlyViewed(songCode) {
    recentlyViewed = [{code: songCode, disc: currentDisc},
        ...recentlyViewed.filter(item => !(item.code === songCode && item.disc === currentDisc))
    ].slice(0, 20);

    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
}

// Show favorites view
function showFavorites() {
    currentView = 'favorites';
    updateActiveNavItem('favorites');

    const favoriteSongs = activeSongs.filter(song =>
        favorites.some(fav => fav.code === song.code && fav.disc === currentDisc)
    );

    if (favoriteSongs.length === 0) {
        showEmptyState('favorites');
    } else {
        sortSongsArray(favoriteSongs);
        displaySongs(favoriteSongs);
        updateResultsCount(favoriteSongs.length, 'Favorites');
    }
}

function showRecentlyViewed() {
    currentView = 'recent';
    updateActiveNavItem('recent');

    const recentSongs = recentlyViewed
        .filter(item => item.disc === currentDisc)
        .map(item => activeSongs.find(s => s.code === item.code))
        .filter(Boolean);

    if (recentSongs.length === 0) {
        showEmptyState('recent');
    } else {
        displaySongs(recentSongs);
        updateResultsCount(recentSongs.length, 'Recent');
    }
}

function showEmptyState(view) {
    const messages = {
        favorites: {
            icon: 'fa-heart',
            color: '#ff4081',
            message: "You haven't added any favorites yet!",
            subMessage: "Tap the heart icon on songs you love."
        },
        recent: {
            icon: 'fa-history',
            color: 'var(--text-secondary)',
            message: "You haven't viewed any songs yet.",
            subMessage: "Tap on songs to add them here!"
        }
    };

    const {icon, color, message, subMessage} = messages[view];

    songListElement.innerHTML = `
        <div class="text-center my-5">
            <i class="fas ${icon} fa-3x mb-3" style="color: ${color};"></i>
            <p>${message}</p>
            <p>${subMessage}</p>
        </div>
    `;
    updateResultsCount(0, view === 'favorites' ? 'Favorites' : 'Recent');
}

// Show random songs
function showRandomSongs() {
    currentView = 'random';
    updateActiveNavItem('random');

    const randomSongs = getRandomSongs(activeSongs, 10);
    sortSongsArray(randomSongs);
    displaySongs(randomSongs);
    updateResultsCount(randomSongs.length, 'Random');

    animateRandomIcon();
}

// Helper for random songs
function getRandomSongs(songs, count) {
    return [...songs].sort(() => 0.5 - Math.random()).slice(0, count);
}

function animateRandomIcon() {
    const randomIcon = document.querySelector('#showRandom i');
    randomIcon.classList.add('fa-spin');
    setTimeout(() => randomIcon.classList.remove('fa-spin'), 1000);
}

// Update active navigation item
function updateActiveNavItem(view) {
    navItems.forEach(item => item.classList?.remove('active'));

    const activeItem = document.getElementById(`show${view.charAt(0).toUpperCase() + view.slice(1)}`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Update results count display
function updateResultsCount(count, label = 'Results') {
    if (count === allSongs.length && label === 'Results') {
        resultsCountElement.textContent = 'All songs';
    } else {
        resultsCountElement.textContent = `${count} ${label}`;
    }
}

function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.classList.add('d-none');

    // Reset radio buttons to "All"
    document.getElementById('searchAll').checked = true;

    // Show all songs from the active disc
    displaySongs(activeSongs);
    updateResultsCount(activeSongs.length);

    // Focus back on search input
    searchInput.focus();

    // Reset current view
    currentView = 'search';
    updateActiveNavItem('search');
}

function showAllSongs() {
    // Clear search input
    searchInput.value = '';
    clearSearchBtn.classList.add('d-none');

    // Reset radio buttons to "All"
    document.getElementById('searchAll').checked = true;

    // Show all songs from the active disc
    displaySongs(activeSongs);
    updateResultsCount(activeSongs.length);

    // Reset current view
    currentView = 'search';
    updateActiveNavItem('search');

    // Add a small confetti celebration
    confetti({
        particleCount: 30,
        spread: 50,
        origin: {y: 0.6}
    });
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    updateThemeToggleIcon(newTheme);
}

// Update theme icon
function updateThemeToggleIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Launch confetti effect
function launchConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: {y: 0.6}
    });
}

// Generate loading skeletons
function generateLoadingSkeletons(count) {
    let skeletonHTML = '';
    for (let i = 0; i < count; i++) {
        skeletonHTML += `
            <li class="song-item">
                <div class="d-flex align-items-center">
                    <div class="song-code skeleton-circle"></div>
                    <div class="song-details w-100">
                        <div class="song-title skeleton-line"></div>
                        <div class="song-artist skeleton-line" style="width: 60%"></div>
                    </div>
                </div>
            </li>
        `;
    }
    return skeletonHTML;
}

// Show/hide clear button based on search input
// searchInput.addEventListener('input', function () {
//     if (this.value.length > 0) {
//         clearSearchBtn.style.display = 'flex';
//     } else {
//         clearSearchBtn.style.display = 'none';
//     }
//     debounce(performSearch);
// });

// Show/hide clear button based on search input
// searchInput.addEventListener('input', function () {
//     if (this.value.length > 0) {
//         clearSearchBtn.classList.remove('d-none');
//     } else {
//         clearSearchBtn.classList.add('d-none');
//     }
//     performSearch();
// });

// Clear search functionality
// clearSearchBtn.addEventListener('click', function () {
//     searchInput.value = '';
//     clearSearchBtn.classList.add('d-none');
//
//     // Reset radio buttons to "All"
//     document.getElementById('searchAll').checked = true;
//
//     // Show all songs
//     displaySongs(allSongs);
//     updateResultsCount(allSongs.length);
//
//     // Focus back on search input
//     searchInput.focus();
// });
//
// document.getElementById('showAllBtn').addEventListener('click', function () {
//     // Clear search input
//     searchInput.value = '';
//     clearSearchBtn.style.display = 'none';
//
//     // Reset radio buttons
//     document.getElementById('searchAll').checked = true;
//
//     // Show all songs
//     displaySongs(allSongs);
//     updateResultsCount(allSongs.length);
//     currentView = 'search';
//     updateActiveNavItem('search');
//
//     // Add a small confetti celebration
//     confetti({
//         particleCount: 30,
//         spread: 50,
//         origin: {y: 0.6}
//     });
// });
