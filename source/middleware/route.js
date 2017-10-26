'use strict';

const Enums = require("./enums");

module.exports = function (params, type) {
	var _self = this;
	_self.service = params.service;
	_self.type = type;
	_self.dispatch = {};

	var checkIdentity = function (req, res, next) {
		if (params.access === Enums.RouteAccess.Private && !req.session.identity) {
			_self.service.log.exception.unauthorized_access.throw();
		}
		res.setTimeout(params.timeout || 5000, function () {
			_self.service.log.exception.request_timeout.throw({ next : next });
		});
		next();
	};

	var setupMethod = function (method) {
		var methodCall = function (req, res, next, options) {
			var preMethodConfig = function (req, res) {
				if (params.preMethodConfig) {
					params.preMethodConfig(req, res);
				}
				res.set("routeType", _self.type);
				res.set("routeAccess", params.access);
			};

			var postMethodConfig = function (req, res, payload) {
				if (params.postMethodConfig) {
					params.postMethodConfig(req, res, payload);
				}
				res.set("identified", !(req.session.identity === null || req.session.identity === undefined));
			};

			preMethodConfig(req, res);
			method({
				render   : function (payload) {
					if (res.finished || res.statusCode === 408) {
						return;
					}
					payload = payload || {};

					if (options && options.partial) {
						payload.layout = null;
					} else {
						if (params.parent) {
							payload.layout = "./" + params.container;
						} else {
							payload.layout = params.container;
						}
					}
					postMethodConfig(req, res, payload);
					res.render(params.view, payload);
				},
				send     : function (payload) {
					if (res.finished) {
						return;
					}
					payload = payload || {};

					postMethodConfig(req, res, payload);
					res.send(payload);
				},
				complete : function () {
					this.send();
				},
				redirect : function (page) {
					res.redirect(page);
				},
				socket   : _self.service.socket,
				service  : _self.service,
				log      : _self.service.log,
				models   : _self.service.models,
				session  : req.session,
				query    : req.query,
				params   : req.params,
				payload  : req.body,
				route    : _self,
				req      : req,
				res      : res,
				next     : next,
				custom   : _self.service.customContext,
				forward  : function (func) {
					func(req, res, next);
				}
			});
		};

		return {
			route    : function (req, res, next) {
				methodCall(req, res, next);
			},
			dispatch : function (req, res, next, options) {
				checkIdentity(req, res, function () {
					methodCall(req, res, next, options);
				});
			}
		}
	};

	var baseRoute = _self.service.router.route(params.path).all(function (req, res, next) {
		checkIdentity(req, res, next);
	});

	if (params.methods.get) {
		var getMethod = setupMethod(params.methods.get);
		_self.dispatch.get = getMethod.dispatch;
		baseRoute.get(getMethod.route);
	}

	if (params.methods.post) {
		var postMethod = setupMethod(params.methods.post);
		_self.dispatch.post = postMethod.dispatch;
		baseRoute.post(postMethod.route);
	}

	if (params.methods.delete) {
		var deleteMethod = setupMethod(params.methods.delete);
		_self.dispatch.delete = deleteMethod.dispatch;
		baseRoute.delete(deleteMethod.route);
	}
};
