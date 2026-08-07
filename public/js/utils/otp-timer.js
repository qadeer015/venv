/**
 * OTP Timer Utility with localStorage support
 * 
 * Handles countdown timer for OTP verification with persistence
 * across page refreshes using localStorage.
 * 
 * Usage:
 *   OTPTimer.init('user@example.com', 60000); // Start timer with expiry timestamp
 *   OTPTimer.getRemainingTime(); // Get remaining seconds
 *   OTPTimer.onTick((seconds) => { ... }); // Callback on each tick
 *   OTPTimer.onExpire(() => { ... }); // Callback when timer expires
 *   OTPTimer.clear(); // Clear timer and localStorage
 */

const OTPTimer = (function() {
    const STORAGE_KEY_PREFIX = 'otp_expires_at_';
    let intervalId = null;
    let tickCallbacks = [];
    let expireCallbacks = [];
    let email = null;

    function getStorageKey(userEmail) {
        return STORAGE_KEY_PREFIX + btoa(userEmail);
    }

    return {
        /**
         * Initialize the timer
         * @param {string} userEmail - The user's email
         * @param {number} expiresAt - The timestamp when OTP expires (Date.now() + ttl)
         * @param {boolean} force - Force overwrite existing stored timer
         */
        init(userEmail, expiresAt, force = false) {
            email = userEmail;
            const key = getStorageKey(userEmail);

            // Store expiry timestamp in localStorage if forced or not already set
            if (force || !localStorage.getItem(key)) {
                localStorage.setItem(key, expiresAt.toString());
            }

            // Clear any existing interval
            this.stop();

            // Start the countdown
            intervalId = setInterval(() => {
                const remaining = this.getRemainingTime();
                
                // Notify tick callbacks
                tickCallbacks.forEach(cb => cb(remaining));

                // If expired, stop and notify
                if (remaining <= 0) {
                    this.stop();
                    localStorage.removeItem(key);
                    expireCallbacks.forEach(cb => cb());
                }
            }, 1000);

            // Trigger immediate first tick
            const initialRemaining = this.getRemainingTime();
            tickCallbacks.forEach(cb => cb(initialRemaining));
            if (initialRemaining <= 0) {
                this.stop();
                localStorage.removeItem(key);
                expireCallbacks.forEach(cb => cb());
            }
        },

        /**
         * Get remaining time in seconds
         * @returns {number}
         */
        getRemainingTime() {
            if (!email) return 0;
            const key = getStorageKey(email);
            const expiresAt = parseInt(localStorage.getItem(key), 10);
            if (!expiresAt) return 0;
            return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        },

        /**
         * Get the expiry timestamp from localStorage
         * @returns {number|null}
         */
        getExpiresAt() {
            if (!email) return null;
            const key = getStorageKey(email);
            const val = localStorage.getItem(key);
            return val ? parseInt(val, 10) : null;
        },

        /**
         * Register a callback for each tick (every second)
         * @param {Function} callback - Receives remaining seconds
         */
        onTick(callback) {
            tickCallbacks.push(callback);
            return this;
        },

        /**
         * Register a callback when timer expires
         * @param {Function} callback
         */
        onExpire(callback) {
            expireCallbacks.push(callback);
            return this;
        },

        /**
         * Stop the timer
         */
        stop() {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        },

        /**
         * Clear the timer and all stored data
         */
        clear() {
            this.stop();
            if (email) {
                localStorage.removeItem(getStorageKey(email));
            }
            email = null;
            tickCallbacks = [];
            expireCallbacks = [];
        },

        /**
         * Format seconds into MM:SS display
         * @param {number} seconds
         * @returns {string}
         */
        formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    };
})();