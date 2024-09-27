const express = require('express');
const router = express.Router();
const path = require('path');

/* GET home/chat page. */
router.get('/', function(req, res, next) {
  // console.log(req.session);
  // console.log(req.sessionID);

  if (req.isAuthenticated()) {
    // User is authenticated, show the homepage
    console.log("User is logged in", req.user);

    res.render('index', { page: 'chat', user: req.user });
  } else {
    // User is not authenticated, redirect to login page
    // console.log("User is not logged in");
    res.redirect('/auth');
  }
});


router.get('/download/:file', (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(__dirname, '../uploads', fileName);

  // Send the file for download
  res.download(filePath, (err) => {
    if (err) {
      res.status(404).send('File not found');
    }
  });
});


module.exports = router;
