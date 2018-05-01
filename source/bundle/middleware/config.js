'use strict';

anxeb.app = angular.module("app", anxeb.modules).config(function ($interpolateProvider, $locationProvider, $httpProvider) {
	$interpolateProvider.startSymbol(anxeb.settings && anxeb.settings.startSymbol ? anxeb.settings.startSymbol : '[[');
	$interpolateProvider.endSymbol(anxeb.settings && anxeb.settings.endSymbol ? anxeb.settings.endSymbol : ']]');
	$locationProvider.html5Mode(anxeb.settings ? anxeb.settings.html5Mode : true);
	$httpProvider.interceptors.push("interceptor");
});

anxeb.controller = function (name) {
	var controllerWrapper = function (name) {
		var _self = this;
		_self.name = name;

		_self.set = function (callback) {
			anxeb.app.controller(_self.name + "Controller", callback);
		}
	};
	return new controllerWrapper(name);
};
