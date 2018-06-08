(function () {
	'use strict';
	anxeb.app.directive('ngGo', ['page', function (page) {
		return {
			restrict : 'A',
			link     : function (scope, element, attrs) {
				if(attrs.ngGo) {
					$(element).on('click', function (e) {
						page.load(attrs.ngGo, null);
					});
				}
			}
		};
	}]);
})();
