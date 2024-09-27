const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
    // console.log(req.session);
    // console.log(req.sessionID);

    if (req.isAuthenticated()) {
        // User is authenticated, show the homepage
        // console.log("User is logged in", req.user);

        res.render('index', { page: 'chat', user: req.user });
    } else {
        // User is not authenticated, redirect to login page
        // console.log("User is not logged in");
        res.redirect('/auth');
    }
});

module.exports = router;

