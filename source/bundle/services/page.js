'use strict';

anxeb.app.service("page", function ($rootScope, $state, $location, $stateParams, request) {
	var _self = this;

	_self.title = $state.current.data ? $state.current.data.title : null;
	_self.icon = $state.current.data ? $state.current.data.icon : null;
	_self.menu = $state.current.menu ? $state.current.data.menu : {};
	_self.tabs = $state.current.tabs ? $state.current.data.tabs : {};
	_self.href = null;
	_self.settings = {
		notifications : {
			maximum : 1,
			timeout : 3000
		}
	};

	$state.defaultErrorHandler(function () { });

	_self.setup = function (params) {
		_self.title = params.title;
		_self.key = params.key;
		_self.icon = params.icon;
		_self.menu = params.menu ? params.menu : {};
		_self.tabs = params.tabs ? params.tabs : {};
		_self.settings = params.settings || _self.settings;
	};

	_self.reset = function () {
		_self.title = null;
		_self.icon = null;
		_self.menu = null;
		_self.tabs = null;
		_self.scopes = {};
		_self.notifications.clear();
	};

	_self.load = function (state, params, options) {
		var href = $state.href(state, params);

		if (_self.href !== href) {
			_self.href = href;
			if (!options || options.reset === undefined || options.reset === true) {
				_self.reset();
			}
			return $state.go(state, params, {
				reload : options && options.reload !== undefined ? options.reload : false,
				cache  : false
			});
		}
	};

	_self.redirect = function (state, params) {
		var href = $state.href(state, params);

		if (_self.href !== href) {
			_self.href = href;
			_self.reset();
		}
		return $state.go(state, params, {
			reload : true,
			cache  : false
		});
	};

	_self.requests = {
		queue : request.queue
	};

	_self.notifications = {
		list  : [],
		push  : function (item) {
			if (_self.notification) {
				if (_self.notification.type === item.type && _self.notification.message === item.message) {
					return;
				}
			}

			var _notifications = this;

			_notifications.list.push(item);
			item.visible = true;

			if (_self.settings.notifications.maximum > 0) {
				setTimeout(function () {
					for (var i = 0; i < _notifications.list.length - _self.settings.notifications.maximum; i++) {
						var hid = _notifications.list[i];
						hid.visible = false;
					}
					$rootScope.$apply();
				}, 0);
			}

			setTimeout(function () {
				item.visible = false;
				$rootScope.$apply();

				setTimeout(function () {
					_notifications.list = _notifications.list.filter(function (listItem) {
						return item !== listItem;
					});
				}, 400);
			}, _self.settings.notifications.timeout);
		},
		clear : function () {
			this.list = [];
		}
	};

	Object.defineProperty(_self, "notification", {
		get : function () {
			return _self.notifications.list.length ? _self.notifications.list[_self.notifications.list.length - 1] : null;
		}
	});

	Object.defineProperty(_self, "params", {
		get : function () {
			return $stateParams;
		}
	});

	Object.defineProperty(_self, "state", {
		get : function () {
			return $state;
		}
	});

	_self.includes = function (state) {
		return $state.includes(state);
	};

	Object.defineProperty(_self, "data", {
		get : function () {
			return $state.current.data;
		}
	});

	Object.defineProperty(_self, "current", {
		get : function () {
			return $state.current;
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
