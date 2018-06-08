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
			if (error.code === 401) {
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
		var _loads = {};
		return function (constructor, locals) {

			if (typeof(constructor) === "string") {
				var scope = locals.$scope;
				var name = constructor;
				scope.loaded = function (callback) {
					scope.$on('$viewContentLoaded', function () {
						if (_loads[name] !== scope.$id) {
							_loads[name] = scope.$id;
							callback(scope, name);
						}
					});
				};
				scope.closed = function (callback) {
					scope.$on('$destroy', function () {
						callback(scope, name);
					});
				};
			}
			return $delegate.apply(this, [].slice.call(arguments));
		}
	}]);
}]);
