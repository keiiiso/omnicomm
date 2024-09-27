const express = require('express');
const passport = require("passport");
const localStrategy = require('../strategies/local-strategy');
const router = express.Router();

router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/');
    } else {
        res.render('auth');
    }
});

router.post('/', passport.authenticate('local', {successRedirect: '/',
    failureRedirect: '/auth'}), function (req, res) {
    // console.log(req.user);
    // console.log('here in authentication');
})

router.get('/status', function (req, res) {
    // console.log(req.user);
    // console.log(req.session);
    return req.user ? res.send(req.user) : res.sendStatus(401);
})

router.post('/logout', function (req, res) {
    if (!req.user) {
        res.redirect('/auth');
    }

    req.logout((err) => {
        if (err) return res.sendStatus(400).redirect('/auth');
        res.redirect('/auth');
    });
})

module.exports = router;