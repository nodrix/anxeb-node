'use strict';

anxeb.app.service("session", function (store, request, page) {
	var _self = this;

	Object.defineProperty(_self, "payload", {
		get : function () {
			return store.get("payload");
		},
		set : function (value) {
			store.set('payload', value);
			return value;
		}
	});

});
