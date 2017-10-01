'use strict';

anxeb.Event = function (err) {
	if (typeof(err) === "string") {
		this.message = err;
	} else {
		this.message = err.message
	}
};
