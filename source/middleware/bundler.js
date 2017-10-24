'use strict';

const fs = require("fs");
const utils = require("../common/utils");
const ComputedBundler = require("../middleware/bundler.computed");

module.exports = function (service) {
	var _self = this;
	var _service = service;
	_self.compute = new ComputedBundler(_service);

	var getVendors = function () {
		var result = ["<!-- Dependency Vendors -->"];
		result.push('<script src="/anxeb/bundle/vendors/angular/angular.min.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/angular/angular-animate.min.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/angular/angular-storage.min.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/angular/angular-ui-router.min.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/jquery/jquery.min.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/socket/socket.io.min.js"></script>');
		return result.join("\n") + "\n";
	};

	var getControllers = function () {
		var result = ["<!-- Client Controllers -->"];

		utils.file.list({
			path     : _service.locate.path(_service.settings.service.paths.controllers),
			endsWith : '.js'
		}).map(function (file) {
			result.push('<script src="/anxeb/controller/' + file + '"></script>');
		});

		if (result.length === 1) {
			return "";
		}
		return result.join("\n") + "\n";
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
		result.push('<script src="/anxeb/bundle/middleware/event.js"></script>');
		result.push('<script src="/anxeb/bundle/services/page.js"></script>');
		result.push('<script src="/anxeb/bundle/services/request.js"></script>');
		result.push('<script src="/anxeb/bundle/services/session.js"></script>');
		result.push('<script src="/anxeb/bundle/services/interceptor.js"></script>');
		result.push('<script src="/anxeb/bundle/services/socket.js"></script>');
		result.push('<script src="/anxeb/bundle/directives/ng-enter.js"></script>');
		result.push('<script src="/anxeb/bundle/directives/focusMe.js"></script>');
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

	_self.all = function () {
		return getInit() + "\n" + getVendors() + "\n" + getMiddleware() + "\n" + getControllers();
	};

	_self.anxeb = function () {
		return getInit() + "\n" + getMiddleware() + "\n" + getControllers();
	};

	_self.init = function () {
		return getInit();
	};

	_self.vendors = function () {
		return getVendors();
	};

	_self.middleware = function () {
		return getMiddleware();
	};

	_self.controllers = function () {
		return getControllers();
	};

};
