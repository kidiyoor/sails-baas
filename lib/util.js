/*
Water line Adapter for BaaS
*/

var request = require('request');
var connections = require('./connection');

/*
This Adapter Doesn't support the following
- contains (BaaS 'contains' behaviour is different from expected for waterline)
- startsWith (BaaS 'startsWith' behaviour is different from expected for waterline)
- endsWith (BaaS doesn't support this feature)
- like (BaaS doesn't support this feature)
- select firt_name, second_name feature is not supported by BaaS
- max, avg, min, sum, not, not in, skip is not supported by BaaS
- BaaS doesn't have data type for dates hence operations on date is not supported // TODO workaround
*/

var HEADERS = {"Content-Type" : "application/json"};

var CONSTANTS = {};
CONSTANTS.lessThanOrEqual		= '<=';
CONSTANTS['<=']					= '<=';
CONSTANTS.lessThan 				= '<';
CONSTANTS['<'] 					= '<';
CONSTANTS.greaterThan 			= '>';
CONSTANTS['>'] 					= '>';
CONSTANTS.greaterThanOrEqual	= '>=';
CONSTANTS['>='] 				= '>=';

exports.describe = function(connection, collection, cb){
	cb(null, values);
}

exports.find = function(connection, collection, options, cb){
	options = normalize_input(options);

	var url = gen_url(connection, collection);
	var query = gen_sql_query(options);
	
	url += 'ql=' + query;

	console.log('----- DEBUG : find GET URL = ' + url);

	request({ url : url, method: 'GET', headers: HEADERS}, function(error, response, body){
		if(error){
			console.log('GET : Error - ' + error);
			callback(error);
		} else {
			var obj = JSON.parse(body);
			if(obj.entities) {
				if (options.average){
					cb(null, average(options, obj.entities));
				} else if (options.sum) {
					cb(null, sum(options, obj.entities));
				} else if (options.groupBy) {
					cb(null, groupBy(options, obj.entities));
				} else if (options.min) {
					cb(null, min(options, obj.entities));
				} else if (options.max) {
					cb(null, max(options, obj.entities));
				} else {
					cb(null, normalize_output(obj.entities));
				}
			} else {
				cb(null, []);
			}
		}
	});
}

exports.create = function(connection, collection, values, cb){
	values = normalize_input(values);

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
	values = normalize_input(values);
	options = normalize_input(options);

	var url = gen_url(connection, collection);
	var	query = gen_sql_query(options);
	
	url += 'ql=' + query;

	console.log('----- DEBUG : UPDATE PUT URL = ' + url);
	
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
	options = normalize_input(options);

	var url = gen_url(connection, collection);

	if (options.where) {
		query = gen_sql_query(options);
		url += 'ql=' + query;
	} else {
		// otherwise baas will only delete first 10 entries
		url += 'ql=select *&limit=1000';
		//TODO recursivly delete all entries
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

exports.count = function(connection, collection, options, cb){
	options = normalize_input(options);

	exports.find(connection, collection, options, function(error, data) {
		if(error) {
			cb(err);
		} else {
			length = data.length;
			cb(null, length);
		}

	});
}

exports.countByType = function(connection, collection, options, cb){
	options = normalize_input(options);

	exports.find(connection, collection, options, function(error, data) {
		if(error) {
			cb(err);
		} else {
			length = data.length;
			cb(null, length);
		}

	});
}

// helping functions below

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
		q += gen_where_query(options.where);
	} 

	if(options.sort){
		q += gen_sort_query(options.sort);
	}
	
	if(options.limit){
		q += gen_limit_query(options.limit);
	}

	return q;
}

