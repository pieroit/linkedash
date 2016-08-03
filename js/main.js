
'use strict';

var _          = require('underscore');
var Handlebars = require('handlebars');
var d3         = require('d3');
var L          = require('leaflet');

var smartClient = {};

jQuery(document).ready(function(){
    
    $('#lookup-run').click(runLookupQuery);
    
    smartClient.fragmentsClient = new ldf.FragmentsClient('http://fragments.dbpedia.org/2015/en');
});

function runLookupQuery(){
    
    var query = $('#lookup-query').val();
    var dbPediaLookupURI = 'http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryString=' + query;
    
    $.getJSON(dbPediaLookupURI, function(lookupResults){
        
        if(_.has(lookupResults, 'results')){
            // TODO: disambiguation
            
            var mainURI = lookupResults['results'][0]['uri'];
            runMainSparqlQuery(mainURI);
            runISPRASparqlQuery(mainURI);
        }
    });
}

function runISPRASparqlQuery(uri){
    
    /*
     * SELECT * WHERE {?s <http://www.w3.org/2002/07/owl#sameAs> <http://dbpedia.org/resource/Guidonia_Montecelio> . } LIMIT 1000
     */
    
    console.warn('no LDF for ISPRA');
}

function runMainSparqlQuery(uri){
    
    $('#results').empty();
    /* TODO: find other names
    var query = 'SELECT * WHERE {' +
        '?s <http://www.w3.org/2002/07/owl#sameAs> <' + uri + '> . ' +
    '} LIMIT 1000';*/
    var query = 'CONSTRUCT WHERE {' +
        '<' + uri + '> ?p ?o . ' +
    '} LIMIT 1000';
    
    smartClient.graph = [];
    var results = new ldf.SparqlIterator(query, { fragmentsClient: smartClient.fragmentsClient });
    results.on('data', function(d){
        smartClient.graph.push(d);
        $('#results').append('<p>' + stringifyTriple(d) + '</p>' );
    });
    results.on('end', function(){
        runTemplate(uri);
    });
}

function runTemplate(uri){
    
    _.each(smartClient.graph, function(t){
        //console.log(t);
    });
    
    var templateData = {
        title       : findFirstInGraph(uri, 'http://www.w3.org/2000/01/rdf-schema#label'),
        description : findFirstInGraph(uri, 'http://dbpedia.org/ontology/abstract'),
        image       : findFirstInGraph(uri, 'http://dbpedia.org/ontology/thumbnail')
    };
    
    var source   = $("#place-template").html();
    var template = Handlebars.compile(source);
    
    $('#results').append( template(templateData) );
}

function findFirstInGraph(subject, predicate){
    
    var triple = _.find(smartClient.graph, function(t){
        return (t.subject == subject) && (t.predicate == predicate);
    });
    
    return triple.object;
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