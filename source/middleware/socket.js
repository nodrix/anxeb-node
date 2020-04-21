'use strict';

const Namespace = require('./namespace').instance;
const http = require('http');
const request = require('request');
const ip = require('ip');
const requestpn = require('request-promise-native');
const Stack = require('../common/stack').instance;

module.exports = {
	instance : function (service, settings) {
		let _self = this;
		_self.service = service;
		_self.settings = settings || {};
		_self.host = _self.settings.host || ip.address() || '127.0.0.1';
		_self.port = _self.settings.port || '8080';
		_self.protocol = _self.settings.protocol || 'http';
		_self.uri = (_self.protocol ? _self.protocol : 'http') + '://' + _self.host + ':' + _self.port;
		_self.namespaces = {};
		_self.server = http.createServer(service.express);

		let _options = _self.settings.options || {};
		let _cors = _self.settings.cors || {};

		_options.serveClient = false;

		let _origin = _cors.origin;
		let _headers = _cors.exposedHeaders || [];
		let _methods = _cors.methods;
		let _credentials = _cors.credentials;
		let _maxAge = _cors.maxAge;

		_headers.push('Content-Type');
		_headers.push('Authorization');
		_headers.push('Room');
		_headers.push('Origin');
		_headers.push('Accept');

		_options.handlePreflightRequest = function (req, res) {
			const headers = {};

			headers['Access-Control-Allow-Headers'] = _headers.join(', ');
			headers['Access-Control-Allow-Credentials'] = _credentials != null ? _credentials : true;

			if (_origin || req.headers.origin) {
				headers['Access-Control-Allow-Origin'] = _origin != null && _origin instanceof Array ? _origin.join(', ') : (_origin || req.headers.origin);
			}
			if (_methods) {
				headers['Access-Control-Allow-Methods'] = _methods instanceof Array ? _methods.join(', ') : _methods;
			}
			if (_maxAge) {
				headers['Access-Control-Max-Age'] = _maxAge instanceof Array ? _maxAge.join(', ') : _maxAge;
			}
			res.writeHead(200, headers);
			res.end();
		};

		_self.io = require('socket.io')(_self.server, _options);
		let _request = requestpn;

		_self.do = {
			get    : _request.get,
			post   : _request.post,
			put    : _request.put,
			delete : _request.delete
		};

		_self.io.of(function (name, query, next) {
			let err = _self.service.log.exception.namespace_not_found.args(name).print().toError();
			return next(Error(JSON.stringify({
				message : err.message,
				route   : _self.service.log.route ? err.route : undefined,
				code    : err.event !== undefined ? err.event.code : 0,
				stack   : _self.service.log.stack ? new Stack(err).substract.main() : undefined,
				meta    : err.meta !== undefined ? err.meta : undefined,
				inner   : null
			})));
		});

		_self.include = {
			namespace : function (name, module) {
				if (module) {
					module.path = module.path || ('/' + name);
					module.name = module.path.replaceAll('/', '');
					_self.namespaces[module.name] = new Namespace(_self, module, _self.io);
				}
			}
		};

		_self.of = function () {
			return _self.io.of.apply(_self.io, Array.from(arguments));
		}

		_self.listen = function () {
			return new Promise(function (resolve, reject) {
				_self.io.httpServer.listen(_self.port, _self.host, function () {
					_self.service.log.debug.service_started.args(_self.uri).print();
					resolve();
				}).on('error', function (err) {
					_self.service.log.exception.http_server_initialization_failed.args(_self.host, _self.port, err).throw();
					reject(err);
				});
			});
		};

		_self.init = function () {
			if (_self.settings.namespaces) {
				_self.service.fetch.modules(_self.settings.namespaces, 'socket namespaces').map(function (item) {
					_self.include.namespace(item.name, item.module);
				});
			}
		};

		_self.init();
	}
};
