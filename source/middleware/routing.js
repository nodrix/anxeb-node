'use strict';

const utils = require('../common/utils');
const Router = require('express').Router;
const bodyParser = require('body-parser');
const cors = require('cors')();
const fileUpload = require('express-fileupload');
const Stack = require('../common/stack').instance;
const eventTypes = require('../middleware/event').types;
const routeTypes = require('../middleware/route').types;
const Route = require('./route').instance;
const ViewRoute = require('../routes/view');
const ContainerRoute = require('../routes/container');
const BundleRoute = require('../routes/bundle');
const accessType = require('./route').access;

module.exports = {
	instance : function (service, settings) {
		let _self = this;

		_self.service = service;
		_self.settings = settings || {};
		_self.actions = {};
		_self.routes = {};
		_self.router = Router();
		_self.defaults = {
			routes : {
				exception    : null,
				unauthorized : null
			}
		};
		_self.internal = {};
		_self.base = _self.settings.base;

		_self.send = {
			error : function (req, res, err, status) {
				let buildResult = function (err) {
					return {
						message : err.message,
						code    : err.event !== undefined ? err.event.code : 0,
						stack   : _self.service.log.stack ? new Stack(err).substract.main() : null,
						meta    : err.meta !== undefined ? err.meta : undefined,
						inner   : null
					};
				};

				let response = buildResult(err);
				let inner = err;
				let inres = response;

				while (true) {
					inner = inner.inner;
					if (inner === null || inner === undefined) {
						break;
					} else {
						inres.inner = buildResult(inner);
						inres = inres.inner;
					}
				}

				res.status(status || 500);

				let isClient = req && req.headers && req.headers.source === 'Anxeb';

				if (isClient) {
					res.json(response);
				} else if (_self.defaults.routes.unauthorized && (
					err.event.code === _self.service.log.exception.unauthorized_access.code ||
					err.event.code === _self.service.log.exception.invalid_auth.code ||
					err.event.code === _self.service.log.exception.expired_token.code ||
					err.event.code === _self.service.log.exception.invalid_token.code)
				) {
					res.redirect(_self.defaults.routes.unauthorized.path);
				} else {
					if (_self.defaults.routes.exception !== null) {
						if (_self.defaults.routes.exception.container) {
							response.layout = _self.defaults.routes.exception.container;
						}
						res.render(_self.defaults.routes.exception.view, response);
					} else {
						res.send(response);
					}
				}
			}
		};

		_self.mount = {
			route : function (path) {
				return _self.router.route(path);
			}
		};

		_self.include = {
			route : function (name, params) {
				if (params) {
					params.name = params.name || name;

					let route = new Route(_self, params);

					if (route.type === routeTypes.unauthorized) {
						_self.defaults.routes.unauthorized = route;
					} else if (route.type === routeTypes.exception) {
						_self.defaults.routes.exception = route;
					}

					if (route.type !== routeTypes.exception) {
						_self.routes[route.name] = route;
					}
				}
			}
		};

		_self.init = function () {
			_self.routes = {};

			_self.internal.view = new ViewRoute(_self, _self.settings.internal ? _self.settings.internal.view : undefined);
			_self.internal.container = new ContainerRoute(_self, _self.settings.internal ? _self.settings.internal.container : undefined);
			_self.internal.bundle = new BundleRoute(_self, _self.settings.internal ? _self.settings.internal.bundle : undefined);

			if (_self.settings.routes) {
				_self.service.fetch.modules(_self.settings.routes, 'routes').map(function (item) {
					_self.include.route(item.name, item.module);
				});
			}
		};

		_self.retrieve = {
			byView            : function (requestedView, childs) {
				var iroutes = childs || _self.routes;
				for (let r in iroutes) {
					let item = iroutes[r];
					if (item.view === requestedView) {
						return item;
					} else if (item.childs) {
						var result = _self.retrieve.byView(requestedView, item.childs);
						if (result) {
							return result;
						}
					} else {
						return null;
					}
				}
				return null;
			}
		};

		_self.service.express.use(bodyParser.json(_self.settings.parsers && _self.settings.parsers.json ? _self.settings.parsers.json : {
			limit : '50mb'
		}));

		_self.service.express.use(bodyParser.urlencoded(_self.settings.parsers && _self.settings.parsers.url ? _self.settings.parsers.url : {
			limit    : '50mb',
			extended : true
		}));

		_self.service.express.use(bodyParser.raw(_self.settings.parsers && _self.settings.parsers.raw ? _self.settings.parsers.raw : {
			limit : '50mb'
		}));

		_self.service.express.use(bodyParser.text(_self.settings.parsers && _self.settings.parsers.text ? _self.settings.parsers.text : {
			limit : '50mb'
		}));

		_self.service.express.use(fileUpload(_self.settings.upload ? _self.settings.upload : {
			limits       : { fileSize : 50 * 1024 * 1024 },
			abortOnLimit : true
		}));

		_self.service.express.use(cors);

		_self.service.express.use(_self.router);

		_self.service.express.use(function (req, res, next) {
			let err = _self.service.log.exception.page_not_found.args(req.url).print().toError();

			_self.send.error(req, res, err, 404);
		});

		_self.service.express.use(function (err, req, res, next) {
			let event = null;

			if (err.event !== undefined) {
				event = err.event;
			} else {
				event = _self.service.log.exception.unhandled_exception.args(err.message, err);
				err = event.toError();
			}
			event.print();

			_self.send.error(req, res, err, event.type === eventTypes.http_error ? event.code : 500);
		});

		_self.init();
	}
};