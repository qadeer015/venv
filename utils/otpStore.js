/**
 * In-memory OTP storage
 * Stores OTPs temporarily with email as key
 * In production, this should be replaced with Redis or a database
 */
const otpStore = new Map();

const OTP_STORE = {
    /**
     * Store OTP for an email
     * @param {string} email
     * @param {string} otp
     * @param {number} ttl - Time to live in milliseconds (default: 1 minute)
     */
    set(email, otp, ttl = 60000) {
        const expiresAt = Date.now() + ttl;
        otpStore.set(email, { otp, expiresAt });
        
        // Auto-cleanup after TTL
        setTimeout(() => {
            otpStore.delete(email);
        }, ttl);
    },

    /**
     * Get OTP data for an email
     * @param {string} email
     * @returns {{ otp: string, expiresAt: number } | null}
     */
    get(email) {
        const data = otpStore.get(email);
        if (!data) return null;
        
        // Check if expired
        if (Date.now() > data.expiresAt) {
            otpStore.delete(email);
            return null;
        }
        
        return data;
    },

    /**
     * Verify OTP for an email
     * @param {string} email
     * @param {string} otp
     * @returns {boolean}
     */
    verify(email, otp) {
        const data = this.get(email);
        if (!data) return false;
        
        if (data.otp === otp) {
            otpStore.delete(email); // OTP is single-use
            return true;
        }
        
        return false;
    },

    /**
     * Delete OTP for an email
     * @param {string} email
     */
    delete(email) {
        otpStore.delete(email);
    },

    /**
     * Get remaining time in seconds for an email
     * @param {string} email
     * @returns {number}
     */
    getRemainingTime(email) {
        const data = otpStore.get(email);
        if (!data) return 0;
        
        const remaining = Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000));
        return remaining;
    }
};

module.exports = OTP_STORE;