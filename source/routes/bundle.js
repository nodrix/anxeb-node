'use strict';

const utils = require('../common/utils');

module.exports = function (routing, settings) {
	let _self = this;
	_self.routing = routing;
	_self.service = _self.routing.service;
	_self.settings = settings || {};
	_self.security = _self.service.security;
	_self.path = _self.settings.path ? _self.settings.path : '/anxeb/bundle';
	_self.list = {};

	let getAnxebObject = function () {
		var result = [];
		result.push('var anxeb = ' + utils.general.data.format({
			settings : {
				client  : _self.service.client,
				routing : {
					defaults  : {
						exception    : _self.service.routing.defaults.routes.exception ? _self.service.routing.defaults.routes.exception.path : null,
						unauthorized : _self.service.routing.defaults.routes.unauthorized ? _self.service.routing.defaults.routes.unauthorized.path : null,
					},
					view      : {
						path : _self.service.routing.internal.view.path
					},
					container : {
						path : _self.service.routing.internal.container.path
					},
					bundle    : {
						path : _self.service.routing.internal.bundle.path
					}
				}
			}
		}, '', true) + ';');

		return result
	};

	_self.include = {
		content : function (key, params) {
			if (params.path && !utils.general.file.exists(params.path)) {
				_self.service.log.exception.parameter_file_not_found.args(params.path).throw();
			} else {
				_self.list[key] = params;
			}
		},
		anxeb   : function () {
			_self.list['core/anxeb.js'] = {
				content : getAnxebObject(),
				type    : 'application/javascript'
			};
			_self.list['core/utils.js'] = {
				path : require.resolve('../client/utils.js'),
				type : 'application/javascript'
			};

			_self.list['core/prototypes.js'] = {
				path : require.resolve('../client/prototypes.js'),
				type : 'application/javascript'
			};
		}
	};

	_self.routing.mount.route(utils.general.path.join(_self.path, '*')).get(function (req, res, next) {
		let requestedBundle = utils.general.url.create(req.url).pathname.substring(_self.path.length + 1).replaceAll('./', '');
		let bundle = _self.list[requestedBundle];

		if (bundle) {
			if (bundle.path && !utils.general.file.exists(bundle.path)) {
				_self.service.log.exception.bundle_not_found.args(requestedBundle, _self.service.key).throw();
			} else {
				_self.security.checkpoint({
					access : bundle.access,
					path   : '/' + requestedBundle
				}, req, res, next).then(function () {
					res.set('Bundle-Access', bundle.access);
					if (bundle.type) {
						res.set('Content-Type', bundle.type);
					}
					if (bundle.path) {
						if (utils.general.file.exists(bundle.path)) {
							res.sendFile(bundle.path, {
								headers : bundle.header
							}, function (err) {
								if (err) {
									_self.service.log.exception.http_server_file_response.args(bundle.path, err).throw();
								}
							});
						} else {
							_self.service.log.exception.file_not_found.args(bundle.path).throw();
						}
					} else {
						if (bundle.content instanceof Array) {
							res.send(bundle.content.join('\n') + '\n');
						} else {
							res.send(bundle.content + '\n');
						}
					}
				});
			}
		} else {
			_self.service.log.exception.bundle_not_found.args(requestedBundle, _self.service.key).throw();
		}
	});
};
