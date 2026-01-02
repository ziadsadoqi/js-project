// Global variables
let listings = JSON.parse(localStorage.getItem('listings')) || [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let bookings = JSON.parse(localStorage.getItem('bookings')) || [];
let currentEditingId = null;
let currentBookingListing = null;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// DOM elements
const listingGrid = document.getElementById('listingGrid');
const favoritesGrid = document.getElementById('favoritesGrid');
const emptyState = document.getElementById('emptyState');
const listingModal = document.getElementById('listingModal');
const bookingModal = document.getElementById('bookingModal');
const loginModal = document.getElementById('loginModal');
const listingForm = document.getElementById('listingForm');
const bookingForm = document.getElementById('bookingForm');
const loginForm = document.getElementById('loginForm');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const cityFilter = document.getElementById('cityFilter');
const priceRange = document.getElementById('priceRange');
const priceValue = document.getElementById('priceValue');
const availabilityFilter = document.getElementById('availabilityFilter');
const myBookingsList = document.getElementById('myBookingsList');
const emptyMyBookings = document.getElementById('emptyMyBookings');
const checkinInput = document.getElementById('checkin');
const checkoutInput = document.getElementById('checkout');
const guestsInput = document.getElementById('guests');
const totalPriceElement = document.getElementById('totalPrice');

// Image preview function (global for HTML oninput)
function previewImage(url) {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (url && url.trim() !== '') {
        previewImg.src = url;
        preview.classList.remove('hidden');
        previewImg.onerror = function() {
            previewImg.src = 'https://via.placeholder.com/400x250/8b5cf6/ffffff?text=Invalid+Image+URL';
        };
    } else {
        preview.classList.add('hidden');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadListings();
    loadFavorites();
    setupEventListeners();
    updateEmptyState();
    updateAdminStats();
    loadBookings();
    if (currentUser && currentUser.role !== 'admin') {
        loadMyBookings();
    }
});

// Check authentication
function checkAuth() {
    if (!currentUser) {
        // Don't force login on page load, allow browsing
        updateUIForRole();
    } else {
        updateUIForRole();
    }
}

// Show login modal
function showLoginModal() {
    loginModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Update UI based on user role
function updateUIForRole() {
    const isAdmin = currentUser && currentUser.role === 'admin';
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const addListingBtn = document.getElementById('addListingBtn');
    const addListingBtnAdmin = document.getElementById('addListingBtnAdmin');
    const adminLink = document.getElementById('adminLink');
    const favoritesLink = document.getElementById('favoritesLink');
    const myBookingsLink = document.getElementById('myBookingsLink');

    if (currentUser) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        if (isAdmin) {
            addListingBtn.classList.remove('hidden');
            addListingBtnAdmin.classList.remove('hidden');
            adminLink.classList.remove('hidden');
            favoritesLink.classList.add('hidden');
            if (myBookingsLink) myBookingsLink.classList.add('hidden');
        } else {
            addListingBtn.classList.add('hidden');
            addListingBtnAdmin.classList.add('hidden');
            adminLink.classList.add('hidden');
            favoritesLink.classList.remove('hidden');
            if (myBookingsLink) myBookingsLink.classList.remove('hidden');
        }
    } else {
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        addListingBtn.classList.add('hidden');
        addListingBtnAdmin.classList.add('hidden');
        adminLink.classList.add('hidden');
        favoritesLink.classList.add('hidden');
        if (myBookingsLink) myBookingsLink.classList.add('hidden');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal controls
    document.getElementById('loginBtn').addEventListener('click', showLoginModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Only allow admins to add listings
    const addListingBtn = document.getElementById('addListingBtn');
    const addListingBtnAdmin = document.getElementById('addListingBtnAdmin');
    if (addListingBtn) {
        addListingBtn.addEventListener('click', () => {
            if (currentUser && currentUser.role === 'admin') {
                openModal();
            } else {
                showNotification('Only administrators can add listings.');
            }
        });
    }
    if (addListingBtnAdmin) {
        addListingBtnAdmin.addEventListener('click', () => {
            if (currentUser && currentUser.role === 'admin') {
                openModal();
            } else {
                showNotification('Only administrators can add listings.');
            }
        });
    }
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => closeModals());
    });
    window.addEventListener('click', (e) => {
        if (e.target === listingModal || e.target === bookingModal || e.target === loginModal) {
            closeModals();
        }
        const detailsModal = document.getElementById('detailsModal');
        if (detailsModal && e.target === detailsModal) {
            closeModals();
        }
    });

    // Form submissions
    listingForm.addEventListener('submit', handleListingSubmit);
    bookingForm.addEventListener('submit', handleBookingSubmit);
    loginForm.addEventListener('submit', handleLoginSubmit);

    // Filters and search
    searchInput.addEventListener('input', filterListings);
    document.getElementById('searchBtn').addEventListener('click', filterListings);
    typeFilter.addEventListener('change', filterListings);
    if (cityFilter) cityFilter.addEventListener('change', filterListings);
    priceRange.addEventListener('input', updatePriceFilter);
    availabilityFilter.addEventListener('change', filterListings);

    // Booking date changes
    checkinInput.addEventListener('change', () => {
        // Set checkout min date to day after checkin
        if (checkinInput.value) {
            const checkinDate = new Date(checkinInput.value);
            checkinDate.setDate(checkinDate.getDate() + 1);
            checkoutInput.setAttribute('min', checkinDate.toISOString().split('T')[0]);
        }
        calculateTotalPrice();
    });
    checkoutInput.addEventListener('change', calculateTotalPrice);
    guestsInput.addEventListener('change', calculateTotalPrice);

    // Navigation
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute('href').substring(1);
            
            // Block users from accessing admin panel
            if (targetId === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
                showNotification('Access denied. Only administrators can access the admin panel.');
                return;
            }
            
            showSection(targetId);
        });
    });

    // Admin tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchAdminTab(tabName);
        });
    });

    // Admin search and filters
    const adminSearchInput = document.getElementById('adminSearchInput');
    const adminStatusFilter = document.getElementById('adminStatusFilter');
    const adminTypeFilter = document.getElementById('adminTypeFilter');
    const bookingStatusFilter = document.getElementById('bookingStatusFilter');

    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', loadAdminListings);
    }
    if (adminStatusFilter) {
        adminStatusFilter.addEventListener('change', loadAdminListings);
    }
    if (adminTypeFilter) {
        adminTypeFilter.addEventListener('change', loadAdminListings);
    }
    if (bookingStatusFilter) {
        bookingStatusFilter.addEventListener('change', loadBookings);
    }
}

