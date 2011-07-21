## csvIn: jQuery plugin to process csv input

jquery.csvIn processes csv data in javascript. It is especially useful to deal with input files at client side in HTML5 applications.

It is based on [jquery.csv] plugin and extend its functionalities.

### Features:

1. Convert csv to javascript array (two-dimensional)

2. Convert csv to JSON object

3. Filter lines and columns

4. Delect column delimitor

5. Guess presence of header row

### Examples:

1. Convert CSV to array

    using default options
    
    ````javascript
    $.csvIn.toArray('1,2,3\n4,5,6\n7,8,9\n');
    // returns [ ["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"] ]
    ````
    
    it handles quotes
    
    ````javascript
    $.csvIn.toArray('a,"b,c",d');
    // returns [ ['a', 'b,c', 'd'] ]
    ````

    specify csv settings, eg tab as column delimitor:
    
    ````javascript
    $.csvIn.toArray('1\t2\n3\t4', {delim:"\t"});
    // returns [ ["1", "2"], ["3", "4"] ]
    ````
        
    for full list of settings refer to the section "Usage/Options" below

2. Convert CSV to JSON

    using default settings
    
    ````javascript
    $.csvIn.toJSON('col1, col2, col3\n1,2,3\n4,5,6\n7,8,9\n');
    /* returns:
    [
    { "col1": "1", " col2": "2", " col3": "3" },
    { "col1": "4", " col2": "5", " col3": "6" },
    { "col1": "7", " col2": "8", " col3": "9" }
    ]
    */
    ````
    
    specifying your own column headers
    
    ````javascript
    $.csvIn.toJSON('cars,200\nplanes,175\nbikes,500\n', {"customHeaders":["products","sales"]});
    /* returns
    [
    { "products": "cars", "sales": "200" },
    { "products": "planes", "sales": "175" },
    { "products": "bikes", "sales": "500" }
    ]
    */
    ````
    
    you can use same custom options as in $csvIn.toArray

3. Filter columns and rows
        
    Extract only first two rows, and first two columns
    
    ````javascript
    $.csvIn.toArray('1,2,3\n4,5,6\n7,8,9\n', {endLine:2,excludedColumns:[2]});
    // returns [ ["1", "2"], ["4", "5"] ]
    ````

4. Detect column delimitor

    Call the `detectedDelimitor` function to find the column delimitor of a csv file
    
    ````javascript
    var detectedDelimitor = jQuery.csvIn.detectDelimitor ('1,2,3\n4,5,6\n7,8,9\n');
    // returns ","
    ````

    Confident use - only if you are sure that your files contain only one delimitor and are well structured:

    ````javascript
    // 1. detect the delimitor
    var detectedDelimitor = jQuery.csvIn.detectDelimitor (csvText);
    // 2. convert the file
    var myArray = jQuery.csvIn.toArray( csvText, {"delim":detectedDelimitor});
    ````
        
    Safer use:

    ````javascript
    // 1. detect the delimitor
    var detectedDelimitor = jQuery.csvIn.detectDelimitor (csvText);
    // 2. convert a part of your file to preview to the user
    var myPreview = jQuery.csvIn.toArray( csvText, {"delim":detectedDelimitor, "endLine":5});
    // 3. display preview of the file to the user, and let him confirm the delimitor choice
    //your own code here, where you might update the variable detectedDelimitor
    // 4. convert the whole file with the confirmed delimitor
    var myArray = jQuery.csvIn.toArray( csvText, {"delim":detectedDelimitor});
    ````

5. Guess the presence of a header

    pass in the first row of array to guess whether it is a header 

    ````javascript
    var headerCheck = jQuery.csvIn.isHeader( ["manufacturer","year", "productCount"]);
    // returns true

    var headerCheck = jQuery.csvIn.isHeader( ["Someone","2009","500"]);
    // returns false
    ````
      
    this feature should be used with care, we recommend to ask confirmation to the user.

    ````javascript
    // 1. convert the file to an Array
    var myArray = jQuery.csvIn.toArray( csvText );
    // 2. Guess  whether the first row is a header
    var headerCheck = jQuery.csvIn.isHeader( myArray[0]);
    // returns true or false
    // 3. show converted data to the user and make him confirm whether the first row is actually a header
    ````

### Usage:

1. Functions

    1.1 `cvIn.toArray (data, options)` converts csv file into two-dimensional array

    1.2 `cvIn.toJSON (data, options)` converts csv file into array of JSON objects
    
    1.3 `cvIn.detectDelimitor (data, options)` attempts to determine the delimitor used in the csv file (evaluating six candidates: comma, tab, semicolon, colon, hyphen and space)
    
    1.4 `cvIn.isHeader (firstRow)` guesses whether the first row is a header or not. firstRow must be the first element returned by `cvIn.toArray`

2. Available options

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

    ````javascript
    $.csvIn.defaults.delim = "\t";
    // Then the following convert tsv text to array using tab as column delimitor:
    var myArray = jQuery.csvIn.toArray( tsvText);
    // other default settings (quote, lined, ...) remain unchanged
    ````
        
    N.B.: Call this only once at the beginning of your javascript.

### Performance

**Filter rows to speed-up processing of large files** (using startLine and endLine options). For more advanced row filtering settings you might want to have a look at [addrable].

**Excluding columns adds overhead to the processing**.

You might speed up loading in case there is no quote using the option `quote:0`:

### Installation

Pre-requisite: use jQuery.

Install as a regular jQuery plugin:

1. Download jquery.csvIn.js or the minified version jquery.csvIn.min.js

2. Upload the file to your website

3. Add a reference to the script in your html:

    ````html
    <script type="text/javascript" src="/js/jquery.csvIn.min.js"></script>
    ````

4. Use the functions in your javascript

### Status

This software as an alpha version and probably contains bugs. Moreover, it has not be tested on all browsers of the market.

Thanks for reporting any bug you might find.

### Roadmap

Various enhancements could be brought, we are open to suggestions, so send us your feedback :).

### License and credits

Copyright (c) 2011 Mango Information Systems SPRL, http://www.mango-is.com

This plugin will either be released under dual license (MIT + LGPL) or under Apache license version 2.0. Precision will be added soon right here.

csvIn code is based on [jquery.csv] plugin, licensed under Apache license version 2.0

[jquery.csv]: http://code.google.com/p/js-tables/

[addrable]: https://github.com/mhausenblas/addrable

[reporting any bug]: https://github.com/Mango-information-systems/jquery.csvIn/issues/new