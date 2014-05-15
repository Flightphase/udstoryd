

/**
*	@param func_to_repeat  The function to call over and over again
*	@param pause How long to wait after the func_to_repeat finishes before calling it again 
*	@param err_callback callback will only be called if func_to_repeat throws an error
*/
var repeat = function(func_to_repeat, pause, callback) {

	! function _repeat() {
		func_to_repeat(function(err){
			if(err) callback(err);
			else setTimeout(_repeat, pause);
		});
	}();
}

module.exports = repeat;