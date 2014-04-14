var util = require('util');
var storage = require('node-persist');
var graph = require('fbgraph');
var request = require('request');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');

storage.initSync();

var Facebook = function(options) {

	if(!options.hasOwnProperty('client_id'))
		throw new Exception('Must provide a client_id');

	if(!options.hasOwnProperty('client_secret'))
		throw new Exception('Must provide a client_id');

	var self = this;
	var access_token = null;
	var directory = options.download_dir;
	var client_id = options.client_id;
	var client_secret = options.client_secret;


	fs.exists(directory, function(exists) {
		if (!exists) fs.mkdir(directory);
	});


	this.get_access_token = function(done) {
		var query = {
			  client_id: client_id
			, client_secret: client_secret
			, grant_type: "client_credentials"
		};
		var request = '/oauth/access_token?'+qs.stringify(query);

		graph.get(request, function(err, res) {
			if(err) done(err)
			else {
				access_token = res.access_token;
				console.log("got facebook access token: "+access_token)
				done();
			}
		});
	}

	this.date_is_new = function(created_time) {
		if(!storage.getItem('facebook')) return true;
		if(!storage.getItem('facebook').oldest_post) return true;
		var this_date = new Date(created_time);
		var last_date = new Date(storage.getItem('facebook').oldest_post);
		return this_date > last_date;
	}

	this.process_post = function(post, callback) {

		if(post.type=="photo" && post.hasOwnProperty('picture'))  // self.date_is_new(post.created_time)
		{
			//console.log(util.inspect(post));
			storage.setItem('facebook', {oldest_post: post.created_time});

			var id = post.id;
			var url = post.picture;

			var local_path = util.format("%s/%s.jpg", directory, id);
			fs.exists(local_path, function(exists){

				if(exists) {
					console.log("WARNING: fetched an image twice!");
					callback();
				} else {
					console.log(local_path);
					var writeStream = fs.createWriteStream(local_path);
					writeStream.on('close', callback);
					writeStream.on('error', callback);
					request(url).pipe(writeStream);
				}
			}); 

		} else callback();
	}


	this.poll = function(tag, callback){
		callback = callback || function(){}

		if(access_token==null) {
			self.get_access_token(function(err){
				if(err) callback(err);
				else self.poll( tag, callback );
			});
			return;
		}

		console.log("facebook.poll");

		var query = {q: tag, type: 'post', access_token: access_token};
		var request = '/search?'+qs.stringify(query);
		console.log(request);

		graph.get(request, function(err, res){
			if(err) callback(err);
			else async.eachSeries(res.data, self.process_post, callback);
		});
	}
}

module.exports = Facebook;