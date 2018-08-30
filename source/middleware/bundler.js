'use strict';

var fs = require("fs");
var utils = require("../common/utils");
var ComputedBundler = require("../middleware/bundler.computed");

module.exports = function (service) {
	var _self = this;
	var _service = service;
	_self.compute = new ComputedBundler(_service);

	var getControllers = function () {
		if (_service.settings.service.paths.controllers) {
			var result = ["<!-- Client Controllers -->"];

			utils.file.list({
				path       : _service.locate.path(_service.settings.service.paths.controllers),
				endsWith   : '.js',
				subfolders : true
			}).map(function (file) {
				result.push('<script src="/anxeb/controller/' + file + '"></script>');
			});

			if (result.length === 1) {
				return "";
			}
			return result.join("\n") + "\n";
		} else {
			return '';
		}
	};

	var getInit = function () {
		var result = ["<!-- Anxeb Base Script -->"];
		result.push('<script src="/anxeb/bundle/computed/init.js"></script>');
		return result.join("\n") + "\n";
	};

	var getMiddleware = function () {
		var result = ["<!-- Application Bundle -->"];
		result.push('<script src="/anxeb/bundle/middleware/config.js"></script>');
		result.push('<script src="/anxeb/bundle/middleware/utils.js"></script>');
		result.push('<script src="/anxeb/bundle/middleware/enums.js"></script>');
		result.push('<script src="/anxeb/bundle/middleware/exception.js"></script>');
		result.push('<script src="/anxeb/bundle/middleware/information.js"></script>');

		result.push('<script src="/anxeb/bundle/services/page.js"></script>');
		result.push('<script src="/anxeb/bundle/services/request.js"></script>');
		result.push('<script src="/anxeb/bundle/services/session.js"></script>');
		result.push('<script src="/anxeb/bundle/services/interceptor.js"></script>');
		result.push('<script src="/anxeb/bundle/services/socket.js"></script>');

		result.push('<script src="/anxeb/bundle/directives/ng-enter.js"></script>');
		result.push('<script src="/anxeb/bundle/directives/ng-focus.js"></script>');
		result.push('<script src="/anxeb/bundle/directives/ng-script.js"></script>');
		result.push('<script src="/anxeb/bundle/directives/ng-go.js"></script>');

		result.push('<script src="/anxeb/bundle/filters/reverse.js"></script>');

		result.push('<script src="/anxeb/bundle/middleware/global.js"></script>');
		result.push('<script src="/anxeb/bundle/computed/states.js"></script>');

		return result.join("\n") + "\n";
	};

	_self.generate = function (name) {
		switch (name.toLowerCase()) {
		case "states.js":
			return _self.compute.states();
		case "init.js":
			return _self.compute.init();
		}
		return null;
	};

	_self.anxeb = function () {
		return getInit() + "\n" + getMiddleware() + "\n" + getControllers();
	};

	_self.init = function () {
		return getInit();
	};

	_self.middleware = function () {
		return getMiddleware();
	};

	_self.controllers = function () {
		return getControllers();
	};

};
