'use strict';

anxeb.app.filter('reverse', function () {
	return function (items) {
		return items.slice().reverse();
	};
});
