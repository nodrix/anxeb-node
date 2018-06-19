'use strict';

var Enums = require("./enums");
var utils = require('../common/utils');

module.exports = function (params, type) {
	var _self = this;
	_self.service = params.service;
	_self.type = type;
	_self.dispatch = {};

	var checkIdentity = function (req, res, next) {
		var call = {
			req  : req,
			res  : res,
			next : next
		};

		if (params.access !== Enums.RouteAccess.Public) {
			if (_self.service.keys) {
				var bearer = utils.getBearer(req, res);

				if (bearer && bearer.client !== undefined) {
					if (params.access === Enums.RouteAccess.Private) {
						if (bearer.token) {
							_self.service.keys.verify(bearer.token, function (err, auth) {
								if (err) {
									if (err.message === 'jwt expired') {
										_self.service.log.exception.expired_token.throw();
									} else {
										_self.service.log.exception.invalid_auth.args(err).throw();
									}
								} else {
									if (auth.body.access !== null) {
										if (!utils.canAccess(auth.body.access, params.path, req.method)) {
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
					}
				}
			} else {
				if (params.access === Enums.RouteAccess.Private && !req.session.identity) {
					_self.service.log.exception.unauthorized_access.throw();
				}
			}
		}

		next();
	};

	var setupMethod = function (method) {
		var methodCall = function (req, res, next, options) {
			var bearer = utils.getBearer(req, res);

			var call = {
				req  : req,
				res  : res,
				next : next
			};

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
				res.set("identified", (req.session.identity !== null && req.session.identity !== undefined) || (req.session.bearer !== null && req.session.bearer !== undefined));
			};

			preMethodConfig(req, res);

			if (bearer && bearer.token) {
				bearer.auth = _self.service.keys.decode(bearer.token);
			} else if (params.access === Enums.RouteAccess.Private) {
				_self.service.log.exception.unauthorized_access.throw();
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
				image       : function (data) {
					var img = data;

					if (data.startsWith('data:image/jpeg;base64')) {
						data = data.replace(/^data:image\/jpeg;base64,/, "");
						img = new Buffer(data, 'base64');
						res.type('jpeg');
					} else if (data.startsWith('data:image/png;base64')) {
						data = data.replace(/^data:image\/png;base64,/, "");
						img = new Buffer(data, 'base64');
						res.type('png');
					}

					res.end(img);
				},
				complete    : function () {
					this.send();
				},
				ok          : function () {
					this.send();
				},
				invalid     : function () {
					_self.service.log.exception.invalid_request.throw(this);
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
				sign        : function (payload, options) {
					this.send(_self.service.sign(payload, options));
				},
				auth        : function (payload, options) {
					var token = _self.service.sign(payload, options);
					if (options && options.parent && options.parent.token) {
						options.parent.token = token;
						req.session.bearer = options.parent;
					}
					return token;
				},
				logout      : function () {
					req.session.bearer = undefined;
				}
			});

			res.setTimeout(params.timeout || 5000, function () {
				_self.service.log.exception.request_timeout.throw({ next : next });
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
