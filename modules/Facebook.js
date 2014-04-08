var storage = require('node-persist');
var graph = require('fbgraph');


var Facebook = function(options) {
	var self = this;

	this.poll = function(done){

		graph.get("zuck?fields=picture", function(err, res) {
			console.log(res); // { picture: 'http://profile.ak.fbcdn.net/'... }
		});
	}
}

module.exports = Facebook;