// Modal functions
function openModal(listing = null) {
    // Only allow admins to add/edit listings
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Only administrators can add or edit listings.');
        return;
    }

    currentEditingId = listing ? listing.id : null;
    document.getElementById('modalTitle').textContent = listing ? 'Edit Listing' : 'Add New Listing';

    if (listing) {
        document.getElementById('title').value = listing.title;
        document.getElementById('location').value = listing.location;
        document.getElementById('price').value = listing.price;
        document.getElementById('type').value = listing.type;
        document.getElementById('bedrooms').value = listing.bedrooms || 1;
        document.getElementById('bathrooms').value = listing.bathrooms || 1;
        document.getElementById('maxGuests').value = listing.maxGuests || 2;
        document.getElementById('image').value = listing.image || '';
        document.getElementById('description').value = listing.description;
        document.getElementById('available').checked = listing.available !== false;
        
        // Set amenities
        const amenityInputs = document.querySelectorAll('.amenity-input');
        amenityInputs.forEach(input => {
            input.checked = listing.amenities && listing.amenities.includes(input.value);
        });
        
        previewImage(listing.image || '');
    } else {
        listingForm.reset();
        document.getElementById('imagePreview').classList.add('hidden');
        // Reset amenities
        document.querySelectorAll('.amenity-input').forEach(input => input.checked = false);
    }

    listingModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModals() {
    listingModal.style.display = 'none';
    bookingModal.style.display = 'none';
    loginModal.style.display = 'none';
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal) detailsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditingId = null;
    currentBookingListing = null;
}

// Handle login
function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.toLowerCase();
    const password = document.getElementById('password').value.toLowerCase();

    // Simple authentication
    if (username === 'admin' && password === 'admin123') {
        currentUser = { username: 'admin', role: 'admin' };
    } else if (username === 'user' && password === 'user123') {
        currentUser = { username: 'user', role: 'user' };
    } else {
        alert('Invalid credentials. Please check the demo credentials below.');
        return;
    }

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    loginModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    updateUIForRole();
    showNotification(`Welcome, ${currentUser.username}!`);
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUIForRole();
    showSection('home');
    showNotification('Logged out successfully');
}

