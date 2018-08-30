'use strict';

anxeb.app.run(function ($rootScope, request, session, page) {
	$rootScope.session = session;
	$rootScope.page = page;

	$rootScope.onAsyncRequestBegin = function (req) {
		if (page.requests.begins) {
			page.requests.begins(req);
		}
	};

	$rootScope.onAsyncRequestFailed = function (req, err) {
		if (err.data) {
			var error = typeof(err.data) === "string" ? JSON.parse(err.data) : err.data;
			page.notifications.push(new anxeb.Exception(error));
			if (error.code === 401 || error.code === 6013) {
				page.goto.login();
			}
		}
		if (page.requests.failed) {
			page.requests.failed(req, err);
		}
	};

	$rootScope.onAsyncRequestSuccess = function (req, res) {
		if (page.requests.sucess) {
			page.requests.sucess(req, res);
		}
	};
}).config(['$provide', function ($provide) {
	$provide.decorator('$controller', ['$delegate', function ($delegate) {
		var _routes = [];
		return function (constructor, locals) {

			if (typeof(constructor) === "string") {
				var scope = locals.$scope;
				var name = constructor;
				var parent = scope;
				var route = scope.$id;
				while (parent !== null) {
					parent = parent.$parent;
					if (parent) {
						route = parent.$id + '_' + route;
					}
				}
				var loadedCallback = null;
				var closedCallback = null;

				scope.loaded = function (callback) {
					loadedCallback = callback;
				};
				scope.closed = function (callback) {
					closedCallback = callback;
				};

				scope.$on('$viewContentLoaded', function () {
					if (!_routes.includes(route)) {
						_routes.push(route);
						if (!scope['_loaded' + name]) {
							var result = undefined;
							if (loadedCallback) {
								result = loadedCallback(scope, name);
							}
							scope['_loaded' + name] = result === undefined ? true : result;
						}
					}
				});

				scope.$on('$destroy', function () {
					if (_routes.includes(route)) {
						_routes.splice(_routes.indexOf(route), 1);
					}

					if (closedCallback) {
						closedCallback(scope, name);
					}
				});

			}
			return $delegate.apply(this, [].slice.call(arguments));
		}
	}]);
}]);
