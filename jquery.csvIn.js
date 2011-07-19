/* Set of functions to process csv data in jquery

Features and usage:
  1. simple processing
    var myArray = jQuery.csvIn.toArray (csvText);						// convert csv text to array using default options
    var myObject = jQuery.csvIn.toJSON (csvText);						// convert csv text to JSON object using default options
  2. processing using custom settings
	You can define your own settings for the parsing of the csv.
	examples:
  	  var myArray = jQuery.csvIn.toArray( csvText, {quote:"'"});				// convert csv text to array using single quote as the quote marker (default is double quote)
  	  var myArray = jQuery.csvIn.toArray( csvText, {quote:"'\""});				// convert csv text to array using both single and double quote as quote markers
	  var myArray = jQuery.csvIn.toArray( tsvText, {delim:"\t", quote:"'"});	// convert tsv text to array using tab as column delimitor and single quote as the quote marker
	Following options are available:
	  * delim: column delimitor, comma by default,
	  * quote: quote marker, double quote by default,
	  * lined: row delimitor, \r\n by default,
	  * startLine: first line to return, 0 by default,
	  * endLine: last line to return, -1 by default (extract until last line when -1),
	  * excludedColumns: list of columns which should not be returned, empty array by default (returns all columns)
  3. delimitor detection
    the plugin can automatically detect the delimitor, using this syntax:
	  var options = {};
      options.delim =  jQuery.csvIn.detectDelimitor (csvText);		// detect delimitor for the csv text
	  var myArray = jQuery.csvIn.toArray( csvText, options);
	it is recommended to use this feature only to guess the delimitor, and have it confirmed by the software user
  4. guess presence of header row
	var myArray = jQuery.csvIn.toArray( csvText, options);				// convert csv text to array using user-defined options
    var headerCheck = jQuery.csvIn.isHeader ( myArray[0]);				// returns true in case first row might be a header row
  5. filter rows and columns)
    You can extract only subset of the rows, otherwise exclude columns you are not interested in
	example:
	  var options = {};	
	  options.startLine = 1;
	  options.endLine = 20;
	  var myArray = jQuery.csvIn.toArray( csvText, options);			// convert only rows 1 to 20 of the csv text to array.
	You can also specify the columns that you want to skip
	example:
	  var myArray = jQuery.csvIn.toArray( csvText, {excludedColumns : [1]});				// second column of the csv file will be ignored, all other columns will be returned
  6. Override default settings
    you can override the default options.
	Example:
      $.fn.csvIn.defaults.delim ="\t";									// override default delimitor setting to tab instead of comma
      var myArray = jQuery.csvIn.toArray( csvText);						// convert csv text to array using tab as column delimitor
    Note: this needs only to be called once and does not have to be called from within a 'ready' block

Performance
  When parsing large csv files data, use startLine and endLine if you need only to get a subset of the records, this will speed-up the processing.
  Excluding columns adds an overhead to the processing.
  You might speed up loading in case there is no quote with this option: options.quote = 0; // Use with care: there might be quotes

Copyright
csvIn is licensed under Apache license version 2.0

csvIn code is based on jquery.csv plugin, licensed under Apache license version 2.0
jquery.csv plugin home: http://code.google.com/p/js-tables/
  
  
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

	// Returns the number of occurences of substring 'substr1' within string 'string1'
	function count_substr(substr1, string1) {
		var count = 0;
		var substrLength = substr1.length;

		for (var i=0; i < string1.length; i++) {
			if (substr1 == string1.substr(i, substrLength))
				count++;
		}
		return count;
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
		options = $.extend($.csvIn.defaults, options);		

		// create appropriate regular expressions
		var param = parse_param(options.delim, options.quote, options.lined),
			trailing  = param[0],
			linedre   = param[1],
			splitline = param[2];

		// Split into lines, and then call splitline repeatedly.
		var lines = data.replace(trailing, '').split(linedre)  // split into lines

		// set endLine value according to selected option and file length
		if (options.endLine==-1)
		// read file until the end
			options.endLine = lines.length;
		else
		// get the lowest of endLine and total number of lines
			options.endLine = lines.length>options.endLine?options.endLine:lines.length;

		header = splitline(lines[0]);                      	// and get the first row (header)
console.log(header);
		nfields = header.length;
		out = [];                                           // put the results into this array

		for (var i=options.startLine; i<options.endLine; i++) {
			var line = splitline(lines[i]);                     // split each subsequent row
			for (var j=0, result={}; j<nfields; j++) {          // and make it a hash of fields, using the header
				result[header[j]] = line[j];
			}
			out.push(result);                                   // add the hash
		}
		return out;
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

	$.csvIn.detectDelimitor = function( rows ) {
	// guess csv file delimitor.
	// returns the delimitor detected: "space", "comma", "colon", "semicolon", "hyphen", "tab" or an empty string otherwise
	// "rows" should be a subset of the parsed csv
	// inspired by php example from http://stackoverflow.com/questions/761932/how-should-i-detect-which-delimiter-is-used-in-a-text-file
	// this function assumes that the row separator is \r\n

// todo: replace line parsing by $.csvIn.toArray ?
// or at least check split function cross-browser compatibility
		// candidates store the standard delimitors to check
		var candidates = [";", ",", "\t", "-", ":", " "];
		
		// select first rows
		rows = rows.split('\r\n');

// todo: limitedRows is not needed, just adapt the j indexed loop below to get rid of it
		// limitedRows stores the rows that have to be checked
		var limitedRows = [];
		
		// 7 first rows will be scanned, unless file is smaller
		lastRow = Math.min(7,rows.length);

		for (i =0;i<lastRow;i++) {
		// store rows to check
			limitedRows.push(rows[i]);
		}

		for (i in candidates) {
		// perform the check in each candidate
			var previousCount=0;
			var candidateCheck = true
			for (j in limitedRows) {
				if (limitedRows[j].length <2)
				// skip irrelevant limitedRows
					break;
				currentCount = count_substr(candidates[i], limitedRows[j]);

				if ( currentCount==0 || (currentCount != previousCount) && previousCount !=0) {
				// number of colums differs between lines for this candidate delimitor
				// this is not the delimitor of the file
					candidateCheck = false;
					break;
				}
				previousCount = currentCount;
			}
			if(candidateCheck) {
			// return name of delimitor in case tested one is valid (same column count for the seven rows using this delimitor)
				switch(candidates[i]) {
					case " ":
						return "space";
					break;
					case ",":
						return "comma";
					break;
					case ":":
						return "colon";
					break;
					case ";":
						return "semicolon";
					break;
					case "-":
						return "hyphen";
					break;
					case "\t":
						return "tab";
					break;
				}
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
		excludedColumns: [] // no column is excluded by default
	};

})(jQuery);