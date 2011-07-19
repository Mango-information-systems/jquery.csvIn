/* Set of functions to process csv data in jquery

Features and usage:
1. Available functions
    1.1 `cvIn.toArray (data, options)` converts csv file into two-dimensional array
    1.2 `cvIn.toJSON (data, options)` converts csv file into array of JSON objects
    1.3 `cvIn.detectDelimitor (data, options)` attempts to determine the delimitor used in the csv file (evaluating six candidates: comma, tab, semicolon, colon, hyphen and space)
    1.4 `cvIn.isHeader (firstRow)` guesses whether the first row is a header or not. firstRow must be the first element returned by `cvIn.toArray`

2. Options

    You can specify options using object literal notation. You can combine any of the available options for the function you are using. In case you do not specify some options, their default values will be used.
    Options for `cvIn.toArray`:
    * `delim`: column delimitor, comma by default,
    * `quote`: quote marker, double quote by default,
    * `lined`: row delimitor, \r\n by default,
    * `startLine`: first line to return, 0 by default,
    * `endLine`: last line to return, -1 by default (extraction until last line),
    * `excludedColumns`: list of columns which should not be returned, empty array by default (returns all columns).
    `cvIn.toJSON` accepts same options than `cvIn.toArray` plus an extra: `customHeaders`, which should be an array of strings column titles. If not specified, the first row of the csv will be used for the column titles.
    `cvIn.detectDelimitor` uses `quote` and `lined` options.
    `cvIn.isHeader` function does not accept any option.

3. Overriding default options
    You can override default options. Then any call to the functions without a second parameter will use the new default you have specified.
    Example: override default delimitor setting to tab instead of comma
    `$.csvIn.defaults.delim = "\t";`

read here for documentation and examples: https://github.com/Mango-information-systems/jquery.csvIn/blob/master/README.md

License and credits

Copyright (c) 2011 Mango Information Systems SPRL, http://www.mango-is.com

This plugin will either be released under dual license (MIT + LGPL) or under Apache license version 2.0. Precision will be added soon right here.

csvIn code is based on [jquery.csv] plugin, licensed under Apache license version 2.0

[jquery.csv]: http://code.google.com/p/js-tables/

*/


