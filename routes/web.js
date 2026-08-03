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

// ── Project Routes ───────────────────────────────────────────────────
router.get('/new', projectController.showCreate);
router.post('/projects', projectController.create);
router.get('/:username/:projectSlug', projectController.show);
router.get('/:username/:projectSlug/edit', projectController.showEdit);
router.get('/:username/:projectSlug/settings', projectController.showSettings);
router.put('/:username/:projectSlug', projectController.update);
router.delete('/:username/:projectSlug', projectController.delete);

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/:username', projectController.dashboard);

// ── Environment Variable Routes ──────────────────────────────────────
router.post('/:username/:projectSlug/environments', environmentController.upsert);
router.post('/:username/:projectSlug/environments/bulk', environmentController.bulkUpsert);
router.delete('/:username/:projectSlug/environments/:envId', environmentController.delete);

// ── Access Control Routes ────────────────────────────────────────────
router.post('/:username/:projectSlug/access/request', accessController.requestAccess);
router.post('/:username/:projectSlug/access/grant', accessController.grantAccess);
router.post('/access/:accessId/approve', accessController.approveAccess);
router.post('/access/:accessId/reject', accessController.rejectAccess);
router.delete('/access/:accessId', accessController.revokeAccess);
router.get('/api/users/search', accessController.searchUsers);

// ── Root redirect ────────────────────────────────────────────────────
router.get('/', (req, res) => {
    if (req.user) {
        return res.redirect(`/${req.user.username}`);
    }
    res.redirect('/auth/login');
});

module.exports = router;