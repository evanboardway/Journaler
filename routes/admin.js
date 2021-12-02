var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var pbkdf2 = require('pbkdf2');
var {User, validateUniqueEmail } = require('./users.js');

router.get('/', async function (req, res, next) {
	if (!req.isAuthenticated() || !req.user.admin) {
		req.flash('info', 'You do not have permission to go here')
		res.redirect('/');
	} else {
		var users = await User.find({});
		res.render('userAdministration', { users: users });
	}
})

router.post('/update', async function (req, res, next) {
	if (!req.isAuthenticated() || !req.user.admin) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	var user = await User.findOne({
		_id: req.body.userId
	})

	if (!user) {
		console.log("HMM")
		req.flash('info', 'An error has occured while loading this user')
		return res.redirect('/')
	}

	if (req.body.actuallyGetRequest) {
		return res.render('editUser', { user: user })
	}

	const validateUser = (user) => {
		user.validate().then((_resolve) => {
			user.save()
			req.flash('info', 'User updated successfully')
			res.redirect('/')
		}).catch(reject => {
			res.render('editUser', { user: user, errors: {email: reject.errors.email ? reject.errors.email.properties.message : null, first: reject.errors.first ? reject.errors.first.properties.message : null, last: reject.errors.last ? reject.errors.last.properties.message : null, password: reject.errors.password ? reject.errors.password.properties.message : null } })
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
			res.render('editUser', { user: req.user, errors: { email: reject, } })
		})
	}
})

router.post('/delete', async function (req, res, next) {
	if (!req.isAuthenticated() || !req.user.admin) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	let user = await User.findByIdAndDelete(req.body.userId)

	if (!user) {
		req.flash('info', 'An error has occured while attempting to delete this account.')
		res.redirect('/')
	} else {
		req.flash('info', 'Successfully deleted account.')
		res.redirect('/')
	}
})

router.post('/resetPassword', async function (req, res, next) {
	if (!req.isAuthenticated() || !req.user.admin) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	let errors = new Object()
	let hasErrors = false

	let user = await User.findOne({
		_id: req.body.userId
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

module.exports = { router }