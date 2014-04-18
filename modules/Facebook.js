var util = require('util');
var storage = require('node-persist');
var graph = require('fbgraph');
var request = require('request');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');
var TileImage = require('./TileImage');
var config = require('../config');


storage.initSync();

var Facebook = function(options) {

	if(!config.facebook.hasOwnProperty('client_id'))
		throw new Exception('Must provide a client_id');

	if(!config.facebook.hasOwnProperty('client_secret'))
		throw new Exception('Must provide a client_id');

	var self = this;
	self.settings = storage.getItem('facebook') || { last_poll: (new Date()).getDate()-7 };
	

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


	var access_token = null;
	this.get_access_token = function(done) {
		var query = {
			  client_id: config.facebook.client_id
			, client_secret: config.facebook.client_secret
			, grant_type: "client_credentials"
		};

		var request = '/oauth/access_token?'+qs.stringify(query);
		graph.get(request, function(err, res) {
			if(err) done(err)
			else {
				access_token = res.access_token;
				//console.log("got facebook access token: "+access_token)
				done();
			}
		});
	}


	this.process_post = function(post, callback) {

		if(!post.hasOwnProperty('full_picture')) {
			callback();
			return;
		}

		var info = {
			"id": post.id,
			"url": post.full_picture,
			"text": post.message || "None",
			"author": post.from.name,
			"source": "Facebook",
			"date": new Date(post.created_time)
		};

		var image = new TileImage();
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
		//console.log("facebook.poll");
	
		var data = {
			fields: "id,name,type,created_time,from,full_picture,message",
			access_token: access_token, 
			since: Math.floor(new Date(self.settings.last_poll).getTime()/1000) 
		};

		var request = util.format('/%s/feed?%s', config.facebook.page_id, qs.stringify(data));
		//console.log(request);

		graph.get(request, function(err, res){
			if(err) callback(err);
			else {
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
}

module.exports = Facebook;