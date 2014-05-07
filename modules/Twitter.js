var util = require('util');
var request = require('request');
var storage = require('node-persist');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');
var _ = require('underscore');

var TileImage = require('./TileImage');
var config = require('../config');
var Twit = require('twit')


// About search/tweets and statuses/filter
// https://dev.twitter.com/discussions/20381


var Twitter = function() {

	if(!config.twitter.hasOwnProperty('consumer_key'))
		throw new Exception('Must provide a client_id');

	if(!config.twitter.hasOwnProperty('consumer_secret'))
		throw new Exception('Must provide a client_id');

	if(!config.twitter.hasOwnProperty('access_token'))
		throw new Exception('Must provide a client_id');

	if(!config.twitter.hasOwnProperty('access_token_secret'))
		throw new Exception('Must provide a client_id');


	var T = new Twit(config.twitter);
	var self = this;

	self.settings = storage.getItem('twitter') || { refresh_url: null };


	var polling_interval = 5000;
	this.start = function() {
		var _poll = function(err){
			self.poll(function(err){
				if(err) console.log(err);
				else setTimeout(_poll, polling_interval);
			});
		}
		_poll();
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

		if(!status.entities.media) {
			callback();
			return;
		}

		var photos = _.filter(status.entities.media, function(media){ return media.type=='photo'; });
		
		if(photos.length==0) {
			callback();
			return;
		}

		//console.log("Found "+photos.length+" photos");
	
		var info = {
			"id": status.id,
			"text": status.text,
			"url": photos.pop().media_url,
			"author": status.user.screen_name,
			"source": "Twitter",
			"date": new Date(parseInt(status.created_at) * 1000)
		};

		var image = new TileImage();
		image.download(info, callback);
	}


	this.poll = function(callback) {

		process.stdout.write("tw-");

		var options = (self.settings.refresh_url)
			? qs.parse( self.settings.refresh_url.substr(1) )
			: { q: '#lemur', count: 100 };

		T.get('search/tweets', options, function(err, data, response) {
			if(err) callback(err)
		    else async.eachSeries(data.statuses, self.process_status, function(err){
		    	if(err) callback(err);
		    	else {
					if(data.search_metadata.refresh_url) {
						self.settings.refresh_url = data.search_metadata.refresh_url;
						storage.setItem('twitter', self.settings);
					}
					callback();
		    	}
		    })
		});
	}
}


module.exports = Twitter;