// partial ql query 
function gen_where_query(obj) {
	// query string
	var q = 'where ';
	// number of keys
	var n = Object.keys(obj).length;
	// to identify the last loop
	var i = 0;

	for(var key in obj) {
		// special case for uuid, uuid should be compared with no quotes
		if(key!='uuid'){
			/* eg - {	age: {greaterThan: 30}, 					// case 1
						name: 'kidiyoor', 	 						// case 2
						age: 30,									// case 3
						or: [{age: 30}, {score: {greaterThan: 25}}]	// case 4
						dob: { greaterThan: new Date(2013, 10, 9) } // case 5
					}								
				var operation will be valid for first and fourth cases only in this eg.
			*/
			operation = Object.keys(obj[key])[0];

			// case 3 eg. | age: 30
			if (typeof obj[key] == 'number') {
				q += key + '=' + obj[key] + '';
			} else if (typeof obj[key] == 'object' && (typeof obj[key][operation] != 'object' || toString.call(obj[key][operation]) == '[object Date]')) { // case 1 and case 5 eg. | age: {greaterThan: 30}
				if( typeof obj[key][operation] == 'string') { // case 2 | if value to be compared is string append quotes 
					if( operation == 'startsWith')
						q += key +  ' ' + '=' + ' \'' + obj[key][operation] + '*\' '; // TODO: this is incomplete
					else
						q += key +  ' ' + CONSTANTS[operation] + ' \'' + obj[key][operation] + '\' ';
				} else { // case 3 | value is a number
					q += key + ' ' + CONSTANTS[operation] + ' ' + obj[key][operation] + ' ';
				}
			} else if (typeof obj[key] == 'object' && typeof obj[key][operation] == 'object') { // case 4 e eg. | or: [{age: 30, score: {greaterThan: 25}}]
				// operatoin can be not, notin , or
				if( operation == 'or') {
					// TODO requires change in the way we append 'and' string. 
				}

			} else {
				q += key + '=\'' + obj[key] + '\'';
			}
			
		} else { // uuid should be compared with no quotes
			q += key + '=' + obj[key] + '';
		}
		
		if(i!=(n-1)) q += 'and '; // TODO need changes with respect to case 4
		
		i++;
	}
	
	return q;
}

function gen_sort_query(obj) {
	// query string
	var q = ' order by ';
	if(typeof obj == 'object') {
		// number of keys
		n = Object.keys(obj).length;
		// to identify the last loop
		i = 0;
		
		for( key in obj) {
			// eg .(sort{age: 1}) // asc
			if(obj[key] > 0) {
				q +=  key + ' asc';	
			} else {
				// eg .(sort{age: 0}) // desc
				q +=  key + ' desc';
			}

			if(i!=(n-1)) q += ', ';
			
			i++;
			
		}
	} else {
		q += obj
	}

	return q;
}

function gen_limit_query(obj) {
	var q = '&limit=' + obj;

	return q;
}

function average(options, data) {
	// TODO : performance issues
	return []
}

function sum(options, data) {
	// TODO : performance issues

	// store sum 
	var sum = {}

	// initialize
	for (attr in options.sum) {
		sum[attr] = 0;
	}

	for (item in data) {
		for (attr in options.sum) {
			sum[attr] += item[attr];
		}
	}

	return [sum]

}

function max(options, data) {
	// TODO : performance issues
	return []
}

function min(options, data) {
	// TODO : performance issues
	return []	
}

function groupBy(options, data) {
	// TODO : performance issues
	return []
}

function normalize_output(output) {
	// check if the obj is list or single object
	if (output.length) { // list
		for ( var i=0; i < output.length; i++ ) {
			if(output[i].uuid){
				output[i].id = output[i].uuid;
				delete output[i].uuid;
			} 
			
			if(output[i].t_type){
				output[i].type = output[i].t_type;
				delete output[i].t_type;
			} 

			if(output[i].createdAt){
				output[i].createdAt = new Date(Date.parse(output[i].createdAt));
			} 

			if(output[i].updatedAt){
				output[i].updatedAt = new Date(Date.parse(output[i].updatedAt));
			} 
		}
	} else { // single obj
		if(output.uuid){
			output.id = output.uuid;
			delete output.uuid;
		} 
		
		if(output.t_type){
			output.type = output.t_type;
			delete output.t_type;
		} 

		if(output.createdAt){
			output.createdAt = new Date(Date.parse(output.created));
		} 

		if(output.updatedAt){
			output.updatedAt = new Date(Date.parse(output.updated));
		}
	}

	return output;
}

function normalize_input(input) {
	if (input.id) {
		input.uuid = input.id;
		delete input.id;
	}

	if (input.type) {
		input.t_type = input.type;
		delete input.type;
	}

	if(input.where) {
		if (input.where.type) {
			input.where.t_type = input.where.type;
			delete input.where.type;
		}

		if (input.where.id) {
			input.where.uuid = input.where.id;
			delete input.where.id;
		}

		if(input.where.createdAt){
			input.created = input.where.createdAt.valueOf();
			delete input.where.createdAt;
		} 

		if(input.where.updatedAt){
			input.updated = input.where.updatedAt.valueOf();
			delete input.where.updatedAt;
		} 
		
/*		for (var key in input.where) {
			if (toString.call(input[key]) == '[object Date]') {
				input[key] = input[key].valueOf();
			}
		}
*/
	}

	if(input.sort) {
		if (input.sort.type) {
			input.sort.t_type = input.sort.type;
			delete input.sort.type;
		}
		
		if (input.sort.id) {
			input.sort.uuid = input.sort.id;
			delete input.sort.id;
		}
/*
		for (var key in input.sort) {
			if (toString.call(input[key]) == '[object Date]') {
				input[key] = input[key].valueOf();
			}
		}
*/
	}

	return input
}


