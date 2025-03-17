// Store all songs and current display state
let allSongs = [];
let currentSortField = 'title';
let currentSortDirection = 'asc';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
let currentView = 'search'; // Default view
let currentDisplayedSongs = [];

// DOM elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const sortByTitleBtn = document.getElementById('sortByTitle');
const sortByArtistBtn = document.getElementById('sortByArtist');
const songListElement = document.getElementById('songList');
const noResultsElement = document.getElementById('noResults');
const searchTypeRadios = document.getElementsByName('searchType');
const resultsCountElement = document.getElementById('resultsCount');
const themeToggleBtn = document.getElementById('themeToggle');
const navItems = document.querySelectorAll('.nav-item');

// Initialize theme and load data
document.addEventListener('DOMContentLoaded', () => {
    // Set theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);

    // Show loading skeletons
    songListElement.innerHTML = generateLoadingSkeletons(5);

    // Fetch song data
    fetch('songs.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            allSongs = parseCSV(data);
            displaySongs(allSongs);
            // Celebrate app load with confetti
            launchConfetti();
        })
        .catch(error => {
            console.error('Error loading songs:', error);
            songListElement.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading songs. Please try again later.
                </div>
            `;
        });

    // Set active navigation item
    updateActiveNavItem('search');
});

// Event listeners
searchInput.addEventListener('input', debounce(performSearch));
searchButton.addEventListener('click', debounce(performSearch));
sortByTitleBtn.addEventListener('click', () => sortSongs('title'));
sortByArtistBtn.addEventListener('click', () => sortSongs('artist'));

// Radio button listeners for instant filtering
document.querySelectorAll('input[name="searchType"]').forEach(radio => {
    radio.addEventListener('change', debounce(performSearch));
});

// Theme toggle
themeToggleBtn.addEventListener('click', toggleTheme);

// Navigation handlers
document.getElementById('showFavorites').addEventListener('click', showFavorites);
document.getElementById('showRecent').addEventListener('click', showRecentlyViewed);
document.getElementById('showRandom').addEventListener('click', showRandomSongs);

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\n');

    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
        // Handle possible commas in titles or artists
        let values;
        if (line.includes('"')) {
            const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
            values = matches.map(value => value.replace(/^"|"$/g, '').trim());
        } else {
            values = line.split(',').map(value => value.trim());
        }

        return {
            code: values[0],
            title: values[1],
            artist: values[2],
            isFavorite: favorites.includes(values[0])
        };
    });
}

function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    }
}


// Search/filter function
function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    let searchType = 'all';

    // Get selected search type
    for (const radio of searchTypeRadios) {
        if (radio.checked) {
            searchType = radio.value;
            break;
        }
    }

    // Set to search view
    currentView = 'search';
    updateActiveNavItem('search');

    let filteredSongs = [...allSongs];

    if (searchTerm !== '') {
        filteredSongs = allSongs.filter(song => {
            if (searchType === 'title' || searchType === 'all') {
                if (song.title.toLowerCase().includes(searchTerm)) {
                    return true;
                }
            }
            if (searchType === 'artist' || searchType === 'all') {
                if (song.artist.toLowerCase().includes(searchTerm)) {
                    return true;
                }
            }
            return false;
        });
    }

    updateResultsCount(filteredSongs.length);
    sortSongsArray(filteredSongs);
    displaySongs(filteredSongs);
}

// Sort functions
function sortSongs(field) {
    // Toggle direction if same field
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }

    // Update UI
    if (field === 'title') {
        sortByTitleBtn.classList.add('active');
        sortByArtistBtn.classList.remove('active');
    } else {
        sortByArtistBtn.classList.add('active');
        sortByTitleBtn.classList.remove('active');
    }

    // Sort based on current view
    let songsToDisplay = [];

    switch (currentView) {
        case 'favorites':
            songsToDisplay = allSongs.filter(song => favorites.includes(song.code));
            break;
        case 'recent':
            songsToDisplay = allSongs.filter(song => recentlyViewed.includes(song.code));
            break;
        case 'random':
            songsToDisplay = [...currentDisplayedSongs];
            break;
        default: // 'search'
            performSearch(); // Re-sort and display based on search
            return;
    }

    sortSongsArray(songsToDisplay);
    displaySongs(songsToDisplay);
}

// Helper to sort songs array
function sortSongsArray(songsArray) {
    songsArray.sort((a, b) => {
        const valueA = a[currentSortField].toLowerCase();
        const valueB = b[currentSortField].toLowerCase();

        if (currentSortDirection === 'asc') {
            return valueA.localeCompare(valueB);
        } else {
            return valueB.localeCompare(valueA);
        }
    });
}

// Display songs in the UI
function displaySongs(songs) {
    songListElement.innerHTML = '';
    currentDisplayedSongs = [...songs];

    if (songs.length === 0) {
        noResultsElement.classList.remove('d-none');
        songListElement.innerHTML = `
            <div class="text-center my-5">
                <i class="fas fa-music fa-3x mb-3" style="color: var(--text-secondary);"></i>
                <p>No songs found. Try a different search!</p>
            </div>
        `;
    } else {
        noResultsElement.classList.add('d-none');

        songs.forEach(song => {
            const isRecent = recentlyViewed.includes(song.code);
            const isFavorite = favorites.includes(song.code);

            const songItem = document.createElement('li');
            songItem.className = 'song-item';
            songItem.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="song-code">${song.code}</div>
                    <div class="song-details">
                        <div class="song-title">${song.title}</div>
                        <div class="song-artist">
                            <i class="fas fa-user-alt me-1"></i> ${song.artist}
                        </div>
                    </div>
                    <div class="song-actions">
                        <button class="btn-favorite ${isFavorite ? 'active' : ''}" data-song-code="${song.code}">
                            <i class="fas ${isFavorite ? 'fa-heart' : 'fa-heart'}"></i>
                        </button>
                    </div>
                </div>
                ${isRecent ? '<span class="recently-viewed">Recent</span>' : ''}
            `;

            // Add to recently viewed when clicked
            songItem.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-favorite')) {
                    addToRecentlyViewed(song.code);
                }
            });

            songListElement.appendChild(songItem);
        });

        // Add favorite toggle handlers
        document.querySelectorAll('.btn-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const songCode = btn.getAttribute('data-song-code');
                toggleFavorite(songCode, btn);
                e.stopPropagation();
            });
        });
    }
}

