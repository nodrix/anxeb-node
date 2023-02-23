'use strict';

const eventTypes = require('../middleware/event').types;

module.exports = {
	server_initializing       : {
		message : 'Anxeb v[0] / [1:C]',
		type    : eventTypes.debug_log
	},
	server_started            : {
		message : 'Anxeb server initialized on [date] at [time].',
		type    : eventTypes.debug_log
	},
	server_ended              : {
		message : 'Anxeb server ended on [date] at [time].',
		type    : eventTypes.debug_log
	},
	extension_loaded          : {
		message : 'Extension [0:Y] / [1] @ [2] successfully loaded',
		type    : eventTypes.debug_log
	},
	service_starting          : {
		message : 'Starting service [0:C].',
		type    : eventTypes.debug_log
	},
	service_started           : {
		message : 'Service started successfully on [0:C].',
		type    : eventTypes.debug_log
	},
	service_initialized       : {
		message : 'Service initialization completed.',
		type    : eventTypes.debug_log
	},
	config_overwrite_warning  : {
		message : 'Warning: Configuration for [0] service is in overwrite mode!',
		type    : eventTypes.debug_log,
		color   : 'bgRedBright'
	},
	redis_client_connected    : {
		message : 'Redis client successfully connected to server [0:C] on port [1:C].',
		type    : eventTypes.debug_log
	},
	redis_client_connecting   : {
		message : 'Connecting [2:C] Redis client to server [0:C] on port [1:C].',
		type    : eventTypes.debug_log
	},
	redis_client_reconnecting : {
		message : 'Reconnecting [2:C] Redis client to [0:C]:[1:C].',
		type    : eventTypes.debug_log
	},
	server_remark_log         : {
		message : '[0]: [1:C]',
		type    : eventTypes.debug_log
	},
	server_remark_log_asterisk  : {
		message : '[0]: [1]',
		type    : eventTypes.debug_log,
		color   : 'bgBlueBright'
	},
	node_version            : {
		message : 'Node Version: [0:C].',
		type    : eventTypes.debug_log
	},
	node_platform            : {
		message : 'Platform: [0:C].',
		type    : eventTypes.debug_log
	},
};
