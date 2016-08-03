
SmartClient.on('after_loading_mappers', function(mappers){
    mappers['myMapper'] = {
        name: 'label',
		synonims: ['rdfs:label', 'schema.org:label']
    };

	return mappers;
});

// modifying query
SmartClient.on('before_query', function(query){
    query += '?s ?p <http://dfkjngdkjsg.com/45';
	return query;
});

// preparing data for the template
SmartClient.on('before_templating', function(graph){
    var templateData = {
		title: graph.any(null, 'schema.org:title', null)
	};

	return templateData;
});
