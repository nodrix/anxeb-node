'use strict';

var Enums = require("../middleware/enums");

module.exports = {
	server_started             : {
		message : 'Anxeb server [M1] [M0] started on [date] at [time].',
		type    : Enums.EventType.Debug
	},
	service_instance_starting  : {
		message : "Starting service [M0].",
		type    : Enums.EventType.Debug
	},
	service_instance_started   : {
		message : "Service started successfully on [M0].",
		type    : Enums.EventType.Debug
	},
	service_initialized        : {
		message : "Service initialization completed.",
		type    : Enums.EventType.Debug
	},
	data_server_connecting     : {
		message : "Connecting to data server [0].",
		type    : Enums.EventType.Debug
	},
	data_server_connected      : {
		message : "Connected to data server [0].",
		type    : Enums.EventType.Debug
	},
	socket_client_disconnected : {
		message : "Socket client '[0]' disconnected from index [1].",
		type    : Enums.EventType.Debug
	},
	socket_client_connected    : {
		message : "Socket client '[0]' connected into index [1].",
		type    : Enums.EventType.Debug
	},
	redirect_to                : {
		message : "Redirecting to [0]",
		type    : Enums.EventType.Debug
	},
	config_overwrite_warning   : {
		message : "Warning: Configuration is in overwrite mode!",
		type    : Enums.EventType.Debug,
		color   : 'bgRedBright'
	}
};
