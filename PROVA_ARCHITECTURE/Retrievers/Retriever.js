/**
 * Retrievers fetch data from the net, in any way possible
 * 
 * Typical use case:
 * 
 * var ret = new Retriever('http://')
 *      .proxy(false)
 *      .header('Accept', 'text/something')
 *      .map(function(d){
 *          return {...}    // here you map data records to linked data or something else
 *      })
 *      .end(function(error, data){
 *          // what to do after fetching and transformation is done
 *      })
 * )
 */

Retriever = function(options){
    
    this.options = options;
    
    defaults = {
        proxy: false,   // whether to send requests through a proxy or not
        headers: {
            'Accept': 'text/something', // Headers to send with each request
        }
    };
    
    // TODO: go on baby

};

Retriever.prototype.query = function(query, callback){
    
    // Run the query on external service

	callback(result);	// callback with results
}
