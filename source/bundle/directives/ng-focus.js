'use strict';

anxeb.app.directive('ngFocus', function ($timeout, $parse) {
	return {
		link : function (scope, element, attrs) {
			var model = $parse(attrs.ngFocus);
			scope.$watch(model, function (value) {
				if (value === true) {
					$timeout(function () {
						element[0].focus();
						element[0].select();
					});
				}
			});
		}
	};
});
