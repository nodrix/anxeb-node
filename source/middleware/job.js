'use strict';

module.exports = function (scheduler, params) {
	let _self = this;

	_self.scheduler = scheduler;
	_self.service = _self.scheduler.service;
	_self.name = params.name;
	_self.interval = params.interval;
	_self.schedule = params.schedule || '* * * * * *';
	_self.task = params.task;
	_self.startTime = params.startTime;
	_self.endTime = params.endTime;
	_self.state = {};

	if (!_self.interval) {
		_self.rule = typeof _self.schedule === 'string' || _self.schedule instanceof String ? _self.schedule : _self.scheduler.schedule.RecurrenceRule(_self.schedule);
	}

	_self.start = function () {
		if (_self.interval) {
			_self.instance = setInterval(_self.execute, _self.interval);
		} else {
			_self.instance = _self.scheduler.schedule.scheduleJob({
				start : _self.startTime,
				end   : _self.endTime,
				rule  : _self.rule
			}, _self.execute);
		}
	};

	_self.cancel = function () {
		if (_self.instance) {
			if (_self.interval) {
				clearInterval(_self.instance);
			} else {
				_self.instance.cancel();
			}
		}
	};

	_self.execute = function () {
		_self.task({
			service     : _self.service,
			job         : _self,
			socket      : _self.service.socket,
			application : _self.service.application
		});
	};
};