// CRUD Operations
function handleListingSubmit(e) {
    e.preventDefault();

    // Only allow admins to submit listings
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Only administrators can add or edit listings.');
        return;
    }

    // Get selected amenities
    const selectedAmenities = Array.from(document.querySelectorAll('.amenity-input:checked')).map(cb => cb.value);

    const listing = {
        id: currentEditingId || Date.now(),
        title: document.getElementById('title').value,
        location: document.getElementById('location').value,
        price: parseFloat(document.getElementById('price').value),
        type: document.getElementById('type').value,
        bedrooms: parseInt(document.getElementById('bedrooms').value) || 1,
        bathrooms: parseFloat(document.getElementById('bathrooms').value) || 1,
        maxGuests: parseInt(document.getElementById('maxGuests').value) || 2,
        description: document.getElementById('description').value,
        image: document.getElementById('image').value || 'https://via.placeholder.com/400x250/8b5cf6/ffffff?text=No+Image',
        amenities: selectedAmenities,
        available: document.getElementById('available').checked,
        featured: currentEditingId ? (listings.find(l => l.id === currentEditingId)?.featured || false) : Math.random() < 0.2
    };

    if (currentEditingId) {
        const index = listings.findIndex(l => l.id === currentEditingId);
        listings[index] = listing;
    } else {
        listings.push(listing);
    }

    saveListings();
    loadListings();
    loadAdminListings(); // Refresh admin table
    closeModals();
    showNotification(currentEditingId ? 'Listing updated successfully!' : 'Listing added successfully!');
}

function deleteListing(id) {
    // Only allow admins to delete listings
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Only administrators can delete listings.');
        return;
    }

    if (confirm('Are you sure you want to delete this listing?')) {
        listings = listings.filter(l => l.id !== id);
        favorites = favorites.filter(favId => favId !== id);
        saveListings();
        saveFavorites();
        loadListings();
        loadAdminListings(); // Refresh admin table
        loadFavorites();
        showNotification('Listing deleted successfully!');
    }
}

function toggleFavorite(id) {
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    loadListings();
    loadFavorites();
    showNotification(index > -1 ? 'Removed from favorites' : 'Added to favorites');
}

// Display functions
function loadListings(filteredListings = null) {
    const displayListings = filteredListings || listings;
    listingGrid.innerHTML = '';

    displayListings.forEach((listing, index) => {
        const card = createListingCard(listing, index);
        listingGrid.appendChild(card);
    });

    updateEmptyState();
    updateAdminStats();
}

function createListingCard(listing, index) {
    const card = document.createElement('div');
    card.className = `listing-card ${!listing.available ? 'unavailable' : ''}`;
    card.style.animationDelay = `${index * 0.1}s`;

    const isFavorited = favorites.includes(listing.id);

    const amenities = listing.amenities || [];
    const amenitiesDisplay = amenities.slice(0, 3).map(amenity => {
        const icons = {
            wifi: '📶',
            parking: '🅿️',
            pool: '🏊',
            kitchen: '🍳',
            ac: '❄️',
            heating: '🔥',
            tv: '📺',
            washer: '🧺',
            balcony: '🌅',
            gym: '💪'
        };
        return `<span class="amenity-tag">${icons[amenity] || '✓'} ${amenity}</span>`;
    }).join('');

    card.innerHTML = `
        <div class="card-image">
            ${listing.featured ? '<div class="featured-badge">⭐ Featured</div>' : ''}
            <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-id="${listing.id}" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFavorited ? '❤️' : '🤍'}
            </button>
            <img src="${listing.image || 'https://via.placeholder.com/400x250/8b5cf6/ffffff?text=No+Image'}" alt="${listing.title}" onerror="this.src='https://via.placeholder.com/400x250/8b5cf6/ffffff?text=No+Image'">
        </div>
        <div class="card-content">
            <h3>${listing.title}</h3>
            <p class="card-location"><strong>📍 ${listing.location}</strong> • ${listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}</p>
            <div class="card-specs">
                ${listing.bedrooms ? `<span>🛏️ ${listing.bedrooms} bed${listing.bedrooms > 1 ? 's' : ''}</span>` : ''}
                ${listing.bathrooms ? `<span>🚿 ${listing.bathrooms} bath${listing.bathrooms > 1 ? 's' : ''}</span>` : ''}
                ${listing.maxGuests ? `<span>👥 ${listing.maxGuests} guest${listing.maxGuests > 1 ? 's' : ''}</span>` : ''}
            </div>
            ${amenitiesDisplay ? `<div class="card-amenities">${amenitiesDisplay}${amenities.length > 3 ? ' +' + (amenities.length - 3) + ' more' : ''}</div>` : ''}
            <p class="card-description">${listing.description ? (listing.description.substring(0, 100) + (listing.description.length > 100 ? '...' : '')) : 'No description available'}</p>
            <div class="price">${listing.price.toLocaleString()} MAD / night</div>
            <div class="card-actions">
                <button class="view-details-btn" data-id="${listing.id}">View Details</button>
                ${listing.available && currentUser ? `<button class="book-btn" data-id="${listing.id}">Book Now</button>` : ''}
            </div>
        </div>
    `;

    // Event listeners
    const favoriteBtn = card.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentUser) {
                showNotification('Please login to add favorites');
                showLoginModal();
                return;
            }
            toggleFavorite(listing.id);
        });
    }

    // Edit and Delete buttons are ONLY available in admin panel, not in regular listings view
    // Users should never see or access these buttons

    // View details button
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
            showPropertyDetails(listing);
        });
    }

    if (listing.available && currentUser) {
        const bookBtn = card.querySelector('.book-btn');
        if (bookBtn) {
            bookBtn.addEventListener('click', () => {
                openBookingModal(listing);
            });
        }
    }

    return card;
}

