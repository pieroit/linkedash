
'use strict';

var _          = require('underscore');
var Handlebars = require('handlebars');
var d3         = require('d3');
var L          = require('leaflet');

var smartClient = {};

jQuery(document).ready(function(){
    
    // user search submitted
    $('#lookup-run').click(runLookupQuery);
    $('#lookup-query').keyup(function(e){
        if(e.keyCode == 13){
            runLookupQuery();
        }
    });
    
    // collect fragments
    smartClient.fragments = {
        'dbpedia' : new ldf.FragmentsClient('http://fragments.dbpedia.org/2015/en'),
        'ispra'   : new ldf.FragmentsClient('http://localhost:3000/ispra')
    }
    
});    
    
    
/** After the user clicks OK:
 * 1 - do a dbPedia lookup
 * 2 - disambiguate (optional)
 * 3 - search synonims + neighbors
 * 4 - create store
 * 5 - render all boxes
 *
 */
function runLookupQuery(){
    
    $('#results').empty();
    
    var userQuery = $('#lookup-query').val();
    
    smartClient.graph = [];
    var subjectURI = '';
    var separationDegrees = 2;
    
    dbPediaLookup(userQuery)
        .then(function(dbPediaURI){
            
            subjectURI = dbPediaURI;
    
            // explode graph
            var explosionQueries = [runMainSparqlQuery(dbPediaURI), runISPRASparqlQuery(dbPediaURI)];
            return Promise.all(explosionQueries);
        })
        .then(function(){
            smartClient.graph.forEach(function(t){
                console.log(t);
            });
            runTemplate(subjectURI);
        })
        /*.then(function(){
            
        })
        .then(function(ok){
            boxes.forEach(function(b){
                b.render();
            });
        })*/
        .catch(function(error){
            console.error(error);
        });
}
    
function dbPediaLookup(userQuery){
    
    return new Promise(function(resolve, reject){
        
        var dbPediaLookupURI = 'http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryString=' + userQuery;
        $.getJSON(dbPediaLookupURI, function(lookupResults){

            if(_.has(lookupResults, 'results')){
                // TODO: disambiguation
                var mainURI = lookupResults['results'][0]['uri'];
                resolve(mainURI);
            } else {
                reject('dbPedia URI not found');
            }
        });
    });
}

function runISPRASparqlQuery(uri){
    
    return new Promise(function(resolve, reject){
        var query = 'CONSTRUCT WHERE { ' +
            '?s <http://www.w3.org/2002/07/owl#sameAs> <' + uri + '> . ' +
            '?s ?p ?o . ' +
        '} LIMIT 10000';

        var results = new ldf.SparqlIterator(query, { fragmentsClient: smartClient.fragments['ispra'] });
        
        results.on('data', function(d){
            smartClient.graph.push(d);
        });
        
        results.on('end', function(){
            resolve();
        });
    });

}

function runMainSparqlQuery(uri){
    
    return new Promise(function(resolve, reject){

        var query = 'CONSTRUCT WHERE {' +
            '<' + uri + '> ?p ?o . ' +
        '} LIMIT 10000';

        var results = new ldf.SparqlIterator(query, { fragmentsClient: smartClient.fragments['dbpedia'] });
        results.on('data', function(d){
            smartClient.graph.push(d);
        });
        results.on('end', function(){
            resolve();
        });
    });
}

function runTemplate(uri){
    
    var templateData = {
        title       : findFirstInGraph(uri, 'http://www.w3.org/2000/01/rdf-schema#label'),
        description : findFirstInGraph(uri, 'http://dbpedia.org/ontology/abstract'),
        image       : findFirstInGraph(uri, 'http://dbpedia.org/ontology/thumbnail')
    };
    
    var source   = $("#place-template").html();
    var template = Handlebars.compile(source);
    
    $('#results').append( template(templateData) );
    
    function toNumber(s){
        return +s.replace(/"/g, '');
    }
    
    var alternateURI = 'http://dati.isprambiente.it/id/place/58047';    // TODO: this should be automagic
    var centerLat = findFirstInGraph(alternateURI, 'http://www.w3.org/2003/01/geo/wgs84_pos#lat');
    centerLat = toNumber(centerLat);
    var centerLon = findFirstInGraph(alternateURI, 'http://www.w3.org/2003/01/geo/wgs84_pos#long');
    centerLon = toNumber(centerLon);
    var polygon   = findFirstInGraph(alternateURI, 'http://www.opengis.net/ont/gml#polygon');
    polygon = polygon.replace(/"/g, '').split(', ');
    polygon = _.map(polygon, function(p){
        p = p.split(' ');
        return [ toNumber(p[1]), toNumber(p[0]) ];
    });
    
    console.log(centerLat, centerLon, polygon);
    
    var geoJSON   = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [polygon]
        }
    };
    console.log(centerLat, centerLon, polygon);
    var map = L.map('map-container').setView( [ centerLat, centerLon ], 10);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    L.geoJson(geoJSON).addTo(map);
}

function findFirstInGraph(subject, predicate){
    
    var triple = _.find(smartClient.graph, function(t){
        return (t.subject == subject) && (t.predicate == predicate);
    });
    
    if(triple){
        return triple.object;
    } else {
        console.warn('could not find ' + subject + ' ' + predicate + ' ?');
        return null;
    }
}

function stringifyTriple(t){
    
    var tString = '';
    if(_.has(t, '?s')){
        tString += 'S: ' + t['?s'] + ' ';
    }
    if(_.has(t, '?p')){
        tString += 'P: ' + t['?p'] + ' ';
    }
    if(_.has(t, '?o')){
        tString += 'O: ' + t['?o'] + ' ';
    }
    return tString;
}