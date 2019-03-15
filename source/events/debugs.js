'use strict';

const eventTypes = require('../middleware/event').types;

module.exports = {
	server_initializing        : {
		message : 'Anxeb v[0] / [1:C]',
		type    : eventTypes.debug_log
	},
	server_started             : {
		message : 'Anxeb server initialized on [date] at [time].',
		type    : eventTypes.debug_log
	},
	server_ended               : {
		message : 'Anxeb server ended on [date] at [time].',
		type    : eventTypes.debug_log
	},
	extension_loaded           : {
		message : 'Extension [0:Y] / [1] @ [2] successfully loaded',
		type    : eventTypes.debug_log
	},
	service_starting           : {
		message : 'Starting service [0:C].',
		type    : eventTypes.debug_log
	},
	service_started            : {
		message : 'Service started successfully on [0:C].',
		type    : eventTypes.debug_log
	},
	service_initialized        : {
		message : 'Service initialization completed.',
		type    : eventTypes.debug_log
	},
	config_overwrite_warning   : {
		message : 'Warning: Configuration for [0] service is in overwrite mode!',
		type    : eventTypes.debug_log,
		color   : 'bgRedBright'
	}
};
