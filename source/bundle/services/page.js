'use strict';

anxeb.app.service("page", function ($state, $location, $stateParams) {
	var _self = this;
	_self.state = {};

	$state.defaultErrorHandler(function () { });

	_self.load = function (state, params) {
		return $state.go(state, params, {
			reload : false,
			cache  : false
		});
	};


	_self.redirect = function (state, params) {
		return $state.go(state, params, {
			reload : true,
			cache  : false
		});
	};

	Object.defineProperty(_self, "params", {
		get : function () {
			return $stateParams;
		}
	});

	Object.defineProperty(_self.state, "data", {
		get : function () {
			return $state.current.data;
		}
	});

	_self.goto = {
		login : function () {
			if (anxeb.defaults.states.login) {
				$state.go(anxeb.defaults.states.login, {
					reload : true,
					cache  : false
				});
			}
		}
	}
});
