'use strict';

module.exports = function (service, params) {
	var _self = this;
	var _service = service;

	_self.name = params.name;
	_self.schedule = params.schedule || '* * * * * *';
	_self.task = params.task;
	_self.startTime = params.startTime;
	_self.endTime = params.endTime;
	_self.rule = typeof _self.schedule === 'string' || _self.schedule instanceof String ? _self.schedule : _service.schedule.RecurrenceRule(_self.schedule);
	_self.state = {};

	_self.start = function () {
		_self.instance = _service.schedule.scheduleJob({
			start : _self.startTime,
			end   : _self.endTime,
			rule  : _self.rule
		}, function () {
			_self.task({ service: _service, job: _self, socket: _service.socket});
		});
	};

	_self.cancel = function () {
		if (_self.instance) {
			_self.instance.cancel();
		}
	};

	_self.execute = function () {
		_self.task({ service: _service, job: _self, socket: _service.socket});
	};
};
