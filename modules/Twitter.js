var util = require('util');
var request = require('request');
var storage = require('node-persist');
var qs = require('querystring');
var async = require('async');
var fs = require('fs');

var TileImage = require('./TileImage');
var config = require('../config');

// https://dev.twitter.com/docs/auth/application-only-auth

var Twitter = function() {

	var self = this;
	var endpoint = "https://stream.twitter.com/1.1/statuses/filter.json";

	this.start = function(){

	}
}


module.exports = Twitter;