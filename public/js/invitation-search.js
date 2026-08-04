// Invitation Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    const inviteInput = document.getElementById('inviteUser');
    const searchResults = document.getElementById('userSearchResults');
    const inviteForm = document.getElementById('inviteForm');

    if (!inviteInput || !searchResults) return;

    let searchTimeout;

    // Search users as user types
    inviteInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        // Debounce search
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
                const users = await response.json();
                
                if (users.length === 0) {
                    searchResults.style.display = 'none';
                    return;
                }

                // Display search results
                searchResults.innerHTML = users.map(user => `
                    <button type="button" class="list-group-item list-group-item-action bg-dark text-light border-secondary user-select-item" data-email="${user.email}" data-username="${user.username || ''}">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; font-size: 1.2rem; color: #6c757d;">
                                <i class="bi bi-person-fill"></i>
                            </div>
                            <div class="text-start">
                                <div class="fw-semibold">${user.username || 'No username'}</div>
                                <small class="text-muted">${user.email}</small>
                            </div>
                        </div>
                    </button>
                `).join('');
                
                searchResults.style.display = 'block';

                // Add click handlers to select items
                document.querySelectorAll('.user-select-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const email = this.dataset.email;
                        const username = this.dataset.username;
                        
                        // Fill the input with the selected user's email
                        inviteInput.value = email;
                        searchResults.style.display = 'none';
                    });
                });

            } catch (error) {
                console.error('Error searching users:', error);
            }
        }, 300);
    });

    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!inviteInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Prevent form submission if user selects from dropdown
    inviteInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchResults.style.display === 'block') {
                // If search results are visible, don't submit
                return false;
            }
            // Otherwise allow form submission
        }
    });
});