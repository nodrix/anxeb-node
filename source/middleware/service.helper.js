'use strict';

const utils = require("../common/utils");
const path = require("path");
const Enums = require("../middleware/enums");

module.exports = {
	setInternatRoutes : function (service) {
		service.router.route("/anxeb/view/*").get(function (req, res, next) {
			var requestView = utils.url(req.url).pathname.substring(12).replace("./", "");

			var getStateByView = function (states, view) {

				for (var s in states) {
					var item = states[s];
					if (item.view === view) {
						return item;
					}
					if (item.childs) {
						state = getStateByView(item.childs, view);
						if (state) {
							return state;
						}
					}
				}
				return null;
			};

			var state = getStateByView(service.states, requestView);
			if (state) {
				for (var q in req.query) {
					if (q.startsWith("_")) {
						req.params[q.substring(1)] = req.query[q];
						delete req.query[q];
					}
				}

				if (req.query.full && req.query.full.isTrue()) {
					state.dispatch.get(req, res, next);
				} else {
					state.dispatch.get(req, res, next, {
						partial : true
					});
				}
			} else {
				service.log.exception.route_not_found.args(requestView).throw();
			}
		});

		service.router.route("/anxeb/container/*").get(function (req, res, next) {
				var requestContainer = utils.url(req.url).pathname.substring(17).replace("./", "");

				var isPublicContainer = false;
				for (var s in service.states) {
					var state = service.states[s];
					if (!state.parent && state.container && state.container === requestContainer && state.access === Enums.RouteAccess.Public) {
						isPublicContainer = true;
						break;
					}
				}

				if (!isPublicContainer && !req.session.identity) {
					service.log.exception.unauthorized_access.throw();
				}

				var fullPath = service.locate.path(service.settings.service.paths.templates.containers, requestContainer) + ".hbs";

				if (utils.file.exists(fullPath)) {
					res.set("routeAccess", isPublicContainer ? Enums.RouteAccess.Public : Enums.RouteAccess.Private);

					if (req.query.full && req.query.full.isTrue()) {
						res.render(fullPath);
					} else {
						res.render(fullPath, { layout : null });
					}
				} else {
					service.log.exception.file_not_found.args(fullPath).throw();
				}
			}
		)
		;

		service.router.route("/anxeb/component/*").get(function (req, res, next) {
			var requestPath = utils.url(req.url).pathname.substring(17).replace("./", "");
			var fullPath = service.locate.path(service.settings.service.paths.templates.components, requestPath) + ".hbs";
			if (utils.file.exist(fullPath)) {
				res.render(fullPath, { layout : null });
			} else {
				service.log.exception.file_not_found.args(fullPath).throw();
			}
		});

		service.router.route("/anxeb/controller/*").get(function (req, res, next) {
			var requestPath = utils.url(req.url).pathname.substring(18).replace("./", "");
			var fullPath = service.locate.path(service.settings.service.paths.controllers, requestPath);
			if (utils.file.exists(fullPath)) {
				res.sendFile(fullPath, {}, function (err) {
					if (err) {
						service.log.exception.http_server_file_response.args(fullPath, err).throw();
					}
				});
			} else {
				service.log.exception.file_not_found.args(fullPath).throw();
			}
		});

		service.router.route("/anxeb/bundle/*").get(function (req, res, next) {
			var requestPath = utils.url(req.url).pathname.substring(14).replace("./", "");

			if (requestPath.startsWith("computed/")) {
				res.set('Content-Type', 'application/javascript');
				var content = service.bundler.generate(requestPath.substring(9));
				if (content) {
					res.send(new Buffer(content));
				} else {
					service.log.exception.invalid_internal_api_request.args("bundles", requestPath, err).throw();
				}
			} else {
				var fullPath = path.join(__dirname, "../", "bundle", requestPath);
				if (utils.file.exists(fullPath)) {
					res.sendFile(fullPath, {}, function (err) {
						if (err) {
							service.log.exception.http_server_file_response.args(bundleFileName, err).throw();
						}
					});
				} else {
					service.log.exception.file_not_found.args(fullPath).throw();
				}
			}
		});
	}
};
