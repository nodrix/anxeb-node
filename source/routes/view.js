'use strict';

const utils = require('../common/utils');

module.exports = function (routing, settings) {
	let _self = this;
	_self.routing = routing;
	_self.service = _self.routing.service;
	_self.settings = settings || {};
	_self.security = _self.service.security;
	_self.path = _self.settings.path ? _self.settings.path : '/anxeb/view';

	_self.routing.mount.route(utils.general.path.join(_self.path, '*')).get(function (req, res, next) {
		let requestedView = utils.general.url.create(req.url).pathname.substring(_self.path.length + 1).replaceAll('./', '');
		let route = _self.routing.retrieve.byView(requestedView);

		if (route) {
			_self.security.checkpoint({
				access : route.access,
				path   : route.path,
				roles  : route.roles
			}, req, res, next).then(function () {
				res.set('Route-Type', route.type);
				res.set('Access-Type', route.access);

				for (let q in req.query) {
					if (q.startsWith('_')) {
						req.params[q.substring(1)] = req.query[q];
						delete req.query[q];
					}
				}

				route.methods.get.dispatch(req, res, next, {
					partial : req.query.partial ? req.query.partial.isTrue() : true
				});
			});
		} else {
			_self.service.log.exception.view_not_found.args(requestedView, _self.service.key).throw();
		}
	});
};