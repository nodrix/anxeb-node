'use strict';

const schedule = require('node-schedule');
const utils = require('../common/utils');
const Job = require('./job');

module.exports = {
	instance : function (service, settings) {
		let _self = this;

		_self.service = service;
		_self.settings = settings || {};
		_self.schedule = schedule;
		_self.jobs = {};

		_self.include = {
			job : function (name, module) {
				if (module) {
					module.name = module.name || name;
					_self.jobs[module.name] = new Job(_self, module);
				}
			}
		};

		_self.start = function () {
			for (let j in _self.jobs) {
				_self.jobs[j].start();
			}
		};

		_self.init = function () {
			if (_self.settings.jobs) {
				_self.service.fetch.modules(_self.settings.jobs, 'scheduler jobs').map(function (item) {
					_self.include.job(item.name, item.module);
				});
			}
		};

		_self.init();
	}
};