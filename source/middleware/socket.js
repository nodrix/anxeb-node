'use strict';

const Client = require('./client').instance;
const http = require('http');
const sio = require('socket.io');
const request = require('request');
const ip = require('ip');
const requestpn = require('request-promise-native');

module.exports = {
	instance : function (service, settings) {
		let _self = this;
		let _sio = sio(http.createServer(service.express));

		_self.service = service;
		_self.settings = settings || {};
		_self.host = _self.settings.host || ip.address() || '127.0.0.1';
		_self.port = _self.settings.port || '8080';
		_self.protocol = _self.settings.protocol || 'http';
		_self.callbacks = {};
		_self.clients = [];
		_self.uri = (_self.protocol ? _self.protocol : 'http') + '://' + _self.host + ':' + _self.port;

		let _request = requestpn;

		_self.do = {
			get    : _request.get,
			post   : _request.post,
			delete : _request.delete
		};

		_self.emit = function (key, data) {
			_sio.emit(key, data);
		};

		_self.include = {
			callback : function (name, module) {
				if (module) {
					let cb = {};
					let getType = {};
					if (getType.toString.call(module) === '[object Function]') {
						cb.name = name;
						cb.callback = module;
					} else {
						cb.name = module.name || name;
						cb.callback = module.callback;
					}
					_self.callbacks[cb.name] = cb;
				}
			}
		};

		_sio.on('connection', function (context) {
			let client = new Client(_self, {
				service : _self.service,
				context : context,
				index   : _self.clients.length
			});

			_self.clients.push(client);
			context.on('disconnect', function () {
				_self.clients.splice(_self.clients.indexOf(client), 1);
			});
		});

		_self.listen = function () {
			return new Promise(function (resolve, reject) {
				_sio.httpServer.listen(_self.port, _self.host, function () {
					_self.service.log.debug.service_started.args(_self.uri).print();
					resolve();
				}).on('error', function (err) {
					_self.service.log.exception.http_server_initialization_failed.args(_self.host, _self.port, err).throw();
					reject(err);
				});
			});
		};

		_self.init = function () {
			if (_self.settings.callbacks) {
				_self.service.fetch.modules(_self.settings.callbacks, 'socket callbacks').map(function (item) {
					_self.include.callback(item.name, item.module);
				});
			}
		};

		_self.init();
	}
};