// Show property details modal
function showPropertyDetails(listing) {
    // Users can view details, but cannot edit/delete from here
    const amenities = listing.amenities || [];
    const amenitiesList = amenities.map(amenity => {
        const icons = {
            wifi: '📶 WiFi',
            parking: '🅿️ Parking',
            pool: '🏊 Pool',
            kitchen: '🍳 Kitchen',
            ac: '❄️ Air Conditioning',
            heating: '🔥 Heating',
            tv: '📺 TV',
            washer: '🧺 Washer',
            balcony: '🌅 Balcony',
            gym: '💪 Gym'
        };
        return `<span class="amenity-badge">${icons[amenity] || amenity}</span>`;
    }).join('');

    const detailsHTML = `
        <div class="property-details">
            <div class="details-image">
                <img src="${listing.image || 'https://via.placeholder.com/600x400/8b5cf6/ffffff?text=No+Image'}" alt="${listing.title}" onerror="this.src='https://via.placeholder.com/600x400/8b5cf6/ffffff?text=No+Image'">
            </div>
            <div class="details-content">
                <h2>${listing.title}</h2>
                <p class="details-location">📍 ${listing.location} • ${listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}</p>
                <div class="details-specs">
                    ${listing.bedrooms ? `<div class="spec-item"><span class="spec-icon">🛏️</span><span>${listing.bedrooms} Bedroom${listing.bedrooms > 1 ? 's' : ''}</span></div>` : ''}
                    ${listing.bathrooms ? `<div class="spec-item"><span class="spec-icon">🚿</span><span>${listing.bathrooms} Bathroom${listing.bathrooms > 1 ? 's' : ''}</span></div>` : ''}
                    ${listing.maxGuests ? `<div class="spec-item"><span class="spec-icon">👥</span><span>Up to ${listing.maxGuests} Guest${listing.maxGuests > 1 ? 's' : ''}</span></div>` : ''}
                </div>
                <div class="details-price">
                    <span class="price-large">${listing.price.toLocaleString()} MAD</span>
                    <span class="price-label">per night</span>
                </div>
                <div class="details-description">
                    <h3>About this place</h3>
                    <p>${listing.description || 'No description available.'}</p>
                </div>
                ${amenities.length > 0 ? `
                    <div class="details-amenities">
                        <h3>Amenities</h3>
                        <div class="amenities-list">${amenitiesList}</div>
                    </div>
                ` : ''}
                <div class="details-actions">
                    ${listing.available && currentUser ? `<button class="btn-primary" onclick="openBookingModalById(${listing.id})">Book Now</button>` : ''}
                    ${!currentUser ? `<button class="btn-primary" onclick="showLoginModal(); closeModals();">Login to Book</button>` : ''}
                </div>
            </div>
        </div>
    `;

    // Create or update details modal
    let detailsModal = document.getElementById('detailsModal');
    if (!detailsModal) {
        detailsModal = document.createElement('div');
        detailsModal.id = 'detailsModal';
        detailsModal.className = 'modal';
        detailsModal.innerHTML = `
            <div class="modal-content modal-large">
                <span class="close">&times;</span>
                <div id="detailsContent"></div>
            </div>
        `;
        document.body.appendChild(detailsModal);
        
        detailsModal.querySelector('.close').addEventListener('click', () => {
            detailsModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
        
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                detailsModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    document.getElementById('detailsContent').innerHTML = detailsHTML;
    detailsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function openBookingModalById(listingId) {
    const listing = listings.find(l => l.id === listingId);
    if (listing) {
        document.getElementById('detailsModal').style.display = 'none';
        openBookingModal(listing);
    }
}

function loadFavorites() {
    const favoriteListings = listings.filter(listing => favorites.includes(listing.id));
    const emptyFavorites = document.getElementById('emptyFavorites');
    
    if (!favoritesGrid) return;
    
    favoritesGrid.innerHTML = '';

    if (favoriteListings.length === 0) {
        if (emptyFavorites) emptyFavorites.classList.remove('hidden');
        return;
    }

    if (emptyFavorites) emptyFavorites.classList.add('hidden');

    favoriteListings.forEach((listing, index) => {
        const card = createListingCard(listing, index);
        favoritesGrid.appendChild(card);
    });
}

// Load user's bookings
function loadMyBookings() {
    if (!currentUser) return;
    
    const userBookings = bookings.filter(booking => booking.guestName === currentUser.username);
    const emptyMyBookingsEl = document.getElementById('emptyMyBookings');
    
    if (!myBookingsList) return;
    
    myBookingsList.innerHTML = '';

    if (userBookings.length === 0) {
        if (emptyMyBookingsEl) emptyMyBookingsEl.classList.remove('hidden');
        return;
    }

    if (emptyMyBookingsEl) emptyMyBookingsEl.classList.add('hidden');

    // Sort by booking date (newest first)
    const sortedBookings = [...userBookings].sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

    sortedBookings.forEach(booking => {
        const checkinDate = new Date(booking.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const checkoutDate = new Date(booking.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const bookingDate = new Date(booking.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const bookingCard = document.createElement('div');
        bookingCard.className = 'booking-card';
        bookingCard.innerHTML = `
            <div class="booking-image">
                <img src="${booking.listingImage || 'https://via.placeholder.com/100x100/8b5cf6/ffffff?text=No+Image'}" alt="${booking.listingTitle}" onerror="this.src='https://via.placeholder.com/100x100/8b5cf6/ffffff?text=No+Image'">
            </div>
            <div class="booking-info">
                <h4>${booking.listingTitle}</h4>
                <p class="booking-location">📍 ${booking.listingLocation}</p>
                <div class="booking-details">
                    <span class="booking-date">📅 ${checkinDate} → ${checkoutDate}</span>
                    <span class="booking-guests">👥 ${booking.guests} guest${booking.guests > 1 ? 's' : ''}</span>
                    <span class="booking-nights">🌙 ${booking.nights} night${booking.nights > 1 ? 's' : ''}</span>
                </div>
                <div class="booking-meta">
                    <span class="booking-date-booked">Booked on: ${bookingDate}</span>
                    <span class="booking-status ${booking.status}">${booking.status === 'active' ? '✅ Active' : '❌ Completed'}</span>
                </div>
            </div>
            <div class="booking-price">
                <p class="price-label">Total</p>
                <p class="price-value">${booking.totalPrice.toLocaleString()} MAD</p>
                <p class="price-per-night">${booking.pricePerNight.toLocaleString()} MAD/night</p>
            </div>
        `;
        myBookingsList.appendChild(bookingCard);
    });
}

// Filtering and search
function filterListings() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedType = typeFilter.value;
    const selectedCity = cityFilter ? cityFilter.value : '';
    const maxPrice = parseFloat(priceRange.value);
    const availableOnly = availabilityFilter.checked;

    const filtered = listings.filter(listing => {
        const matchesSearch = listing.title.toLowerCase().includes(searchTerm) ||
                             listing.location.toLowerCase().includes(searchTerm) ||
                             (listing.description && listing.description.toLowerCase().includes(searchTerm));
        const matchesType = !selectedType || listing.type === selectedType;
        const matchesCity = !selectedCity || listing.location === selectedCity;
        const matchesPrice = listing.price <= maxPrice;
        const matchesAvailability = !availableOnly || listing.available;

        return matchesSearch && matchesType && matchesCity && matchesPrice && matchesAvailability;
    });

    loadListings(filtered);
}

function updatePriceFilter() {
    priceValue.textContent = priceRange.value;
    filterListings();
}

// Booking functions
function openBookingModal(listing) {
    if (!currentUser) {
        showNotification('Please login to book a property');
        showLoginModal();
        return;
    }
    currentBookingListing = listing;
    document.getElementById('bookingDetails').innerHTML = `
        <h3>${listing.title}</h3>
        <p>📍 ${listing.location}</p>
        <p>💰 ${listing.price.toLocaleString()} MAD / night</p>
        ${listing.maxGuests ? `<p>👥 Maximum ${listing.maxGuests} guest${listing.maxGuests > 1 ? 's' : ''}</p>` : ''}
    `;
    bookingForm.reset();
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    checkinInput.setAttribute('min', today);
    checkoutInput.setAttribute('min', today);
    if (listing.maxGuests) {
        guestsInput.setAttribute('max', listing.maxGuests);
        guestsInput.setAttribute('placeholder', `Max ${listing.maxGuests} guests`);
    }
    bookingModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    calculateTotalPrice();
    
    // Update admin stats after booking (if admin is viewing)
    if (currentUser && currentUser.role === 'admin') {
        setTimeout(() => {
            updateAdminStats();
            loadBookings();
        }, 100);
    }
}

function handleBookingSubmit(e) {
    e.preventDefault();

    const checkin = new Date(checkinInput.value);
    const checkout = new Date(checkoutInput.value);
    const guests = parseInt(guestsInput.value);

    if (checkout <= checkin) {
        alert('Check-out date must be after check-in date.');
        return;
    }

    if (currentBookingListing.maxGuests && guests > currentBookingListing.maxGuests) {
        alert(`This property can only accommodate up to ${currentBookingListing.maxGuests} guest${currentBookingListing.maxGuests > 1 ? 's' : ''}.`);
        return;
    }

    if (guests < 1) {
        alert('Please enter at least 1 guest.');
        return;
    }

    const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * currentBookingListing.price;

    // Create booking record
    const booking = {
        id: Date.now(),
        listingId: currentBookingListing.id,
        listingTitle: currentBookingListing.title,
        listingLocation: currentBookingListing.location,
        listingImage: currentBookingListing.image,
        checkin: checkinInput.value,
        checkout: checkoutInput.value,
        guests: guests,
        nights: nights,
        pricePerNight: currentBookingListing.price,
        totalPrice: totalPrice,
        bookingDate: new Date().toISOString(),
        status: 'active',
        guestName: currentUser.username
    };

    bookings.push(booking);
    saveBookings();
    updateAdminStats();
    loadBookings();
    if (currentUser && currentUser.role !== 'admin') {
        loadMyBookings();
    }

    showNotification(`✅ Booking confirmed! Total: ${totalPrice.toLocaleString()} MAD for ${nights} night(s)`);
    closeModals();
}

function calculateTotalPrice() {
    if (!currentBookingListing || !checkinInput.value || !checkoutInput.value) {
        totalPriceElement.textContent = '0';
        return;
    }

    const checkin = new Date(checkinInput.value);
    const checkout = new Date(checkoutInput.value);

    if (checkout <= checkin) {
        totalPriceElement.textContent = '0';
        return;
    }

    const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
    const total = nights * currentBookingListing.price;
    totalPriceElement.textContent = total.toLocaleString();
}

// Update admin stats
function updateAdminStats() {
    if (currentUser && currentUser.role === 'admin') {
        const totalListingsEl = document.getElementById('totalListings');
        const availableListingsEl = document.getElementById('availableListings');
        const totalFavoritesEl = document.getElementById('totalFavorites');
        const totalBookingsEl = document.getElementById('totalBookings');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const rentedNowEl = document.getElementById('rentedNow');

        if (totalListingsEl) totalListingsEl.textContent = listings.length;
        if (availableListingsEl) availableListingsEl.textContent = listings.filter(l => l.available).length;
        if (totalFavoritesEl) totalFavoritesEl.textContent = favorites.length;
        
        // Calculate booking statistics
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        
        // Count currently rented (active bookings with checkout date in future)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const rentedNow = bookings.filter(booking => {
            const checkout = new Date(booking.checkout);
            checkout.setHours(0, 0, 0, 0);
            const checkin = new Date(booking.checkin);
            checkin.setHours(0, 0, 0, 0);
            return booking.status === 'active' && checkin <= today && checkout >= today;
        }).length;

        if (totalBookingsEl) totalBookingsEl.textContent = totalBookings;
        if (totalRevenueEl) totalRevenueEl.textContent = totalRevenue.toLocaleString() + ' MAD';
        if (rentedNowEl) rentedNowEl.textContent = rentedNow;
    }
}

// Admin tab switching
function switchAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Load data when switching tabs
    if (tabName === 'listings') {
        loadAdminListings();
    } else if (tabName === 'bookings') {
        loadBookings();
    } else if (tabName === 'overview') {
        updateAdminStats();
    }
}

// Load admin listings in table/grid view
function loadAdminListings() {
    if (!currentUser || currentUser.role !== 'admin') return;

    const adminSearchInput = document.getElementById('adminSearchInput');
    const adminStatusFilter = document.getElementById('adminStatusFilter');
    const adminTypeFilter = document.getElementById('adminTypeFilter');
    const tableBody = document.getElementById('adminListingsTableBody');
    const adminGrid = document.getElementById('adminListingsGrid');
    const emptyState = document.getElementById('emptyAdminListings');

    if (!tableBody) return;

    // Get filter values
    const searchTerm = adminSearchInput ? adminSearchInput.value.toLowerCase() : '';
    const statusFilter = adminStatusFilter ? adminStatusFilter.value : '';
    const typeFilter = adminTypeFilter ? adminTypeFilter.value : '';

    // Filter listings
    let filteredListings = listings.filter(listing => {
        const matchesSearch = !searchTerm || 
            listing.title.toLowerCase().includes(searchTerm) ||
            listing.location.toLowerCase().includes(searchTerm) ||
            (listing.description && listing.description.toLowerCase().includes(searchTerm));
        
        const matchesStatus = !statusFilter || 
            (statusFilter === 'available' && listing.available) ||
            (statusFilter === 'unavailable' && !listing.available);
        
        const matchesType = !typeFilter || listing.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    tableBody.innerHTML = '';
    if (adminGrid) adminGrid.innerHTML = '';

    if (filteredListings.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    // Count bookings per listing
    const bookingCounts = {};
    bookings.forEach(booking => {
        bookingCounts[booking.listingId] = (bookingCounts[booking.listingId] || 0) + 1;
    });

    filteredListings.forEach(listing => {
        const bookingCount = bookingCounts[listing.id] || 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="table-image">
                <img src="${listing.image || 'https://via.placeholder.com/60x60/8b5cf6/ffffff?text=No+Image'}" 
                     alt="${listing.title}" 
                     onerror="this.src='https://via.placeholder.com/60x60/8b5cf6/ffffff?text=No+Image'">
            </td>
            <td class="table-title">
                <strong>${listing.title}</strong>
                ${listing.featured ? '<span class="featured-badge-small">⭐</span>' : ''}
            </td>
            <td>📍 ${listing.location}</td>
            <td>${listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}</td>
            <td><strong>${listing.price.toLocaleString()} MAD</strong></td>
            <td>
                <span class="status-badge ${listing.available ? 'available' : 'unavailable'}">
                    ${listing.available ? '✅ Available' : '❌ Unavailable'}
                </span>
            </td>
            <td>${bookingCount} booking${bookingCount !== 1 ? 's' : ''}</td>
            <td class="table-actions">
                <button class="action-btn edit-action" data-listing-id="${listing.id}" title="Edit">
                    ✏️
                </button>
                <button class="action-btn delete-action" data-listing-id="${listing.id}" title="Delete">
                    🗑️
                </button>
                <button class="action-btn view-action" data-listing-id="${listing.id}" title="View Details">
                    👁️
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners to action buttons
    tableBody.querySelectorAll('.edit-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const listingId = parseInt(btn.getAttribute('data-listing-id'));
            const listing = listings.find(l => l.id === listingId);
            if (listing) openModal(listing);
        });
    });

    tableBody.querySelectorAll('.delete-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const listingId = parseInt(btn.getAttribute('data-listing-id'));
            deleteListing(listingId);
        });
    });

    tableBody.querySelectorAll('.view-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const listingId = parseInt(btn.getAttribute('data-listing-id'));
            const listing = listings.find(l => l.id === listingId);
            if (listing) showPropertyDetails(listing);
        });
    });

    updateAdminStats();
}

