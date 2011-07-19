## csvIn: jQuery plugin to process csv input

### Features:
1. Convert csv to two-dimensional javascript array

2. Convert csv to JSON

3. delect column delimitor

4. guess presence of header row

### Usage:
1. Process csv with custom settings

    Options for `cvIn.toArray`:

    * `delim`: column delimitor, comma by default,
    * `quote`: quote marker, double quote by default,
    * `lined`: row delimitor, \r\n by default,
    * `startLine`: first line to return, 0 by default,
    * `endLine`: last line to return, -1 by default (-1 sets extraction until last line),
    * excludedColumns: list of columns which should not be returned, empty array by default (returns all columns).

    `cvIn.toJSON` accepts same options than `cvIn.toArray` plus an extra: `customHeaders`, which should be an array of strings column titles. If not specified, the first row of the csv will be used for the column titles.

    `cvIn.detectDelimitor` uses `quote` and `lined` options.

    `cvIn.isHeader` function does not accept any option.

2. Overriding defaults

    You can override default options. Then any call to the functions without a second parameter will use the new default you have specified.

    Example:

        // override default delimitor setting to tab instead of comma
        $.fn.csvIn.defaults.delim ="\t";
        // Then the following convert tsv text to array using tab as column delimitor:
        var myArray = jQuery.csvIn.toArray( tsvText);

    Note: this needs only to be called once and does not have to be called from within a 'ready' block.

3. filtering rows and columns

### Performance
**Filter rows to speed-up processing of large files** (using startLine and endLine options). For more advanced row filtering settings you might want to have a look at [addrable].

**Excluding columns adds overhead to the processing**.

You might speed up loading in case there is no quote with this option:

    // not tested
    // Use with care: there might be quotes
    options.quote = 0;

### Installation

Pre-requisite: use jQuery.

Install as a regular jQuery plugin:

1. Download jquery.csvIn.js or the minified version jquery.csvIn.min.js

2. Upload the file to your website

3. Add a reference to the script in your html:

    <script type="text/javascript" src="/js/jquery.csvIn.min.js"></script>

4. Use the functions in your javascript

### Status


### Roadmap


### License and credits
Please read the license file
csvIn code is based on [jquery.csv] plugin, licensed under Apache license version 2.0


[jquery.csv]: http://code.google.com/p/js-tables/
[addrable]: https://github.com/mhausenblas/addrable