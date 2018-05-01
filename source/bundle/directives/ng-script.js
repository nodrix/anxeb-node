'use strict';

anxeb.app.directive('script', function () {
	return {
		restrict : 'E',
		scope    : false,
		link     : function (scope, elem, attr) {
			if (attr.type === 'text/javascript-lazy') {
				var s = document.createElement("script");
				s.type = "text/javascript";
				var src = elem.attr('src');
				if (src !== undefined) {
					s.src = src;
					console.log(src);
				} else {
					var code = elem.text();
					s.text = code;
				}
				document.head.appendChild(s);
				elem.remove();
			}
		}
	};
});
