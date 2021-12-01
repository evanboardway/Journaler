/**
 * JournalAPI
 *
 * An API for storing journal entries along with
 * location data, mood data, and weather data.
 *
 * This file handles all the journal entry information routes,
 * and should enable our users to create update, get, and delete
 * their entries.
 *
 * CIS 371 - Fall 2021
 *
 */

/**********
 * Load all the libraries we need.
 **********/

var express = require('express');
var router = express.Router();
var user = require('./users.js');
var checkAuth = user.checkAuth;

/**
 * Create the schemas we will need.
 * Point is just a GEOJson lat/long coordinate.
 * Entry is a journal entry.
 */

// Schema validator
const validateRequired = (value) => {
	return value ? true : false
}

// Pull in the mongoose library
const mongoose = require('mongoose');
const { Schema } = mongoose;

const pointSchema = new Schema({
	type: {
		type: String,
		enum: ['Point'],
		required: true
	},
	coordinates: {
		type: [Number],
		required: true
	}
});

const entrySchema = new Schema({
	userId: mongoose.ObjectId,
        date: {
		type: Date,
		default: Date.now
	},
	mood: {
		type: String,
		required: true,
		validate: {
			validator: validateRequired,
			message: "Cant be blank"
		}
	},
	entry: {
		type: String,
		required: true,
		validate: {
			validator: validateRequired,
			message: "Cant be blank"
		}
	},
	location: {
		type: pointSchema,
		required: true
	},
	date: {
		type: Date,
		default: Date.now
	},
	weather: String
});

// Really don't need the one for Point, but eh...
const Point = mongoose.model('Point', pointSchema);
const Entry = mongoose.model('Entry', entrySchema);

/* GET full entry listing for logged in user. */
router.get('/', checkAuth, async function(req, res, next) {
	var entries = await Entry.find({ userId: req.user._id });
	res.status(200);
	res.json(entries);
});

/**
 * Get single entry for logged in user
 */

router.get('/find/:entryId', checkAuth, async function(req, res, next){
	var entry = await Entry.findOne({
		_id : req.params.entryId
	});
	if(entry.userId == req.user._id || req.user.admin == true){
		res.json(entry);
	} else {
		var error = new Error("Not found.");
		error.status = 404;
			throw error;
	}
});

/**
 * Allow logged in user to create new entry.
 */
router.get('/new', async function(req, res, next) {
	if (!req.isAuthenticated()) {
		req.flash('info', 'You must sign in to go here')
		res.redirect('/')
	}

	res.render('newEntry')
})


router.post('/new', async function(req, res, next){
	if (!req.isAuthenticated()) {
		req.flash('info', 'You must sign in to go here')
		res.redirect('/')
	}

	let loc = req.body.location.split(',')
	
	let entry = new Entry({
		userId: req.user._id,
		entry: req.body.entry,
		mood: req.body.mood,
		weather: req.body.weather,
		location: new Point({
			type: 'Point',
			coordinates: [parseFloat(loc[0]), parseFloat(loc[1])]
		})
	});

	console.log(entry)

	entry.validate().then(resolve => {
		entry.save()
		req.flash('info', 'Journal entry created')
		res.redirect('/')
	}).catch(reject => {
		console.log(reject.errors)
		res.render('newEntry', {errors: { mood: reject.errors.mood ? reject.errors.mood.properties.message : null, entry: reject.errors.entry ? reject.errors.entry.properties.message : null }})
	})
});

router.post('/update', async function(req, res, next) {
	if (!req.isAuthenticated()) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	var entry = await Entry.findOne({
		_id : req.body.entryId
	});

	if (!entry) {
		req.flash('info', 'An error has occured while loading this entry')
		return res.redirect('/')
	}

	if (req.body.preUpdate) {
		return res.render('editEntry', { entry: entry })
	}

	entry.mood = req.body.mood
	entry.entry = req.body.entry

	entry.validate().then(resolve => {
		entry.save()
		req.flash('info', 'Journal entry updated')
		res.redirect('/')
	}).catch(reject => {
		console.log(reject.errors)
		res.render('editEntry', {errors: { mood: reject.errors.mood ? reject.errors.mood.properties.message : null, entry: reject.errors.entry ? reject.errors.entry.properties.message : null }})
	})
})


/**
 * Allow a user to delete one of their own entries.
 */
router.post('/delete', async function(req, res,next){
	if (!req.isAuthenticated()) {
		req.flash('info', 'You must sign in to go here')
		return res.redirect('/')
	}

	const entry = await Entry.findByIdAndDelete(req.body.entryId)

	if(!entry){
		req.flash('info', 'There was an error when attempting to delete this entry')
		return res.redirect('/')
	}
	req.flash('info', 'Journal entry deleted')
	return res.redirect('/')
});

module.exports = { router, Entry };
