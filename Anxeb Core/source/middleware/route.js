'use strict';

const utils = require('../common/utils');
const Method = require('./method').instance;
const methodTypes = require('./method').types;
const Context = require('./context').instance;

const Route = {
	types    : {
		view         : 'view',
		unauthorized : 'unauthorized',
		exception    : 'exception',
		action       : 'action'
	},
	access   : {
		private : 'private',
		public  : 'public'
	},
	instance : function (routing, params, parent) {
		let _self = this;
		_self.$params = params;
		_self.routing = routing;
		_self.service = routing.service;
		_self.parent = parent || null;
		_self.name = params.name;
		_self.type = params.type || (parent ? parent.type : Route.types.action);
		_self.view = _self.type !== Route.types.action ? (params.view || (parent ? parent.view + '/' + _self.name : _self.name)) : null;
		_self.container = _self.type !== Route.types.action ? (params.container) : null;
		_self.url = utils.general.url.normalize(params.url ? params.url : '/' + _self.name);
		_self.alias = params.alias ? utils.general.url.normalize(params.alias) : null;
		_self.path = utils.general.url.normalize(parent ? utils.general.path.join(parent.path, _self.url) : _self.url);
		_self.link = utils.general.url.normalize(parent ? utils.general.path.join(parent.link, _self.url) : utils.general.path.join('/', _self.container || '/', _self.url));
		_self.access = params.access || (parent ? parent.access : Route.access.public);
		_self.timeout = params.timeout || (parent ? parent.timeout : 5000);
		_self.tag = params.tag || (parent ? parent.tag : null);
		_self.context = params.context;
		_self.childs = {};
		_self.methods = {};

		let _methods = params.methods;

		if (_self.routing.base) {
			_self.routing.mount.route(_self.path).all(function (req, res, next) {
				let bearer = _self.service.security.bearer(req, res);
				res.set('route_type', _self.type);
				res.set('Access-Type', _self.access);

				_self.routing.base(new Context(_self, {
					req    : req,
					res    : res,
					next   : next,
					bearer : bearer
				}));

				res.setTimeout(_self.timeout || 5000, function () {
					_self.service.log.exception.request_timeout.throw({ next : next });
				});
			})
		}

		_self.setAlias = function (path) {
			if (path !== _self.path) {
				setupMethods(path, _self.access);
			}
		};

		const getBase = function (path, access) {
			return {
				route  : _self.routing.mount.route(path).all(function (req, res, next) {
					_self.service.security.checkpoint({
						access : access,
						path   : path
					}, req, res, next).then(next);
				}),
				path   : path,
				access : access
			}
		};

		const setupMethods = function (path, access) {
			if (_methods) {
				let base = getBase(path, access);

				if (_methods.get) {
					_self.methods.get = new Method(_self, base, _methods.get, methodTypes.get);
				}

				if (_methods.post) {
					_self.methods.post = new Method(_self, base, _methods.post, methodTypes.post);
				}

				if (_methods.delete) {
					_self.methods.delete = new Method(_self, base, _methods.delete, methodTypes.delete);
				}
			}
		};

		setupMethods(_self.path, _self.access);

		if (_self.alias) {
			_self.setAlias(_self.alias);
		}

		if (params.childs) {
			for (let key in params.childs) {
				let item = params.childs[key];
				item.name = item.name ? item.name : key;
				_self.childs[key] = new Route.instance(_self.routing, item, _self);
			}
		}
	}
};

module.exports = Route;