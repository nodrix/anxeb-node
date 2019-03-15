'use strict';

const utils = require('../common/utils');
const accessType = require('../middleware/route').access;

module.exports = function (routing, settings) {
	let _self = this;
	_self.routing = routing;
	_self.service = _self.routing.service;
	_self.settings = settings || {};
	_self.security = _self.service.security;
	_self.path = _self.settings.path ? _self.settings.path : '/anxeb/container';

	const isPublicContainer = function (name, childs) {
		var result = null;

		var iroutes = childs || _self.routing.routes;
		for (let r in iroutes) {
			let item = iroutes[r];
			if (item.container === name) {
				result = false;
				if (item.access === accessType.public) {
					return true;
				}
			} else if (item.childs) {
				var cresult = isPublicContainer(name, item.childs);
				if (cresult === true) {
					return true;
				} else if (cresult === false) {
					result = false;
				}
			}
		}

		return result;
	};

	_self.routing.mount.route(utils.general.path.join(_self.path, '*')).get(function (req, res, next) {
		let requestedContainer = utils.general.url.create(req.url).pathname.substring(_self.path.length + 1).replaceAll('./', '');
		let isPublic = isPublicContainer(requestedContainer);

		if (isPublic !== null) {
			let containerAccess = isPublic ? accessType.public : accessType.private;

			_self.security.checkpoint({
				access : containerAccess,
				path   : '/' + requestedContainer
			}, req, res, next).then(function () {
				let fullPath = utils.general.path.join(_self.service.renderer.settings.templates.containers, requestedContainer) + _self.service.renderer.settings.extension;
				if (utils.general.file.exists(fullPath)) {
					res.set('Access-Type', containerAccess);

					if (req.query.partial === undefined || (req.query.partial && req.query.partial.isTrue())) {
						res.render(fullPath, { layout : null });
					} else {
						res.render(fullPath);
					}
				} else {
					_self.service.log.exception.file_not_found.args(fullPath).throw();
				}
			});
		} else {
			_self.service.log.exception.container_not_found.args(requestedContainer, _self.service.key).throw();
		}
	});
};
