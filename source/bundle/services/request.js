'use strict';

anxeb.app.service("request", function ($http, $rootScope) {
	var _self = this;

	_self.queue = {
		list    : [],
		process : function () {
			var currentRequestCount = 0;
			var i = 0;
			var request;
			var itemCount = _self.queue.list.length;

			for (i = itemCount - 1; i >= 0; i--) {
				request = _self.queue.list[i];
				if (request.state === anxeb.Enums.RequestState.Busy) {
					currentRequestCount++;
				}
				if (!(request.state === anxeb.Enums.RequestState.StandBy || request.state === anxeb.Enums.RequestState.Busy)) {
					_self.queue.list.splice(0, 1);
				}
			}

			itemCount = _self.queue.list.length;

			for (i = 0; i < itemCount; i++) {
				request = _self.queue.list[i];
				if (currentRequestCount < 6) {
					if (request.state === anxeb.Enums.RequestState.StandBy) {
						currentRequestCount++;
						request.execute();
					}
				} else {
					break;
				}
			}
		},
		release : function () {
			for (var i = 0; i < _self.queue.list.length; i++) {
				var request = _self.queue.list[i];
				request.state = anxeb.Enums.RequestState.Canceled;
			}
			_self.queue.list = [];
		}
	};

	var Request = function (params, callbacks) {
		var _request = this;
		var _callbacks = callbacks;

		_request.method = params.method;
		_request.url = params.url;
		_request.headers = params.headers;
		_request.data = params.data;
		_request.options = params.options;
		_request.state = anxeb.Enums.RequestState.StandBy;

		var updateRoot = function () {
			$rootScope.page.requests.queue = _self.queue;
		};

		var begin = function () {
			if (_request.state === anxeb.Enums.RequestState.Busy) {
				return false;
			}
			_request.state = anxeb.Enums.RequestState.Busy;
			updateRoot();
			if ($rootScope.onAsyncRequestBegin) {
				$rootScope.onAsyncRequestBegin(_request);
			}
			return true;
		};

		var failed = function (err) {
			updateRoot();
			/*if ($rootScope.onAsyncRequestFailed) {
				$rootScope.onAsyncRequestFailed(_request, err);
			}*/
			if (_callbacks.failed !== null && _callbacks.failed !== undefined) {
				_callbacks.failed(err, _request);
			}
		};

		var canceled = function () {
			updateRoot();
			/*if ($rootScope.onAsyncRequestFailed) {
				$rootScope.onAsyncRequestFailed(_request);
			}*/
			if (_callbacks.failed !== null && _callbacks.failed !== undefined) {
				_callbacks.failed(null, _request);
			}
		};

		var completed = function (response) {
			updateRoot();
			if ($rootScope.onAsyncRequestSuccess) {
				$rootScope.onAsyncRequestSuccess(_request, response);
			}
			if (_callbacks.sucess !== null && _callbacks.sucess !== undefined) {
				_callbacks.sucess(response, _request);
			}
		};

		var nextRequest = function () {
			_self.queue.process();
		};

		_request.execute = function () {
			if (!begin()) {
				return;
			}

			if (_request.options && _request.options.bearer !== undefined) {
				if (!_request.headers) {
					_request.headers = {};
				}
				_request.headers["Authorization"] = "Bearer " + _request.options.bearer
			}

			if (_request.options && _request.options.client !== undefined) {
				if (!_request.headers) {
					_request.headers = {};
				}
				_request.headers['ClientOptions'] = _request.options.client;
			} else if (_request.headers && _request.headers["ClientOptions"]) {
				_request.headers["ClientOptions"] = undefined;
			}

			$http({
				method  : _request.method,
				url     : _request.url,
				headers : _request.headers,
				data    : _request.data
			}).then(function (response) {
				if (_request.canceled) {
					canceled();
				} else {
					_request.state = anxeb.Enums.RequestState.Completed;
					nextRequest();
					completed(response);
				}
			}, function (err) {
				if (_request.canceled) {
					canceled();
				} else {
					_request.state = anxeb.Enums.RequestState.Failed;
					nextRequest();
					failed(err);
				}
			});
		}
	};

	var push = function (params) {
		var _push = this;
		var _sucessCallback = null;
		var _failedCallback = null;

		_push.params = params || {};

		_push.success = function (callback) {
			_sucessCallback = callback;
			return this;
		};

		_push.failed = function (callBack) {
			_failedCallback = callBack;
			return this;
		};

		_push.go = function (options) {
			_push.params.options = options;

			var request = new Request(_push.params, {
				sucess : _sucessCallback,
				failed : _failedCallback
			});

			_self.queue.list.push(request);
			_self.queue.process();

			return request;
		};

	};

	_self.method = function (method, url, params, headers) {
		return new push({
			method  : method,
			url     : url,
			headers : headers,
			data    : params
		});
	};

	_self.post = function (url, params, headers) {
		return new push({
			method  : "POST",
			url     : url,
			headers : headers,
			data    : params
		});
	};

	_self.get = function (url, params, headers) {
		return new push({
			method  : "GET",
			url     : url,
			headers : headers,
			data    : params
		});
	};

	_self.del = function (url, params, headers) {
		return new push({
			method  : "DELETE",
			url     : url,
			headers : headers,
			data    : params
		});
	};
});