// Load and display bookings
function loadBookings() {
    if (!currentUser || currentUser.role !== 'admin') return;

    const bookingsList = document.getElementById('bookingsList');
    const emptyBookings = document.getElementById('emptyBookings');
    const bookingStatusFilter = document.getElementById('bookingStatusFilter');

    if (!bookingsList) return;

    // Filter by status if filter is set
    let filteredBookings = bookings;
    if (bookingStatusFilter && bookingStatusFilter.value) {
        filteredBookings = bookings.filter(booking => booking.status === bookingStatusFilter.value);
    }

    // Sort bookings by date (newest first)
    const sortedBookings = [...filteredBookings].sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

    if (sortedBookings.length === 0) {
        if (emptyBookings) emptyBookings.classList.remove('hidden');
        bookingsList.innerHTML = '';
        return;
    }

    if (emptyBookings) emptyBookings.classList.add('hidden');

    bookingsList.innerHTML = sortedBookings.slice(0, 10).map(booking => {
        const checkinDate = new Date(booking.checkin).toLocaleDateString();
        const checkoutDate = new Date(booking.checkout).toLocaleDateString();
        const bookingDate = new Date(booking.bookingDate).toLocaleDateString();

        return `
            <div class="booking-card">
                <div class="booking-image">
                    <img src="${booking.listingImage || 'https://via.placeholder.com/100x100/8b5cf6/ffffff?text=No+Image'}" alt="${booking.listingTitle}" onerror="this.src='https://via.placeholder.com/100x100/8b5cf6/ffffff?text=No+Image'">
                </div>
                <div class="booking-info">
                    <h4>${booking.listingTitle}</h4>
                    <p class="booking-location">📍 ${booking.listingLocation}</p>
                    <div class="booking-details">
                        <span class="booking-date">📅 ${checkinDate} → ${checkoutDate}</span>
                        <span class="booking-guests">👥 ${booking.guests} guest${booking.guests > 1 ? 's' : ''}</span>
                        <span class="booking-nights">🌙 ${booking.nights} night${booking.nights > 1 ? 's' : ''}</span>
                    </div>
                    <div class="booking-meta">
                        <span class="booking-guest">Guest: ${booking.guestName}</span>
                        <span class="booking-status ${booking.status}">${booking.status === 'active' ? '✅ Active' : '❌ Completed'}</span>
                    </div>
                </div>
                <div class="booking-price">
                    <p class="price-label">Total</p>
                    <p class="price-value">${booking.totalPrice.toLocaleString()} MAD</p>
                    <p class="price-per-night">${booking.pricePerNight.toLocaleString()} MAD/night</p>
                </div>
            </div>
        `;
    }).join('');
}