// Toggle favorite status
function toggleFavorite(songCode, buttonElement) {
    const index = favorites.indexOf(songCode);

    if (index === -1) {
        // Add to favorites
        favorites.push(songCode);
        buttonElement.classList.add('active');
        buttonElement.innerHTML = '<i class="fas fa-heart"></i>';

        // Show mini confetti on favorite
        const rect = buttonElement.getBoundingClientRect();
        confetti({
            particleCount: 50,
            spread: 70,
            origin: {
                x: (rect.left + rect.width / 2) / window.innerWidth,
                y: (rect.top + rect.height / 2) / window.innerHeight
            }
        });
    } else {
        // Remove from favorites
        favorites.splice(index, 1);
        buttonElement.classList.remove('active');
        buttonElement.innerHTML = '<i class="fas fa-heart"></i>';

        // Refresh if in favorites view
        if (currentView === 'favorites') {
            showFavorites();
        }
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Add to recently viewed
function addToRecentlyViewed(songCode) {
    const index = recentlyViewed.indexOf(songCode);
    if (index > -1) {
        recentlyViewed.splice(index, 1);
    }

    recentlyViewed.unshift(songCode);

    // Limit to 20 recent items
    if (recentlyViewed.length > 20) {
        recentlyViewed.pop();
    }

    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
}

// Show favorites view
function showFavorites() {
    currentView = 'favorites';
    updateActiveNavItem('favorites');

    const favoriteSongs = allSongs.filter(song => favorites.includes(song.code));

    if (favoriteSongs.length === 0) {
        songListElement.innerHTML = `
            <div class="text-center my-5">
                <i class="fas fa-heart fa-3x mb-3" style="color: #ff4081;"></i>
                <p>You haven't added any favorites yet!</p>
                <p>Tap the heart icon on songs you love.</p>
            </div>
        `;
        noResultsElement.classList.add('d-none');
        updateResultsCount(0, 'Favorites');
    } else {
        sortSongsArray(favoriteSongs);
        displaySongs(favoriteSongs);
        updateResultsCount(favoriteSongs.length, 'Favorites');
    }
}

// Show recently viewed
function showRecentlyViewed() {
    currentView = 'recent';
    updateActiveNavItem('recent');

    if (recentlyViewed.length === 0) {
        songListElement.innerHTML = `
            <div class="text-center my-5">
                <i class="fas fa-history fa-3x mb-3" style="color: var(--text-secondary);"></i>
                <p>You haven't viewed any songs yet.</p>
                <p>Tap on songs to add them here!</p>
            </div>
        `;
        noResultsElement.classList.add('d-none');
        updateResultsCount(0, 'Recent');
    } else {
        // Get songs in recently viewed order
        const recentSongs = [];
        recentlyViewed.forEach(code => {
            const song = allSongs.find(s => s.code === code);
            if (song) recentSongs.push(song);
        });

        displaySongs(recentSongs);
        updateResultsCount(recentSongs.length, 'Recent');
    }
}

// Show random songs
function showRandomSongs() {
    currentView = 'random';
    updateActiveNavItem('random');

    // Get 10 random songs
    const randomSongs = getRandomSongs(allSongs, 10);
    sortSongsArray(randomSongs);
    displaySongs(randomSongs);
    updateResultsCount(randomSongs.length, 'Random');

    // Animate random icon
    const randomIcon = document.querySelector('#showRandom i');
    randomIcon.classList.add('fa-spin');
    setTimeout(() => {
        randomIcon.classList.remove('fa-spin');
    }, 1000);
}

// Helper for random songs
function getRandomSongs(songs, count) {
    const shuffled = [...songs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Update active navigation item
function updateActiveNavItem(view) {
    navItems.forEach(item => item.classList.remove('active'));

    switch(view) {
        case 'favorites':
            document.getElementById('showFavorites').classList.add('active');
            break;
        case 'recent':
            document.getElementById('showRecent').classList.add('active');
            break;
        case 'random':
            document.getElementById('showRandom').classList.add('active');
            break;
        default:
            document.querySelector('.nav-item:first-child').classList.add('active');
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
        origin: { y: 0.6 }
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

// Add this to your JavaScript file (app.js)
const clearSearchBtn = document.getElementById('clearSearchBtn');

// Show/hide clear button based on search input
searchInput.addEventListener('input', function() {
    if (this.value.length > 0) {
        clearSearchBtn.style.display = 'flex';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    debounce(performSearch);
});

// Show/hide clear button based on search input
searchInput.addEventListener('input', function() {
    if (this.value.length > 0) {
        clearSearchBtn.classList.remove('d-none');
    } else {
        clearSearchBtn.classList.add('d-none');
    }
    performSearch();
});

// Clear search functionality
clearSearchBtn.addEventListener('click', function() {
    searchInput.value = '';
    clearSearchBtn.classList.add('d-none');

    // Reset radio buttons to "All"
    document.getElementById('searchAll').checked = true;

    // Show all songs
    displaySongs(allSongs);
    updateResultsCount(allSongs.length);

    // Focus back on search input
    searchInput.focus();
});

document.getElementById('showAllBtn').addEventListener('click', function() {
    // Clear search input
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';

    // Reset radio buttons
    document.getElementById('searchAll').checked = true;

    // Show all songs
    displaySongs(allSongs);
    updateResultsCount(allSongs.length);
    currentView = 'search';
    updateActiveNavItem('search');

    // Add a small confetti celebration
    confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 }
    });
});
