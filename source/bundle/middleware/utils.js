'use strict';

if (!String.prototype.toCapital) {
	String.prototype.toCapital = function () {
		var value = this.toLowerCase();
		return value.charAt(0).toUpperCase() + value.slice(1);
	}
}

if (!String.prototype.toPascalCase) {
	String.prototype.toPascalCase = function () {
		var text = this;
		var result = '';
		var words = text.split(" ");

		for (var i in words) {
			result += (result.length ? ' ' : '') + words[i].toCapital()
		}
		return result;
	}
}

anxeb.utils = {
	getParametersFromState : function ($stateParams, prefix) {
		var result = [];
		for (var s in $stateParams) {
			if ($stateParams[s]) {
				result.push("_" + s + "=" + $stateParams[s]);
			}
		}
		return prefix + (result.length > 0 ? "?" + result.join("&") : "");
	},
	copy                   : function (obj) {
		if (obj) {
			return JSON.parse(JSON.stringify(obj));
		} else {
			return null;
		}
	},
	fill                   : function (obj, source) {
		for (var i in source) {
			if (obj[i]) {
				obj[i] = source[i];
			}
		}
	}
};
