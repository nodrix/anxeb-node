'use strict';

var anxeb = {
	app        : angular.module("app", ["ui.router", "angular-storage", "ngAnimate"]).config(function ($interpolateProvider, $locationProvider, $httpProvider) {
		$interpolateProvider.startSymbol('[[');
		$interpolateProvider.endSymbol(']]');
		$locationProvider.html5Mode(true);
		$httpProvider.interceptors.push("Interceptor");
	}),
	controller : function (name) {
		var controllerWrapper = function (name) {
			var _self = this;
			_self.name = name;

			_self.set = function (callback) {
				anxeb.app.controller(_self.name + "Controller", callback);
			}
		};
		return new controllerWrapper(name);
	},
	defaults   : {
		states : {
			exception : null,
			login     : null
		}
	}
};
