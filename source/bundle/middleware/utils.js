'use strict';

anxeb.utils = {
	getParametersFromState : function ($stateParams, prefix) {
		var result = [];
		for (var s in $stateParams) {
			if ($stateParams[s]) {
				result.push("_" + s + "=" + $stateParams[s]);
			}
		}
		return prefix + (result.length > 0 ? "?" + result.join("&") : "");
	}
};
