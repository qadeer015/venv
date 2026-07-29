//config/app.js
const express = require('express');
const cors = require('cors');
const morgan = require("morgan");
const cookieParser = require('cookie-parser');
const methodOverride = require("method-override");
const expressLayouts = require("express-ejs-layouts");

//web routes
const path = require('path');

const { optionalAuthenticate } = require('../middlewares/authenticate');
const { errorHandler, notFoundHandler } = require('../utils/errorHandler');

const app = express();

require("dotenv").config();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Security headers for anti-debug and protection
app.use((req, res, next) => {
    // Prevent page from being embedded in iframe (clickjacking protection)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Prevent access to browser debugging features
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    // Note: Cross-Origin-Embedder-Policy requires Corpus for external CDNs, disabled to avoid breaking third-party resources

    // Disable caching for sensitive pages
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Permissions policy to restrict browser features
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), serial=(), clipboard-read=(), clipboard-write=()');

    next();
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(optionalAuthenticate); // Set req.user if authenticated, but don't block if not authenticated

app.use(express.static(path.join(__dirname, '../public')));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(expressLayouts);

// Global variables for views (must be before routes)
app.use((req, res, next) => {
    res.locals.header = true;
    res.locals.footer = true;
    res.locals.sidebar = false;
    res.locals.isGenie = false;
    res.locals.layout = "layouts/application";
    res.locals.user = req.user;
    res.locals.page = req.path.split('/')[1];
    res.locals.currentPage = '';
    res.locals.currentYear = new Date().getFullYear();
    console.log(`Request URL: ${req.originalUrl}, User: ${req.user ? req.user.role : 'Guest'}`);
    next();
});

// Web Routes
const webRoutes = require('../routes/web');
app.use('/', webRoutes);

// 404 catch-all (must be after all routes)
app.use(notFoundHandler);

// Generic error handler (must be last)
app.use(errorHandler);

module.exports = app;
