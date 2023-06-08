'use strict';

const Namespace = require('./namespace').instance;
const http = require('http');
const https = require('https');
const axios = require('axios');
const ip = require('ip');

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
		_headers.push('Client-Room');
		_headers.push('Client-Key');
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

		let _method = function (method) {
			return async function (options) {
				options.method = options.method ?? method;
				options.url = options.url ?? options.uri;
				options.data = options.data ?? (typeof options.json === 'object' ? options.json : null) ?? options.payload ?? options.body;
				options.params = options.params ?? options.qs ?? options.query;

				options.httpAgent = options.httpAgent ?? (options.strictSSL != null || options.cert != null || options.key != null) ? new https.Agent({
					rejectUnauthorized : options.strictSSL,
					cert               : options.cert,
					key                : options.key,
					passphrase         : options.passphrase,
				}) : null;


				if (options.json === true) {
					options.headers['Content-Type'] = 'application/json';
				}

				delete options.json;
				delete options.payload;
				delete options.qs;
				delete options.query;
				delete options.body;
				delete options.uri;
				delete options.strictSSL;
				delete options.cert;
				delete options.key;
				delete options.passphrase;

				const res = await axios(options);
				if (options.resolveWithFullResponse === true) {
					return res;
				} else {
					return res.data;
				}
			}
		};

		_self.do = {
			get    : _method('GET'),
			post   : _method('POST'),
			put    : _method('PUT'),
			patch  : _method('PATCH'),
			delete : _method('DELETE'),
		};

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
