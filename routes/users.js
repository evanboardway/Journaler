/**
 * JournalAPI
 *
 * An API for storing journal entries along with
 * location data, mood data, and weather data.
 *
 * This file handles all the user information routes,
 * and should enable our users to create (if they are
 * an admin), update, get, and delete user data.
 *
 * CIS 371 - Fall 2021
 *
 */

/**********
 * Load all the libraries we need.
 **********/
var crypto = require('crypto');
var express = require('express');
var passport = require('passport');
var Strategy = require('passport-http').BasicStrategy
var pbkdf2 = require('pbkdf2');
var router = express.Router();

/**
 * Pull in the mongoose library and create a schema
 * to base our user model off.
 */
const mongoose = require('mongoose');

// Validators
const validateRequired = (value) => {
	return value ? true : false
}

function validateUniqueEmail(value) {
	return new Promise((resolve, reject) => {
		User.findOne({ email: value }, function (err, user) {
			if (err) { reject(err) }
			else if (user) { reject("An account with this email address already exists") }
			else { resolve(true) }
		})
	})
}

// User schema
const { Schema } = mongoose;

const userSchema = new Schema({
	email: {
		type: String,
		unique: true,
		validate: {
			validator: validateRequired,
			message: "Cant be blank"
		}
	},
	first: {
		type: String,
		validate: {
			validator: validateRequired,
			message: "Cant be blank"
		},
	},
	last: {
		type: String,
		validate: {
			validator: validateRequired,
			message: "Cant be blank"
		}
	},
	password: {
		type: String,
		validate: {
			validator: validateRequired,
			message: "Cant be blank"
		}
	},
	salt: String,
	date: {
		type: Date,
		default: Date.now
	},
	admin: {
		type: Boolean,
		default: false
	}

});

// User model
const User = mongoose.model('User', userSchema);

/**
 * Create a function that will check the information passed
 * in from the client headers (through the Passport library)
 * to see if it is the same information we have stored for
 * the user in the database.
 */
const validPassword = function (password, salt, hash) {
	let key = pbkdf2.pbkdf2Sync(password, salt, 1, 32, 'sha512');

	if (key.toString('hex') != hash) {
		return false;
	}
	return true;
}

/**
 * Teach passport what authorization means for our app.  There are
 * so many different things people may want to do, so we specify
 * how it works with our API here.
 */
passport.use(new Strategy(
	function (email, password, done) {
		User.findOne({ email: email }, function (err, user) {
			// Can't connect to Db?  We're done.
			if (err) {
				return done(err);
			}
			// User doesn't exist?  We're done.
			if (!user) {
				console.log("No user found.");
				return done(null, false);
			}
			// Got this far?  Check the password.
			if (!validPassword(password, user.salt, user.password)) {
				console.log("Wrong password.");
				return done(null, false);
			}
			// Otherwise, let them in and store the user in req.
			return done(null, user);
		});
	}
)
);

// I don't want to type this passport.authenticate, blah, blah line
// every time, so I'm aliasing it.
const checkAuth = passport.authenticate('basic', { session: false });

/**
 * Routes
 */

/**
 * GET users listing.
 * This will get all users, and should only be usable by an admin.
 */
router.get('/', checkAuth, async function (req, res, next) {
	if (req.user.admin) {
		var users = await User.find({})
		res.json(users);
	} else {
		var error = new Error("Not authorized.");
		error.status = 401;
		throw err;
	}
});

/**
 * GET a single user.
 * This function may be used by an administrator, or by a user
 * ONLY IF they are asking for their own information.
 */
// router.get('/find/:userId', checkAuth, async function (req, res, next) {
// 	if (req.user.admin || req.user._id == req.params.userId) {
// 		var user = await User.findOne({ _id: req.params.userId });
// 		res.json(user);
// 	} else {
// 		var error = new Error("Not authorized.");
// 		error.status = 401;
// 		throw error;
// 	}
// });

/**
 * POST a new user.
 * Only administrators can add new users.
 */
router.post('/', checkAuth, async function (req, res, next) {
	console.log(req.body);
	if (req.user.admin) {
		var newUser = User();
		newUser.email = req.body.username;
		newUser.salt = crypto.randomBytes(32).toString('hex');
		console.log("Received: " + req.body.password);
		newUser.password = pbkdf2.pbkdf2Sync(req.body.password, newUser.salt, 1, 32, 'sha512').toString('hex');
		newUser.admin = false;
		newUser.save();
		res.send(200);
	} else {
		var error = new Error("Not authorized.");
		error.status = 401;
		throw error;
	}
});

