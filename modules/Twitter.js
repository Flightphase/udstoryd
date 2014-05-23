var util = require('util');
var request = require('request');
var storage = require('node-persist');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');
var _ = require('underscore');
var winston = require('winston');
var Twit = require('twit')


var makefile = require('./makefile');
var repeat = require('./repeat');
var TileImage = require('./TileImage');
var config = require('../config');


// About search/tweets and statuses/filter
// https://dev.twitter.com/discussions/20381


var Twitter = function() {
	console.log("Constructing Twitter");

	var self = this;

	if(!config.twitter.hasOwnProperty('consumer_key'))
		throw new Exception('Must provide a client_id');

	if(!config.twitter.hasOwnProperty('consumer_secret'))
		throw new Exception('Must provide a client_id');

	if(!config.twitter.hasOwnProperty('access_token'))
		throw new Exception('Must provide a client_id');

	if(!config.twitter.hasOwnProperty('access_token_secret'))
		throw new Exception('Must provide a client_id');


	makefile.makefileSync(config.twitter.logfile);

	var logger = new (winston.Logger)({
		transports: [
			//new (winston.transports.Console)({colorize: true, timestamp: true}),
			new (winston.transports.File)({ filename: config.twitter.logfile, timestamp: true  })
		]
	});

	self.logger = logger;

	storage.initSync();

	self.settings = storage.getItem('twitter') || { refresh_url: null };

	var T = new Twit(config.twitter);



	this.stream = function() {
		var stream = T.stream('statuses/filter', { track: config.twitter.query });
		stream.on('tweet', function (tweet) {
			if(tweet.entities.hasOwnProperty("media")) {
				self.process_status(tweet, function(err){
					if(err) {
						logger.error("err: "+err);
						stream.stop()
					}
				});
			}
		});
		stream.on('limit', function (limitMessage) {
			logger.info("Emitted each time a limitation message comes into the stream.");
		})
		stream.on('disconnect', function (disconnectMessage) {
			logger.warn("Emitted when a disconnect message comes from Twitter.");
		})
		stream.on('connect', function (request) {
			logger.warn("Emitted when a connection attempt is made to Twitter. The http request object is emitted.");
		})
		stream.on('connected', function (response) {
			logger.warn("Emitted when the response is received from Twitter. The http response object is emitted.");
		})
		stream.on('reconnect', function (request, response, connectInterval) {
			logger.warn("Emitted when a reconnection attempt to Twitter is scheduled.");
		})
	}

	/*
	// https://dev.twitter.com/docs/auth/application-only-auth
	// https://coderwall.com/p/3mcuxq // Twitter and Node.js, Application Auth
	this.get_access_token = function(callback) {
		var oauth2 = new OAuth2(config.twitter.api_key, config.twitter.api_secret, 'https://api.twitter.com/', null, 'oauth2/token', null);
		oauth2.getOAuthAccessToken('', {
			'grant_type': 'client_credentials'
		}, function (err, access_token) {
			if(err) {
				callback(err)
			} else {
				access_token = access_token;
				callback()
			}
		});
	}
	*/


	this.process_status = function(status, callback) {

		var photos = _.filter(status.entities.media, function(media){ return media.type=='photo'; });
		
		if(photos.length==0) {
			logger.warn("No photos found in media tweet?")
			callback();
			return;
		}
		var url = photos[0].media_url;

		logger.info("Fetching "+url);

		var info = {
			"id": status.id,
			"text": status.text,
			"url": photos.pop().media_url,
			"author": status.user.screen_name,
			"source": "Twitter",
			"date": new Date(parseInt(status.created_at) * 1000)
		};

		var image = new TileImage({logger: logger});
		image.download(info, callback);
	}


	this.poll = function(callback) {

		process.stdout.write("tw-");
		logger.info("==Begin Twitter Poll==");

		var options = (self.settings.refresh_url)
			? qs.parse( self.settings.refresh_url.substr(1) )
			: { q: config.twitter.query, count: 100, result_type: "mixed", include_entities: "true" };

		logger.info("search/tweets", options);

		T.get('search/tweets', options, function(err, data, response) {
			if(err) callback(err)
		    else {
		    	var statuses = _.filter(data.statuses, function(status){
		    		return status.entities.hasOwnProperty("media");
		    	})
		    	logger.info("Twitter found "+data.statuses.length+"/"+statuses.length+" statuses");
			    async.eachSeries(statuses, self.process_status, function(err){
			    	if(err) callback(err);
			    	else {
						if(data.search_metadata.refresh_url) {
							logger.info(data.search_metadata.refresh_url);
							self.settings.refresh_url = data.search_metadata.refresh_url;
							storage.setItem('twitter', self.settings);
						}
						callback();
			    	}
			    });
			}
		});
	}

	self.running = true;
	repeat(self.poll, config.twitter.polling_pause, function(err){
		logger.error("Twitter is exiting because of an error")
		logger.error(err);
		self.running = false;
	})
}


module.exports = Twitter;


