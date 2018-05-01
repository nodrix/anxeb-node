'use strict';

anxeb.app.service('interceptor', ['$rootScope', '$q', '$injector', function ($rootScope, $q, $injector, session) {
	var _self = this;
	var _identified = false;
	_self.cache = {
		private : []
	};

	_self.headers = {};

	_self.response = function (response) {
		if (response.headers("routeAccess") === anxeb.Enums.RouteAccess.Private) {
			if (_self.cache.private.indexOf(response.config.url) === -1) {
				_self.cache.private.push(response.config.url);
			}
		}
		if (response.headers("identified")) {
			_identified = response.headers("identified") === "true";
		}
		return response;
	};

	_self.request = function (request) {
		if (request.url.startsWith("/anxeb/view/") || request.url.startsWith("/anxeb/container/") || request.url.startsWith("/anxeb/component/")) {
			if (_identified === false) {
				for (var i in _self.cache.private) {
					var cache = _self.cache.private[i];
					request.cache.remove(cache);
				}
				_self.cache.private = [];
			}
		}
		request.headers.source = "Client";

		for (var h in _self.headers) {
			request.headers[h] = _self.headers[h];
		}
		return request;
	};

	_self.responseError = function (response) {
		if (response.headers("routeType") !== anxeb.Enums.RouteType.Action) {
			if ($rootScope.onAsyncRequestFailed) {
				$rootScope.onAsyncRequestFailed(null, response);
			}
		}
		if (response.status === 401) {
			return true;
		}
		return $q.reject(response);
	};
}]);
