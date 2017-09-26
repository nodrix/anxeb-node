'use strict';

const Enums = require("../middleware/enums");

module.exports = {
	server_started             : {
		message : 'Node Instance [node_version] Started on [date] at [time].\n',
		type    : Enums.EventType.Debug
	},
	service_instance_starting  : {
		message : "Starting service on [0]:[1].",
		type    : Enums.EventType.Debug
	},
	service_instance_started   : {
		message : "Service listening on [0]:[1].",
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
	}
};