router.get('/new', async function (req, res, next) {
	res.render('register', { errors: {} });
});

router.post('/new', async function (req, res, next) {
	let salt = crypto.randomBytes(32).toString('hex');
	var newUser = User();

	newUser.email = req.body.email;
	newUser.password = pbkdf2.pbkdf2Sync(req.body.password, salt, 1, 32, 'sha512').toString('hex');
	newUser.salt = salt;
	newUser.first = req.body.first
	newUser.last = req.body.last

	if (req.body.password != req.body.passwordConfirm) {
		return res.render('register', { user: newUser, errors: { passwordConfirm: "Passwords don't match" } })
	}

	validateUniqueEmail(req.body.email).then(resolve => {
		newUser.validate().then(resolve => {
			newUser.save()
			req.flash('info', 'User updated successfully')
			res.redirect('/')
		}).catch(reject => {
			res.render('register', { user: newUser, errors: { first: reject.errors.first ? reject.errors.first.properties.message : null, last: reject.errors.last ? reject.errors.last.properties.message : null, password: reject.errors.password ? reject.errors.password.properties.message : null } })
		})
	}).catch(reject => {
		res.render('register', { user: newUser, errors: { email: reject } })
	})
});

router.get('/update', async function (req, res, next) {
	if (!req.isAuthenticated()) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	res.render('settings', { user: req.user })
})

router.post('/update', async function (req, res, next) {

	if (!req.isAuthenticated()) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	let user = await User.findOne({
		_id: req.user._id
	})

	const validateUser = (user) => {
		console.log("Validate user")
		user.validate().then(resolve => {
			user.save()
			req.flash('info', 'User updated successfully')
			res.redirect('/')
		}).catch(reject => {
			console.log(reject.errors.last)
			res.render('settings', { user: user, errors: { first: reject.errors.first ? reject.errors.first.properties.message : null, last: reject.errors.last ? reject.errors.last.properties.message : null, password: reject.errors.password ? reject.errors.password.properties.message : null } })
		})
	}

	if (user.email === req.body.email) {
		user.first = req.body.first
		user.last = req.body.last
		validateUser(user)
	} else {
		user.email = req.body.email
		user.first = req.body.first
		user.last = req.body.last
		validateUniqueEmail(req.body.email).then(resolve => {
			validateUser(user)
		}).catch(reject => {
			res.render('settings', { user: req.user, errors: { email: reject, } })
		})
	}

})

router.get('/delete', async function (req, res, next) {
	if (!req.isAuthenticated()) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	let user = await User.findByIdAndDelete(req.user._id)

	if (!user) {
		req.flash('info', 'An error has occured while attempting to delete this account.')
		res.redirect('/')
	} else {
		req.flash('info', 'Successfully deleted account.')
		res.redirect('/logout')
	}
})

router.post('/resetPassword', async function (req, res, next) {
	if (!req.isAuthenticated()) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	let errors = new Object()
	let hasErrors = false

	let user = await User.findOne({
		_id: req.user._id
	})

	if (req.body.newPassword !== req.body.passwordConfirm) {
		hasErrors = true
		errors.newPassword = 'Passwords must match'
	}

	const oldPassword = pbkdf2.pbkdf2Sync(req.body.oldPassword, user.salt, 1, 32, 'sha512').toString('hex');

	if (oldPassword != user.password) {
		hasErrors = true
		errors.oldPassword = 'Incorrect password'
	}

	const salt = crypto.randomBytes(32).toString('hex');
	const newPassword = pbkdf2.pbkdf2Sync(req.body.newPassword, salt, 1, 32, 'sha512').toString('hex');

	if (hasErrors) {
		res.render('settings', { errors: errors })
	} else {
		user.password = newPassword
		user.salt = salt
		user.save()
		req.flash('info', 'Updated password successfully')
		res.redirect('/')
	}
})

router.get('/admin', async function (req, res, next) {
	if (!req.isAuthenticated() || !req.user.admin) {
		req.flash('info', 'You do not have permission to go here')
		res.redirect('/');
	} else {
		var users = await User.find({});
		res.render('userAdministration', { users: users });
	}
})

module.exports = { checkAuth, router, User, validPassword };
