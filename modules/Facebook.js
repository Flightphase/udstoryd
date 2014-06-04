var util = require('util');
var storage = require('node-persist');
var request = require('request');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');
var winston = require('winston');
var graph = require('fbgraph');
var _ = require('underscore');

var makefile = require('./makefile');
var repeat = require('./repeat');
var TileImage = require('./TileImage');
var config = require('../config');


var Facebook = function(options) {
	console.log("Constructing Facebook");

	var self = this;

	if(!config.facebook.hasOwnProperty('client_id'))
		throw new Exception('Must provide a client_id');

	if(!config.facebook.hasOwnProperty('client_secret'))
		throw new Exception('Must provide a client_id');

	storage.initSync({ dir: config.persist_dir });

	self.settings = storage.getItem('facebook') || { last_poll: (new Date()).getDate()-7 };
	

	makefile.makefileSync(config.facebook.logfile);

	var logger = new (winston.Logger)({
		transports: [
			//new (winston.transports.Console)({colorize: true, timestamp: true}),
			new (winston.transports.File)({ 
				filename: config.facebook.logfile, 
				timestamp: true,
				maxsize: 1048576*5    
			})
		]
	});
	self.logger = logger;

	var access_token = null;




	this.get_access_token = function(done) {
		var query = {
			  client_id: config.facebook.client_id
			, client_secret: config.facebook.client_secret
			, grant_type: "client_credentials"
		};

		var request = '/oauth/access_token?'+qs.stringify(query);
		logger.info("Fetching "+request);

		graph.get(request, function(err, res) {
			if(err) done(err)
			else {
				access_token = res.access_token;
				logger.info("got facebook access token: "+access_token)
				done();
			}
		});
	}


	this.is_blacklisted = function(post) {

		if(_.contains(config.facebook.blacklist.names, post.from.name)) {
			return true;
		}

		return false;
	}

	this.process_post = function(post, callback) {

		//console.log(post);

		if(!post.hasOwnProperty('full_picture')) {
			callback();
			return;
		}

		if(self.is_blacklisted(post)) {
			logger.warn("Encountered a blacklisted post");
			callback();
			return;
		}

		logger.info("fetching: "+post.full_picture);
		var info = {
			"id": post.id,
			"url": post.full_picture,
			"text": post.message || "None",
			"author": post.from.name,
			"source": "Facebook",
			"date": new Date(post.created_time)
		};

		var image = new TileImage({logger: logger});
		image.download(info, callback);
	}



	this.poll = function(callback){
		callback = callback || function(){}

		if(access_token==null) {
			self.get_access_token(function(err){
				if(err) callback(err);
				else self.poll( callback );
			});
			return;
		}

		process.stdout.write("fb-");
		//logger.info("==Begin Facebook Poll==");
	
		var data = {
			fields: "id,name,type,created_time,from,full_picture,message",
			access_token: access_token, 
			since: Math.floor(new Date(self.settings.last_poll).getTime()/1000) 
		};

		var request = util.format('/%s/feed?%s', config.facebook.page_id, qs.stringify(data));
		logger.info("Fetching feed", data);

		graph.get(request, function(err, res){
			if(err) {
				
				callback(err);
			} else {
				if(res.data.length) 
					console.log("Facebook: found "+res.data.length+" posts");

				async.eachSeries(res.data, self.process_post, function(err){
					if(err) console.log(err);
					else {
						if(res.data.length>0) {
							self.settings.last_poll = new Date();
							storage.setItem('facebook', self.settings);
							//console.log("settings.last_poll="+self.settings.last_poll);
						}
						callback();
					}
				});
			}
		});
	}



	self.running = true;
	repeat(self.poll, config.facebook.polling_pause, function(err){
		logger.error("Facebook is exiting because of an error:")
		logger.error(err);
		self.running = false;
	});

}

module.exports = Facebook;