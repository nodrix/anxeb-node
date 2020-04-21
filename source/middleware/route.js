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
		_self.parent = parent || params.parent || null;
		_self.type = params.type || (parent ? parent.type : Route.types.action);
		_self.container = _self.type !== Route.types.action ? (params.container) : null;
		_self.prefix = parent == null ? (params.prefix || (_self.type === Route.types.action ? _self.routing.prefixes.actions : undefined) || (_self.type === Route.types.view ? _self.routing.prefixes.views : undefined)) : undefined;
		_self.name = _self.prefix ? utils.general.url.hierarchy(_self.prefix) + '.' + params.name : params.name;
		_self.view = _self.type !== Route.types.action ? (params.view || (parent ? parent.view + '/' + _self.name : _self.name)) : null;
		_self.url = utils.general.url.normalize(params.url ? params.url : params.name);
		_self.url = _self.prefix ? utils.general.url.normalize(utils.general.path.join(utils.general.url.normalize(_self.prefix), _self.url)) : _self.url;
		_self.alias = params.alias ? utils.general.url.normalize(params.alias) : null;
		_self.path = parent ? utils.general.path.join(parent.path, _self.url) : _self.url;
		_self.link = parent ? utils.general.path.join(parent.link, _self.url) : utils.general.url.normalize(utils.general.path.join('/', _self.container || '/', _self.url));
		_self.identifier = (_self.link.startsWith('/') ? _self.link.substr(1) : _self.link).replace('/', '.');
		_self.access = params.access || (parent ? parent.access : Route.access.public);
		_self.roles = params.roles || (parent ? parent.roles : null);
		_self.owners = params.owners || (parent ? parent.owners : null);
		_self.timeout = params.timeout || (parent ? parent.timeout : 5000);
		_self.tag = params.tag || (parent ? parent.tag : null);
		_self.context = params.context;
		_self.childs = {};
		_self.methods = {};

		let _methods = params.methods;
		let _socket = params.socket;

		if (_socket && _socket.callbacks) {
			_self.service.socket.include.namespace(_self.name, {
				path      : _socket.path || _self.path,
				access    : _self.access,
				owners    : _self.owners,
				roles     : _self.roles,
				client    : _socket.client,
				callbacks : _socket.callbacks,
				context   : _socket.context
			});
		}

		if (_self.routing.base) {
			_self.routing.mount.route(_self.path).all(function (req, res, next) {
				let bearer = _self.service.security.route.bearer(req, res);
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
				setupMethods(path, _self.access, _self.roles, _self.owners);
			}
		};

		const getBase = function (path, access, roles, owners) {
			return {
				route  : _self.routing.mount.route(path).all(function (req, res, next) {
					_self.service.security.route.checkpoint({
						access : access,
						path   : path,
						roles  : roles,
						owners : owners
					}, req, res, next).then(next);
				}),
				path   : path,
				access : access
			}
		};

		const setupMethods = function (path, access, roles, owners) {
			if (_methods) {
				let base = getBase(path, access, roles, owners);

				if (_methods.get) {
					_self.methods.get = new Method(_self, base, _methods.get, methodTypes.get);
				}

				if (_methods.post) {
					_self.methods.post = new Method(_self, base, _methods.post, methodTypes.post);
				}

				if (_methods.put) {
					_self.methods.put = new Method(_self, base, _methods.put, methodTypes.put);
				}

				if (_methods.delete) {
					_self.methods.delete = new Method(_self, base, _methods.delete, methodTypes.delete);
				}
			}
		};

		setupMethods(_self.path, _self.access, _self.roles, _self.owners);

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