function saveListings() {
    localStorage.setItem('listings', JSON.stringify(listings));
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function saveBookings() {
    localStorage.setItem('bookings', JSON.stringify(bookings));
}

function updateEmptyState() {
    const visibleListings = listingGrid.children.length;
    emptyState.style.display = visibleListings === 0 ? 'block' : 'none';
}

function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.add('hidden');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        if (sectionId === 'favorites') {
            loadFavorites();
        } else if (sectionId === 'myBookings') {
            loadMyBookings();
        } else if (sectionId === 'admin') {
            // Only allow admins to access admin panel
            if (!currentUser || currentUser.role !== 'admin') {
                showNotification('Access denied. Only administrators can access this section.');
                showSection('listings');
                return;
            }
            updateAdminStats();
            loadAdminListings();
            loadBookings();
            switchAdminTab('overview');
        }
    }
}

function showNotification(message) {
    // Simple notification - in a real app, you'd use a proper notification system
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 1rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add some sample data if no listings exist
if (listings.length === 0) {
    listings = [
        {
            id: 1,
            title: "Luxury Apartment in Casablanca",
            location: "Casablanca",
            price: 1200,
            type: "apartment",
            bedrooms: 2,
            bathrooms: 2,
            maxGuests: 4,
            description: "A stunning modern apartment overlooking the Hassan II Mosque, perfect for business travelers. Features floor-to-ceiling windows, fully equipped kitchen, and high-speed WiFi.",
            amenities: ['wifi', 'parking', 'ac', 'kitchen', 'tv'],
            available: true,
            featured: true,
            image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        },
        {
            id: 2,
            title: "Traditional Riad in Marrakech",
            location: "Marrakech",
            price: 2500,
            type: "house",
            bedrooms: 3,
            bathrooms: 2,
            maxGuests: 6,
            description: "Authentic Moroccan riad in the Medina with a beautiful courtyard garden and traditional architecture. Experience true Moroccan hospitality in this restored 18th-century property.",
            amenities: ['wifi', 'kitchen', 'ac', 'balcony', 'pool'],
            available: true,
            featured: false,
            image: "https://images.unsplash.com/photo-1539650116574-75c0c6d0b7ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        },
        {
            id: 3,
            title: "Beachfront Studio in Agadir",
            location: "Agadir",
            price: 1800,
            type: "studio",
            bedrooms: 0,
            bathrooms: 1,
            maxGuests: 2,
            description: "Charming studio apartment right by the beach with ocean views and modern amenities. Perfect for couples seeking a romantic getaway.",
            amenities: ['wifi', 'ac', 'tv', 'balcony'],
            available: false,
            featured: true,
            image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        },
        {
            id: 4,
            title: "Historic House in Fes",
            location: "Fes",
            price: 1500,
            type: "house",
            bedrooms: 4,
            bathrooms: 3,
            maxGuests: 8,
            description: "Beautiful historic house in the Fes Medina, blending traditional Moroccan design with modern comfort. Spacious rooms with authentic tile work and modern facilities.",
            amenities: ['wifi', 'kitchen', 'ac', 'heating', 'tv', 'parking'],
            available: true,
            featured: false,
            image: "https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        },
        {
            id: 5,
            title: "Modern Villa in Rabat",
            location: "Rabat",
            price: 3000,
            type: "villa",
            bedrooms: 5,
            bathrooms: 4,
            maxGuests: 10,
            description: "Spacious contemporary villa near the Royal Palace with stunning gardens and city views. Perfect for large families or groups. Features private pool and modern amenities.",
            amenities: ['wifi', 'parking', 'pool', 'kitchen', 'ac', 'tv', 'washer', 'gym', 'balcony'],
            available: true,
            featured: true,
            image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        },
        {
            id: 6,
            title: "Coastal Apartment in Tangier",
            location: "Tangier",
            price: 2200,
            type: "apartment",
            bedrooms: 2,
            bathrooms: 2,
            maxGuests: 4,
            description: "Beautiful coastal apartment with stunning views of the Mediterranean Sea and the Strait of Gibraltar. Modern design with panoramic windows and beach access nearby.",
            amenities: ['wifi', 'parking', 'ac', 'kitchen', 'tv', 'balcony'],
            available: true,
            featured: false,
            image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        }
    ];
    saveListings();
    loadListings();
}