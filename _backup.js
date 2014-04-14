app.get('/instagram/subscribe', function(req, res){
	Instagram.subscriptions.handshake(req, res); 
});

app.post('/instagram/subscribe', function(req, res){
	console.log(req.body);
	res.send(200);
});

app.get('/facebook/return', function(req, res){
	console.log(req.query);
	graph.authorize({
		  "client_id":      fbconf.client_id
		, "redirect_uri":   fbconf.redirect_uri
		, "client_secret":  fbconf.client_secret
		, "code":           req.query.code
	}, function (err, facebookRes) {
		res.redirect('/');
	});
})

app.get('/facebook/link', function(req, res){

	// get authorization url
	var authUrl = graph.getOauthUrl({
	    "client_id":     fbconf.client_id
	  , "redirect_uri":  fbconf.redirect_uri
	});

	// shows dialog
	res.redirect(authUrl);
});
