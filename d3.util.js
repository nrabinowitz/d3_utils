/*!
 * Miscellaneous personal utilities for d3.
 * Copyright (c) 2011, Nick Rabinowitz / Google Ancient Places Project
 * Licensed under the BSD License.
 */
 
/**
 * @namespace Utility namespace
 */
d3.util = d3.util || {};
 
/**
 * Determine whether to use black or white text over a given color.
 * @param {String|Color} fill       Color under the text
 * @return {String}                 Black or white, in hex
 */
d3.util.textOnFill=  function(fill) {
    fill = d3.rgb(fill);
    var sum = fill.r + fill.g + fill.b;
    return sum/3 < 152 ? '#fff' : '#000';
};

// Misc common formats, added to d3.format as a convenience
d3.format.percentage = d3.format('%');
d3.format.comma = d3.format(',');

/**
 * Format large numbers in a concise 1- to 3-digit style, with
 * a magnitude suffix if necessary
 * @param {Number} d        Number to format
 */
d3.format.big = function(d) {
    // determine order of magnitude
    var orders = [
            ['', 1],
            ['K', 1000],
            ['M', 1000000],
            ['Bn', 1000000000]
        ], 
        order = 0,
        format;
    while (order < orders.length-1 && d > orders[order+1][1]) order++;
    order = orders[order];
    d = d / order[1];
    format = d3.format(d >= 100 || d - ~~d < .059 ? '.0f' : '.1f'); 
    return format(d) + order[0];
};
d3.format.amount = function(d) { return '$' + d3.format.big(d) };


// geo utilities
if (d3.geo) {

    /**
     * Fit projection to a given bounding box, based on geodata
     * @param {d3.projection} projection    projection to fit
     * @param {geojson} data                geojson
     * @param {Array} box                   x,y bounding box, as [[x1,y1],[x2,y2]]
     * @param {Object} [options]            Container for optional params
     * @param {Number} [options.padding]        padding on bounding box
     * @param {Boolean} [options.center]        whether to center the points or align to top left
     * @return {d3.projection}  projection, with scale and translate set appropriately
     */
    d3.geo.fitProjection = function(projection, data, box, options) {
        var opts = options || {},
            padding = opts.padding || 0,
            center = opts.center,
            // get the bounding box for the data - might be more efficient approaches
            left = Infinity,
            bottom = -Infinity,
            right = -Infinity,
            top = Infinity;
        // set up bounding box
        if (padding) {
            box[0][0] += padding;
            box[0][1] += padding;
            box[1][0] -= padding;
            box[1][1] -= padding;
        }
        // reset projection
        projection
            .scale(1)
            .translate([0, 0]);
        // find bounding box (almost)
        data.features.forEach(function(feature) {
            d3.geo.bounds(feature).forEach(function(coords) {
                coords = projection(coords);
                var x = coords[0],
                    y = coords[1];
                if (x < left) left = x;
                if (x > right) right = x;
                if (y > bottom) bottom = y;
                if (y < top) top = y;
            });
        });
        // project the bounding box, find aspect ratio
        function width(bb) {
            return (bb[1][0] - bb[0][0])
        }
        function height(bb) {
            return (bb[1][1] - bb[0][1]);
        }
        function aspect(bb) {
            return width(bb) / height(bb);
        }
        var startbox = [[left, top],  [right, bottom]],
            a1 = aspect(startbox),
            a2 = aspect(box),
            widthDetermined = a1 > a2,
            scale = widthDetermined ?
                // scale determined by width
                width(box) / width(startbox) :
                // scale determined by height
                height(box) / height(startbox),
            // set x translation
            transX = box[0][0] - startbox[0][0] * scale,
            // set y translation
            transY = box[0][1] - startbox[0][1] * scale;
        // center if requested
        if (center) {
            if (widthDetermined) {
                transY = transY - (transY + startbox[1][1] * scale - box[1][1])/2;
            } else {
                transX = transX - (transX + startbox[1][0] * scale - box[1][0])/2;
            }
        }
        return projection.scale(scale).translate([transX, transY])
    };
    
    // monkey patch mercator to accept origin()
    d3.geo.mercator_origin = function() {
      var d3_geo_radians = Math.PI / 180,
          scale = 500,
          translate = [480, 250],
          origin = [0,0];

      function mercator(coordinates) {
        var x = (coordinates[0] + origin[0]) / 360,
            y = -(Math.log(Math.tan(Math.PI / 4 + coordinates[1] * d3_geo_radians / 2)) / d3_geo_radians) / 360;
        // fix x
        x += (x < -.5) ? 1 : (x > .5) ? -1 : 0;
        return [
          scale * x + translate[0],
          scale * Math.max(-.5, Math.min(.5, y)) + translate[1]
        ];
      }

      mercator.invert = function(coordinates) {
        var x = (coordinates[0] - translate[0]) / scale,
            y = (coordinates[1] - translate[1]) / scale;
        return [
          360 * x,
          2 * Math.atan(Math.exp(-360 * y * d3_geo_radians)) / d3_geo_radians - 90
        ];
      };

      mercator.scale = function(x) {
        if (!arguments.length) return scale;
        scale = +x;
        return mercator;
      };

      mercator.translate = function(x) {
        if (!arguments.length) return translate;
        translate = [+x[0], +x[1]];
        return mercator;
      };
      
      mercator.origin = function(x) {
        if (!arguments.length) return origin;
        origin = x;
        return mercator;
      };

      return mercator;
    };
    
}