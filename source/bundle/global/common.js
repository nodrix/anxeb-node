'use strict';

anxeb.app.run(function ($rootScope, request, session, page) {
	$rootScope.session = session;
	$rootScope.page = page;
	$rootScope.requests = {
		queue : request.queue
	};

	$rootScope.notifications = {
		list  : [],
		push  : function (item) {
			var _self = this;
			_self.list.push(item);

			setTimeout(function () {
				_self.list = _self.list.filter(function (listItem) {
					return item !== listItem;
				});
				$rootScope.$apply();
			}, 5000);
		},
		clear : function () {
			this.list = [];
		}
	};

	$rootScope.onAsyncRequestBegin = function (req) {
		if ($rootScope.requests.begins) {
			$rootScope.requests.begins(req);
		}
	};

	$rootScope.onAsyncRequestFailed = function (req, err) {
		if (err.data) {
			var error = typeof(err.data) === "string" ? JSON.parse(err.data) : err.data;
			$rootScope.notifications.push(new anxeb.Event(error));
			if (error.code === 401) {
				page.goto.login();
			}
		}
		if ($rootScope.requests.failed) {
			$rootScope.requests.failed(req, err);
		}
	};

	$rootScope.onAsyncRequestSuccess = function (req, res) {
		if ($rootScope.requests.sucess) {
			$rootScope.requests.sucess(req, res);
		}
	};

});
