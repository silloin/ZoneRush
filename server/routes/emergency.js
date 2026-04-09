const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const auth = require('../middleware/auth');

// @route   GET api/emergency/contacts
// @desc    Get user's emergency contacts
// @access  Private
router.get('/contacts', auth, emergencyController.getEmergencyContacts);

// @route   POST api/emergency/contacts
// @desc    Add emergency contact
// @access  Private
router.post('/contacts', auth, emergencyController.addEmergencyContact);

// @route   PUT api/emergency/contacts/:id
// @desc    Update emergency contact
// @access  Private
router.put('/contacts/:id', auth, emergencyController.updateEmergencyContact);

// @route   DELETE api/emergency/contacts/:id
// @desc    Delete emergency contact
// @access  Private
router.delete('/contacts/:id', auth, emergencyController.deleteEmergencyContact);

// @route   POST api/emergency/send-sos
// @desc    Send SOS alert with live location
// @access  Private
router.post('/send-sos', auth, emergencyController.sendSOSAlert);

// @route   GET api/emergency/alerts/history
// @desc    Get SOS alert history
// @access  Private
router.get('/alerts/history', auth, emergencyController.getSOSHistory);

// @route   GET api/emergency/stats
// @desc    Get SOS statistics (for admin dashboard)
// @access  Private/Admin
router.get('/stats', auth, emergencyController.getSOSStats);

module.exports = router;
