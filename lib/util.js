var request = require('request');
var connections = require('./connection');

var CONSTENTS = {};
var HEADERS = {"Content-Type" : "application/json"};

CONSTENTS.lessThanOrEqual = '<=';
CONSTENTS['<='] = '<=';

exports.describe = function(connection, collection, cb){
	cb(null, values);
}


exports.find = function(connection, collection, options, cb){
	var url = gen_url(connection, collection);

	if(options.where) {
		query = gen_sql_query(options);
		url += 'ql=' + query;
	}


	console.log('----- DEBUG : find GET URL = ' + url);

	request({ url : url, method: 'GET', headers: HEADERS}, function(error, response, body){
		if(error){
			console.log('GET : Error - ' + error);
			callback(error);
		} else {
			var obj = JSON.parse(body);
			if(obj.entities)
				cb(null, normalize_output(obj.entities));
			else
				cb(null, []);
		}
	});
}

exports.create = function(connection, collection, values, cb){
	var url = gen_url(connection, collection);

	console.log('----- DEBUG : create POST - ' + url);
	
	request({ url : url, method: 'POST', headers: HEADERS, body: JSON.stringify(values)}, function(error, response, body){
		if(error){
			console.log('POST : Error - ' + error);
			callback(error);
		} else {
			var obj = JSON.parse(body);
			if(obj.entities.length == 1) {
				cb(null, normalize_output(obj.entities[0]));
			} else {
				cb(null, normalize_output(obj.entities));
			}
		}
	});
}

exports.update = function(connection, collection, options, values, cb){
	var url = gen_url(connection, collection);

	if (options.where) {
		query = gen_sql_query(options);
		url += 'ql=' + query;
	} else {
		url += 'ql=select *&limit=' + Number.MAX_SAFE_INTEGER;
	}

	request({ url : url, method: 'PUT', headers: HEADERS, body: JSON.stringify(values)}, function(error, response, body){
		if(error){
			console.log('POST : Error - ' + error);
			callback(error);
		} else {
			var obj = JSON.parse(body);
			if(obj.entities.length == 1) {
				cb(null, normalize_output(obj.entities[0]));
			} else {
				cb(null, normalize_output(obj.entities));
			}
		}
	});
}

exports.destroy = function(connection, collection, options, cb){
	var url = gen_url(connection, collection);

	if (options.where) {
		query = gen_sql_query(options);
		url += 'ql=' + query;
	} else {
		url += 'ql=select *&limit=' + Number.MAX_SAFE_INTEGER;
	}

	console.log('----- DEBUG : destroy DELETE URL = ' + url);

	request({ url : url, method: 'DELETE'}, function(error, response, body){
		if(error){
			console.log('DELETE : Error - ' + error);
			callback(error);
		} else {
			//console.log('POST : Response from create - ' + body);
			var obj = JSON.parse(body);
			cb(null, normalize_output(obj.entities));
		}
	});
}

// UTILS below

// generate partial url
function gen_url (connection, collection) {
	var config = connections.connections[connection];
	var url = config.URI;

	url += '/' + config.orgName + '/' + config.appName + '/' + collection + '?';

	return url;
}

// generate ql string
function gen_sql_query(options){
	// query string
	var q = 'select * ';
	
	if(options.where){
		q = q + 'where ';
		q = q + gen_where_query(options.where);
	} 

	if(options.sort){
		//q = q + 'sort';
		//q = q + gen_sort_query(options.sort);
	}

	return q;
}

// partial ql query 
function gen_where_query(obj) {
	// query string
	q = '';
	// number of keys
	n = Object.keys(obj).length;
	// to identify the last loop
	i = 0;

	for(key in obj) {
		if(key!='uuid'){
			if (typeof obj[key] == 'number') {
				q += key + '=' + obj[key] + '';
			} else if (typeof obj[key] == 'object') {
				operation = Object.keys(obj[key])[0];
				if( typeof obj[key][operation] == 'string') {
					// example : name(key) = (operation) gautham(obj[key][operation]) ie. name=gautham
					q += key +  CONSTENTS[operation] + '\'' + obj[key][operation] + '\'';
				} else {
					// example : name(key) = (operation) gautham(obj[key][operation]) ie. name=gautham
					q += key +  CONSTENTS[operation] + '' + obj[key][operation] + '';
				}
			} else {
				q += key + '=\'' + obj[key] + '\'';
			}
		} else { // special case for uuid :| without quotes
			q += key + '=' + obj[key] + '';
		}
		
		if(i!=(n-1)) 
			q += 'and '
		
		i++;
	}
	
	return q;
}

function normalize_output(output) {
	// check if the obj is list or single object
	if (output.length || output.length == 0) {
		// list
		for (item in output) {
			for (key in item) {
				if ( key == 'createdAt' || key == 'updatedAt' ) {
					output[key] = new Date(Date.parse(output[key]));
				}
			}
		}
	} else {
		// single obj
		for (key in output) {
			if ( key == 'createdAt' || key == 'updatedAt' ) {
				output[key] = new Date(Date.parse(output[key]));
			}
		}
	}
	console.log(JSON.stringify(output));
	return output;
}

//TODO
function gen_sort_query(obj) {
	// query string
	q = '';
	// number of keys
	n = Object.keys(obj).length;
	// to identify the last loop
	i = 0;
	for( key in obj) {

	}
	return q;
}
