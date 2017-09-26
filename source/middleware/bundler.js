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
		result.push('<script src="/anxeb/bundle/vendors/angular/angular.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/angular/angular-animate.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/angular/angular-storage.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/angular/angular-ui-router.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/jquery/jquery.js"></script>');
		result.push('<script src="/anxeb/bundle/vendors/socket/socket.io.js"></script>');
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

	var getApplicationBundle = function () {
		var result = ["<!-- Application Bundle -->"];
		result.push('<script src="/anxeb/bundle/global/anxeb.js"></script>');
		result.push('<script src="/anxeb/bundle/global/utils.js"></script>');
		result.push('<script src="/anxeb/bundle/helpers/enums.js"></script>');
		result.push('<script src="/anxeb/bundle/helpers/event.js"></script>');
		result.push('<script src="/anxeb/bundle/services/page.js"></script>');
		result.push('<script src="/anxeb/bundle/services/request.js"></script>');
		result.push('<script src="/anxeb/bundle/services/session.js"></script>');
		result.push('<script src="/anxeb/bundle/services/interceptor.js"></script>');
		result.push('<script src="/anxeb/bundle/services/socket.js"></script>');
		result.push('<script src="/anxeb/bundle/directives/ng-enter.js"></script>');
		result.push('<script src="/anxeb/bundle/global/common.js"></script>');
		result.push('<script src="/anxeb/bundle/computed/states.js"></script>');
		result.push('<script src="/anxeb/bundle/computed/init.js"></script>');
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

	_self.scripts = function () {
		return getVendors() + "\n" + getApplicationBundle() + "\n" + getControllers();
	};

};
