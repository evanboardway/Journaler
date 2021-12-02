var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = require('./users.js').User;
var Entry = require('./entries.js').Entry;
var validPassword = require('./users.js').validPassword;

function getSvgWeatherIcon(description) {
  if (description.includes('cloud')) { return '/svg/cloudy.svg' } 
  if (description.includes('clear')) { return '/svg/day.svg' } 
  if (description.includes('rain')) { return '/svg/rainy.svg' } 
  if (description.includes('storm')) { return '/svg/thunder.svg' } 
  if (description.includes('snow')) { return '/svg/snowy.svg' } 
  return '/svg/day.svg'
}

passport.use(new LocalStrategy(
  function (email, password, done) {
    User.findOne({ email: email }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!validPassword(password, user.salt, user.password)) { return done(null, false); }
      return done(null, user);
    }
    )
  }));

var checkAuthLocal = passport.authenticate('local', { failureRedirect: '/', session: true });

/* GET home page. */
router.get('/', function (req, res, next) {
  var name;
  if (req.user) {
    name = req.user.email;
  }
  flash = req.flash('info')
  hasFlash = flash.length == 0 ? false : true
  res.render('index', { title: 'MyJournal - Data Collection Device', name: name, flash: flash, hasFlash: hasFlash });
});

router.get('/about', function (req, res, next) {
  res.render('about', { title: 'About MyJournal' });
});

router.post('/login', checkAuthLocal, function (req, res, next) {
  res.redirect('/');
});
router.get('/addUser', checkAuthLocal, function (req, res, next) {

  if (req.user.admin) {
    res.render('addUser');
  } else {
    res.render('index');
  }
});

router.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/journal', async function (req, res) {
  if (!req.isAuthenticated()) {
    res.redirect('/');
  } else {
    var entries = await Entry.find({ userId: req.user._id });
    res.render('journal', { entries: entries, getSvgWeatherIcon: getSvgWeatherIcon });
  }
});

module.exports = router;
