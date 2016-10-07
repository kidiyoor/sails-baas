//var usergrid = require('usergrid');

var Connection = function(config, cb) {
	client = config;
	cb(null, client);
};

module.exports = Connection;



module.exports.connections = {

	semantic: {
		URI: 'https://api.usergrid.com',
		orgName: 'gkidiyoortesting',
		appName: 'sandbox',
		authType: 'AUTH_CLIENT_ID', // authType:usergrid.AUTH_APP_USER   
		clientId:'YXA6krpfgH4rEeahvyV_2Tolxg',
		clientSecret:'YXA6FsZeVZs03CCQ5DWygWaaSTWGCXk',
		logging: false, //optional - turn on logging, off by default
		buildCurl: false //optional - turn on curl commands, off by default
	},
	queryable: {
		URI: 'https://api.usergrid.com',
		orgName: 'gkidiyoortesting',
		appName: 'sandbox',
		authType: 'AUTH_CLIENT_ID', // authType:usergrid.AUTH_APP_USER   
		clientId:'YXA6krpfgH4rEeahvyV_2Tolxg',
		clientSecret:'YXA6FsZeVZs03CCQ5DWygWaaSTWGCXk',
		logging: false, //optional - turn on logging, off by default
		buildCurl: false //optional - turn on curl commands, off by default
	}
};