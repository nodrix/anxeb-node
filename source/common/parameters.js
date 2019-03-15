'use strict';

const moment = require('moment');
const path = require('path');

let processReplace = function (paramValue, withParams, usingFunction) {
	if (withParams !== undefined && withParams !== null) {
		if (paramValue instanceof Array) {
			let result = [];
			for (let i = 0; i < paramValue.length; i++) {
				let pval = paramValue[i];
				if (typeof pval === 'string') {
					result.push(usingFunction(pval, withParams))
				} else {
					result.push(pval);
				}
			}
			return result;
		} else {
			if (typeof paramValue === 'string') {
				return usingFunction(paramValue, withParams)
			} else {
				return paramValue;
			}
		}
	} else {
		return paramValue;
	}
};

let setServerValues = function (value, params) {
	let result = value;
	result = result.replaceAll('[server_name]', params.name);
	result = result.replaceAll('[server_key]', params.key);
	result = result.replaceAll('[server_description]', params.description || '');
	result = result.replaceAll('[root_path]', params.settings.root);
	result = result.replaceAll('[services_path]', params.structure.services || params.settings.root);
	result = result.replaceAll('[source_path]', params.structure.source || params.settings.root);
	result = result.replaceAll('[logs_path]', params.structure.logs || params.settings.root);
	result = result.replaceAll('[keys_path]', params.structure.keys || params.settings.root);
	result = result.replaceAll('[storage_path]', params.structure.storage || params.settings.root);
	result = result.replaceAll('[configs_path]', params.structure.configs || params.settings.root);
	result = result.replaceAll('[source_service_path]', path.join(params.structure.source || params.settings.root, '[service_key]'));
	return parameters.fill.common(result);
};

let setServiceValues = function (value, params) {
	let result = value;
	result = result.replaceAll('[service_domain]', params.domain);
	result = result.replaceAll('[service_name]', params.name);
	result = result.replaceAll('[service_key]', params.key);
	return parameters.fill.common(result);
};

const parameters = {
	value   : {
		set : function (obj, value, prop) {
			let items = prop.split('.');
			let key = items[0];
			for (let i = 0; i < items.length; i++) {
				key = items[i];
				if (i < items.length - 1) {
					if (obj[key] !== undefined && obj[key] !== null) {
						obj = obj[key];
					} else {
						obj[key] = {};
						obj = obj[key];
					}
				}
			}
			obj[key] = value;

		},
		get : function (obj, prop) {
			let items = prop.split('.');
			for (let i = 0; i < items.length; i++) {
				let key = items[i];
				if (obj[key] !== undefined && obj[key] !== null) {
					obj = obj[key];
				} else {
					return null;
				}
			}
			return obj;
		}
	},
	fill    : {
		common : function (value) {
			let result = value;
			result = result.replaceAll('[node_version]', process.version);
			return result;
		},
		date   : function (value) {
			let result = value || '';
			result = result.replaceAll('[date]', moment().format('dddd DD/MM/YYYY'));
			result = result.replaceAll('[time]', moment().format('h:mm:ss a'));
			result = result.replaceAll('[year]', moment().format('YYYY'));
			result = result.replaceAll('[month_name]', moment().format('MMMM').toLowerCase());
			result = result.replaceAll('[day]', moment().format('DD'));
			return this.common(result);
		}
	},
	process : {
		server  : function (params) {
			let process = function (prop) {
				let value = parameters.value.get(params, prop);
				if (value !== null) {
					parameters.value.set(params, processReplace(value, params, setServerValues), prop);
				}
			};

			params.structure = params.structure || {};

			if (params.structure.services) {
				params.structure.services = path.join(params.settings.root, params.structure.services);
			}
			if (params.structure.logs) {
				params.structure.logs = path.join(params.settings.root, params.structure.logs);
			}
			if (params.structure.source) {
				params.structure.source = path.join(params.settings.root, params.structure.source);
			}
			if (params.structure.keys) {
				params.structure.keys = path.join(params.settings.root, params.structure.keys);
			}
			if (params.structure.storage) {
				params.structure.storage = path.join(params.settings.root, params.structure.storage);
			}
			if (params.structure.configs) {
				params.structure.configs = path.join(params.settings.root, params.structure.configs);
			}

			process('settings.log.identifier');
			process('settings.log.file');
			process('settings.log.events');
		},
		service : function (params, server) {
			let process = function (prop) {
				let value = parameters.value.get(params, prop);
				if (value !== null) {
					parameters.value.set(params, processReplace(processReplace(value, server, setServerValues), params, setServiceValues), prop);
				}
			};

			process('settings.log.identifier');
			process('settings.log.file');
			process('settings.log.events');
			process('settings.configuration.file');
			process('settings.socket.callbacks');
			process('settings.scheduler.jobs');
			process('settings.routing.routes');
			process('settings.routing.actions');
			process('settings.renderer.static');
			process('settings.renderer.favicon');
			process('settings.renderer.templates.partials');
			process('settings.renderer.templates.containers');
			process('settings.renderer.templates.views');
			process('settings.storage.sub_folder');
			process('settings.security.keys.private');
			process('settings.security.keys.public');
		},
		custom  : function (params, prop, service) {
			let value = parameters.value.get(params, prop);
			if (value !== null) {
				parameters.value.set(params, processReplace(processReplace(value, service.server, setServerValues), service, setServiceValues), prop);
			}
		}
	}
};

module.exports = parameters;