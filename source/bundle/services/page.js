'use strict';

anxeb.app.service("page", function ($state, $location, $stateParams) {
	var _self = this;
	$state.defaultErrorHandler(function () { });
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
