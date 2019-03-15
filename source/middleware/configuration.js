'use strict';

const utils = require('../common/utils');

module.exports = {
	instance : function (service, settings, initial) {
		let _self = this;

		let _service = service;
		let _settings = settings || {};
		let _default = initial;
		let _overwrite = _settings.overwrite || false;
		let _file = _settings.file || (settings ? _service.locate.configs(_service.key + '.json') : null);

		let pushValues = function (values) {
			for (let i in values) {
				if (typeof values[i] !== 'function') {
					_self[i] = utils.general.data.copy(values[i]);
				}
			}
		};

		_self.refresh = function () {
			if (_default && _overwrite === true) {
				_self.reset(_default);
				_service.log.debug.config_overwrite_warning.args(_service.key).print();
			} else {
				if (_file) {
					try {
						let data = utils.internal.file.read(_file);
						_self.reset(JSON.parse(data));
					} catch (e) {
						_self.reset(_default);
					}
				}
			}
		};

		_self.save = function () {
			if (_file) {
				let data = {};

				for (let i in _self) {
					if (typeof _self[i] !== 'function') {
						data[i] = utils.general.data.copy(_self[i]);
					}
				}

				utils.internal.file.write(_file, {
					text    : JSON.stringify(data, null, 2),
					replace : true
				});
			}
		};

		_self.reset = function (values) {
			for (let i in _self) {
				if (typeof _self[i] !== 'function') {
					delete _self[i];
				}
			}
			if (values) {
				pushValues(values);
			}
			_self.save();
		};

	}
};
