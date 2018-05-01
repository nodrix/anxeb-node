'use strict';

const Enums = require("./enums");

module.exports = function (params, type) {
	var _self = this;
	_self.service = params.service;
	_self.type = type;
	_self.dispatch = {};

	var checkIdentity = function (req, res, next) {
		if (params.access !== Enums.RouteAccess.Public) {
			if (_self.service.keys) {
				if (res.bearer && res.bearer.client) {
					if (params.access === Enums.RouteAccess.Private) {
						if (res.bearer.token) {
							_self.service.keys.verify(res.bearer.token, function (err, auth) {
								if (err) {
									if (err.message === 'jwt expired') {
										_self.service.log.exception.expired_token.throw();
									} else {
										_self.service.log.exception.invalid_auth.args(err).throw();
									}
								} else {
									if (auth.body.access !== null) {
										if (auth.body.access.indexOf(params.path) < 0) {
											_self.service.log.exception.unauthorized_access.throw();
										}
									}
								}
							});
						} else if (!req.session.identity) {
							_self.service.log.exception.unauthorized_access.throw();
						}
					}
				} else {
					if (!req.session.identity) {
						_self.service.log.exception.unauthorized_access.throw();
						//_self.service.log.exception.invalid_token.throw({ next : next });
					}
				}
			} else {
				if (params.access === Enums.RouteAccess.Private && !req.session.identity) {
					_self.service.log.exception.unauthorized_access.throw();
				}
			}
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

			var bearer = res.bearer;
			if (bearer && bearer.token) {
				bearer.auth = _self.service.keys.decode(bearer.token);
			}
			method({
				render      : function (payload) {
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
				send        : function (payload) {
					if (res.finished) {
						return;
					}
					payload = payload || {};

					postMethodConfig(req, res, payload);
					res.send(payload);
				},
				complete    : function () {
					this.send();
				},
				ok          : function () {
					this.send();
				},
				redirect    : function (page) {
					res.redirect(page);
				},
				socket      : _self.service.socket,
				service     : _self.service,
				log         : _self.service.log,
				models      : _self.service.models,
				session     : req.session,
				query       : req.query,
				params      : req.params,
				payload     : req.body,
				bearer      : bearer,
				route       : _self,
				req         : req,
				res         : res,
				next        : next,
				application : _self.service.application,
				forward     : function (func) {
					func(req, res, next);
				},
				sign        : function (payload) {
					this.send(_self.service.sign(payload));
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

	if (params.methods) {
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
	}
};
