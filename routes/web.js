// routes/web.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const onboardingController = require('../controllers/onboardingController');
const projectController = require('../controllers/projectController');
const environmentController = require('../controllers/environmentController');
const accessController = require('../controllers/accessController');
const profileController = require('../controllers/profileController');

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


// ── Profile Routes ────────────────────────────────────────────────────────
router.get('/:username', profileController.showProfile);
router.post('/:username/avatar', profileController.updateAvatar);

// ── Environment Variable Routes ──────────────────────────────────────
router.post('/:username/:projectSlug/environments', environmentController.upsert);
router.post('/:username/:projectSlug/environments/bulk', environmentController.bulkUpsert);
router.delete('/:username/:projectSlug/environments/:envId', environmentController.delete);

// ── Invitation Routes ────────────────────────────────────────────────
// GET /:owner/:project/invitations → invitation request page
// (only accessible if the current user is invited & status is pending)
router.get('/:username/:projectSlug/invitations', accessController.viewInvitations);
router.post('/:username/:projectSlug/invitations/accept', accessController.acceptInvitation);
router.post('/:username/:projectSlug/invitations/decline', accessController.declineInvitation);

// ── Access Control Routes ────────────────────────────────────────────
router.post('/:username/:projectSlug/access/request', accessController.requestAccess);
router.post('/:username/:projectSlug/access/grant', accessController.grantAccess);
router.post('/:username/:projectSlug/access/invite', accessController.inviteUser);
router.post('/:username/:projectSlug/access/:accessId/approve', accessController.approveAccess);
router.post('/:username/:projectSlug/access/:accessId/reject', accessController.rejectAccess);
router.post('/:username/:projectSlug/access/:accessId/update', accessController.updateAccessEnvironments);
router.delete('/:username/:projectSlug/access/:accessId', accessController.revokeAccess);
router.get('/api/users/search', accessController.searchUsers);

// ── Root ────────────────────────────────────────────────────
router.get('/', projectController.dashboard);

module.exports = router;