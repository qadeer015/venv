// routes/web.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const onboardingController = require('../controllers/onboardingController');
const projectController = require('../controllers/projectController');
const environmentController = require('../controllers/environmentController');
const accessController = require('../controllers/accessController');

// ── Auth Routes ──────────────────────────────────────────────────────
router.get('/auth/login', authController.showLogin);
router.get('/auth/register', authController.showRegister);
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);

// ── Onboarding Routes ────────────────────────────────────────────────
router.get('/onboarding', onboardingController.showOnboarding);
router.post('/onboarding', onboardingController.completeOnboarding);

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/dashboard', projectController.dashboard);

// ── Project Routes ───────────────────────────────────────────────────
router.get('/projects/create', projectController.showCreate);
router.post('/projects', projectController.create);
router.get('/projects/:id', projectController.show);
router.get('/projects/:id/edit', projectController.showEdit);
router.put('/projects/:id', projectController.update);
router.delete('/projects/:id', projectController.delete);

// ── Environment Variable Routes ──────────────────────────────────────
router.post('/projects/:projectId/environments', environmentController.upsert);
router.post('/projects/:projectId/environments/bulk', environmentController.bulkUpsert);
router.delete('/projects/:projectId/environments/:envId', environmentController.delete);

// ── Access Control Routes ────────────────────────────────────────────
router.post('/projects/:projectId/access/request', accessController.requestAccess);
router.post('/projects/:projectId/access/grant', accessController.grantAccess);
router.post('/access/:accessId/approve', accessController.approveAccess);
router.post('/access/:accessId/reject', accessController.rejectAccess);
router.delete('/access/:accessId', accessController.revokeAccess);
router.get('/api/users/search', accessController.searchUsers);

// ── Root redirect ────────────────────────────────────────────────────
router.get('/', (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    res.redirect('/auth/login');
});

module.exports = router;