(function($) {

	// split() doesn't work properly on IE. "a,,b".split(",") returns ["a", "b"] and not ["a", "", "b"]
	// On IE, you need to fix String.prototype.split first. See http://blog.stevenlevithan.com/archives/cross-browser-split
	if ('a,,b'.split(',').length < 3) {
		var nativeSplit = nativeSplit || String.prototype.split;
		String.prototype.split = function (s /* separator */, limit) {
			// If separator is not a regex, use the native split method
			if (!(s instanceof RegExp)) {
					return nativeSplit.apply(this, arguments);
			}

			/* Behavior for limit: If it's...
			 - Undefined: No limit
			 - NaN or zero: Return an empty array
			 - A positive number: Use limit after dropping any decimal
			 - A negative number: No limit
			 - Other: Type-convert, then use the above rules */
			if (limit === undefined || +limit < 0) {
				limit = false;
			} else {
				limit = Math.floor(+limit);
				if (!limit) {
					return [];
				}
			}

			var flags = (s.global ? "g" : "") + (s.ignoreCase ? "i" : "") + (s.multiline ? "m" : ""),
				s2 = new RegExp("^" + s.source + "$", flags),
				output = [],
				lastLastIndex = 0,
				i = 0,
				match;

			if (!s.global) {
				s = new RegExp(s.source, "g" + flags);
			}

			while ((!limit || i++ <= limit) && (match = s.exec(this))) {
				var zeroLengthMatch = !match[0].length;

				// Fix IE's infinite-loop-resistant but incorrect lastIndex
				if (zeroLengthMatch && s.lastIndex > match.index) {
					s.lastIndex = match.index; // The same as s.lastIndex--
				}

				if (s.lastIndex > lastLastIndex) {
					// Fix browsers whose exec methods don't consistently return undefined for non-participating capturing groups
					if (match.length > 1) {
						match[0].replace(s2, function () {
							for (var j = 1; j < arguments.length - 2; j++) {
								if (arguments[j] === undefined) { match[j] = undefined; }
							}
						});
					}

					output = output.concat(this.slice(lastLastIndex, match.index), (match.index === this.length ? [] : match.slice(1)));
					lastLastIndex = s.lastIndex;
				}

				if (zeroLengthMatch) {
					s.lastIndex++;
				}
			}

			return (lastLastIndex === this.length) ?
				(s.test("") ? output : output.concat("")) :
				(limit      ? output : output.concat(this.slice(lastLastIndex)));
		};
	}

	// Returns a function that splits a line into fields using a simple delimiter
	// delimre is the regular expression for the delimiter, e.g. /,/
	function simple_splitline(delimre) {
		return function(v) { return v.split(delimre); };
	}

	// Returns a function that splits a line into fields using a delimiter, and accounts for quotes.
	// For example, quoted_splitline(/,/, /"/, /""/) will break the following line:
	//      a,"b,c",d,"e,""f"",g"
	// into
	//      ['a', 'b,c', 'd', 'e,"f",g']
	function quoted_splitline(delim, delimre, quotere, doublequotere) {
		return function(v) {
			var arr = v.split(delimre);
			for (var out=[], q, i=0, l=arr.length; i<l; i++) {
				// If the value is within quotes, then from the point where the quote begins ...
				if (q = arr[i].match(quotere)) {
					q = q[0];
					// ... to the point where the quote ends
					for (var j=i; j<l; j++) {
						if (arr[j].charAt(arr[j].length-1) == q) { break; }
					}

					// Join the pieces into a single piece
					var s = arr.slice(i,j+1).join(delim);

					// Double quoting is the escape sequence for quotes. ("" instead of ")
					s = s.replace(doublequotere[q], q);

					// Use this joined piece instead of the individual pieces
					out.push(s.substr(1,s.length-2));
					i = j;
				}
				else {
					out.push(arr[i]);
				}
			}
			return out;
		};
	}

	function parse_param(delim, quote, lined) {
	// build appropriate regex for the processing
		var undef = 'undefined';
		var quotes  = quote ? quote.split('') : [],             // get each character in the quote
			delimre = new RegExp( '[' + delim + ']' ),
			quotere = new RegExp('^[' + quote + ']' );
		for (var i=0, doublequotere={}, q; q=quotes[i]; i++) {  // and make a dictionary of doublequote possibilities
			doublequotere[q] = new RegExp(q + q, 'g');
		}
		return [
			new RegExp( '[' + lined + ']*$' ),                                  // trailing line delimiter
			new RegExp( '[' + lined + '][' + lined + ']*'),                     // line delimiter,
			quote ? quoted_splitline(delim, delimre, quotere, doublequotere) :  // splitline function
					simple_splitline(delimre)
		];
	}
	
	$.csvIn = {};

	$.csvIn.toArray = function( data, options ) {
	// convert csv data to array

		// override default options with the ones defined by the user
		options = $.extend({}, $.csvIn.defaults, options);

		// create appropriate regular expressions
		var param = parse_param(options.delim, options.quote, options.lined),
			trailing  = param[0],
			linedre   = param[1],
			splitline = param[2];

		// result is the output array that will be returned by the function
		var result = [];

		// Split into lines, and then call splitline repeatedly.
		var lines = data.replace(trailing, '').split(linedre);

		// set endLine value according to selected option and file length
		if (options.endLine == -1)
		// read file until the end
			options.endLine = lines.length;
		else
		// get the lowest of endLine and total number of lines
			options.endLine = lines.length>options.endLine?options.endLine:lines.length;

		if (options.excludedColumns.length == 0) {
		// return all csv columns (faster)

			for (var i=options.startLine; i<options.endLine; i++) {
				result.push(splitline(lines[i]));
			}
		}
		else {
		// return only columns not excluded
			for (var i=options.startLine; i<options.endLine; i++) {
				split = splitline(lines[i]);
				for (j in options.excludedColumns) {
					split.splice(options.excludedColumns[j],1)
				}
				result.push(split);
			}
		}
		
		return result;
	};

	$.csvIn.toJSON = function( data, options) {
	// convert csv data to JSON format

		// override default options with the ones defined by the user
		options = $.extend({}, $.csvIn.defaults, options);

		// create appropriate regular expressions
		var param = parse_param(options.delim, options.quote, options.lined),
			trailing  = param[0],
			linedre   = param[1],
			splitline = param[2];

		// Split into lines, and then call splitline repeatedly.
		var lines = data.replace(trailing, '').split(linedre)  // split into lines

		// set endLine value according to selected option and file length
		if (options.endLine == -1)
		// read file until the end
			options.endLine = lines.length;
		else
		// get the lowest of endLine and total number of lines
			options.endLine = lines.length>options.endLine?options.endLine:lines.length;

		// setting header, using custom one if defined
		var header = options.customHeaders.length == 0 ? options.customHeaders : splitline(lines[0]);
		
		if (options.startLine == 0 && options.customHeaders.length == 0)
		// set start line to 1 in case no custom header is defined
			options.startLine=1;
		

		nfields = header.length;
		out = [];                                           // put the results into this array

		if (options.excludedColumns.length == 0) {
		// return all csv columns (faster)
			for (var i=options.startLine; i<options.endLine; i++) {
				var line = splitline(lines[i]);                     // split each subsequent row
				for (var j=0, result={}; j<nfields; j++) {          // and make it a hash of fields, using the header
					result[header[j]] = line[j];
				}
				out.push(result);                                   // add the hash
			}
			return out;
		}
		else {
		// return only columns not excluded
			for (var i=options.startLine; i<options.endLine; i++) {
				line = splitline(lines[i]);						// split each subsequent row
				result = {};
				for (var j=0; j<nfields; j++) {
				// and make it a hash of fields, using the header
					if ($.inArray(j,options.excludedColumns) == -1)
					// check whether column is not excluded
						result[header[j]] = line[j];
				}
				out.push(result);                                   // add the hash
			}
		return out;
		}
		
		
		
		

/*
		for (var i=options.startLine; i<options.endLine; i++) {
			var line = splitline(lines[i]);                     // split each subsequent row
			for (var j=0, result={}; j<nfields; j++) {          // and make it a hash of fields, using the header
				result[header[j]] = line[j];
			}
			out.push(result);                                   // add the hash
		}
		return out;
*/


	};

	$.csvIn.isHeader = function( firstRow) {
	// check whether first row (from array) is a header
	// returns true in case the given row (line) looks like a header
	// the guess is based on the following assumptions:
	// 1. no column is empty
	// 2. no column has a numeric type
	// 3. all values are unique
	// possible enhancement: check whether any column looks like date

		var checkedValues = [];

		for (i in firstRow) {
		// checking each column
			// 1. check whether column is empty
			if (firstRow[i] == "")
				return false;
			// 2. check whether type is string
			if (parseInt(firstRow[i]))
				return false;
			// 3. check whether all column values are unique
			if ($.inArray(firstRow[i], checkedValues) != -1)
				return false;

			// add column value to the checkedValues array
			// necessary for test 3
			checkedValues.push(firstRow[i]);
		}
		return true;
	};

	$.csvIn.detectDelimitor = function( data, options ) {
	// guess csv file delimitor.
	// returns the delimitor detected: "space", "comma", "colon", "semicolon", "hyphen", "tab" or an empty string otherwise
	// "data" should be either the full csv string or a subset of it, containing at least several lines.
	// inspired by php example from http://stackoverflow.com/questions/761932/how-should-i-detect-which-delimiter-is-used-in-a-text-file

		// candidates store the standard delimitors to check
		var candidates = [";", ",", "\t", "-", ":", " "];

		// override default options with the ones defined by the user
		options = $.extend({}, $.csvIn.defaults, options);

		// create appropriate regular expressions
		var param = parse_param(options.delim, options.quote, options.lined),
			trailing  = param[0],
			linedre   = param[1],
			splitline = param[2];
		// Split into lines, and then call splitline repeatedly.
		var lines = data.replace(trailing, '').split(linedre);

		// 7 first lines will be scanned, unless file is smaller
		lastRow = Math.min(7,lines.length);

		for (i in candidates) {
		// perform the check in each candidate
			var previousCount=0;
			var candidateCheck = true
			for (j =0; j < lastRow; j++) {
				if (lines[j].length <2)
				// skip irrelevant lines
					break;
				// reset splitline function using current candidate			
				options.delim = candidates[i];
				param = parse_param(options.delim, options.quote, options.lined);
				trailing  = param[0];
				linedre   = param[1];
				splitline = param[2];
				// count number of columns using current delimitor
				currentCount = splitline(lines[j]).length;

				if ( currentCount <= 1 || (currentCount != previousCount) && previousCount !=0) {
				// number of colums differs between lines for this candidate delimitor
				// this is not the delimitor of the file
					candidateCheck = false;
					break;
				}
				previousCount = currentCount;
			}
			if(candidateCheck) {
			// return name of delimitor in case tested one is valid (same column count for the seven lines using this delimitor)
				return candidates[i];
			}
		}
		return "";		
	};
	
	$.csvIn.defaults = {
	// set default options
		delim: ',',         // delimiter is comma by default
		quote: '"',         // quotes mark is "double quotes" by default
		lined: '\r\n',      // line delimiter is \r or \n or both
		startLine: 0,		// first line to read, 0 by default
		endLine: -1,		// last line to read, -1 by default - then whole file read
		excludedColumns: [], // no column is excluded by default
		customHeaders: []    // no custom header is defined by default
	};

})(jQuery);