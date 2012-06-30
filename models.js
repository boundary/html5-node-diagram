(function($, window) {

  /* bind is not available in Safari browsers */
  if (typeof Function.prototype.bind === 'undefined') {
    Function.prototype.bind = function(context) {
      var that = this;
      return function() {
        return that.apply(context || null,
                          Array.prototype.slice.call(arguments));
      };
    };
  }

  var RAD2DEG = 180 / Math.PI,
      DEG2RAD = Math.PI / 180;

  /**
   * Base prototype for a diagram element
   * @param {object} opts
   * Possible Options:
   * type: segment or node
   * w: width of the element
   * h: height of the element
   * x: starting x coordinate of the element
   * y: starting y coordinate of the element
   * title: assign a title to the element to display
   * stage: the parent container in which to append the element
   * events: {
   *   click: called when the element is clicked (optional)
   * }
   */
  function Particle(opts) {
    opts = opts || {};
    this.title = opts.title;

    /* Store dimensions and pre-compute center */
    this.dimensions = {
      w: opts.w || 0,
      h: opts.h || 0,
      center: {
        x: (opts.w || 0) / 2,
        y: (opts.h || 0) / 2
      }
    };

    /* X/Y coords of this element */
    this.translate = {
      x: opts.x || 0,
      y: opts.y || 0
    };

    /* Reference to the parent container */
    this.stage = $(opts.stage);

    /* DOM element to represent this Particle
       The type passed in will be assigned as
       a class name of the element. */
    this.el = $('<div class="' + opts.type + '"></div>');

    this.el.css({
      width: this.dimensions.w,
      height: this.dimensions.h
    });

    /* Setup default events and assign events from options */
    this.events = { base: function() {} };
    for (var k in (opts.events || {})) {
      this.events[k] = opts.events[k];
    }
    return this;
  }

  /**
   * Attach the element to the parent container.
   * Calls onAttach before attaching to allow
   * custom functions to be run before attaching.
   */
  Particle.prototype.attach = function() {
    this.onAttach.call(this);
    this.stage.append(this.el);
    this.setPosition();
    return this;
  };

  /**
   * Remove the element from the parent.
   */
  Particle.prototype.remove = function() {
    this.onRemove.call(this);
    this.el.remove();
    return this;
  };

  /**
   * Set the CSS position of the element to the
   * coordinates saved in the translate object.
   */
  Particle.prototype.setPosition = function() {
    this.el.css({
      top: this.translate.y,
      left: this.translate.x
    });
    return this;
  };

  /**
   * Represents a circle node on the diagram.
   * Extends Particle prototype.
   * @param {object} opts
   * Possible Options: Same as Particle.
   */
  function Node(opts) {
    opts.type = 'node';
    Particle.prototype.constructor.call(this, opts);
    this.el.on({
      mousedown: this.onDragStart.bind(this),
      mouseup: this.onDragEnd.bind(this),
      click: this.onClick.bind(this)
    });
    /**
     * Set up a list of segments that can be
     * attached to this node.
     */
    this.segments = [];
  }

  Node.prototype = new Particle();
  Node.prototype.constructor = Particle;

  /**
   * Append a title element to the node on attach.
   */
  Node.prototype.onAttach = function() {
    this.el.append('<h4>' + this.title + '</h4>');
  };

  /**
   * Add a segment to the segments list. Expects
   * a Segment object.
   */
  Node.prototype.addSegment = function(segment) {
    this.segments.push(segment);
  };

  /**
   * Run through all segments in the list and remove
   * the one requested.
   */
  Node.prototype.removeSegment = function(segment) {
    for (var i = 0; i < this.segments.length; i++) {
      if (this.segments[i] === segment) {
        this.segments.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Call the click event passed in when instantiating
   * a new node. Can be used to trigger other events
   * specific to the diagram.
   */
  Node.prototype.onClick = function(e) {
    (this.events.click || this.events.base).call(this);
    return false;
  };

  /**
   * Engage dragging on the Node by binding the Node's
   * onDrag method to the window onmousemove. Save the
   * origin coordinates of the mousedown to account
   * for movement offsets.
   */
  Node.prototype.onDragStart = function(e) {
    $(window).on('mousemove', this.onDrag.bind(this));
    this.el.addClass('dragging');
    this.clickCoords = {
      x: e.offsetX || (e.pageX - this.el.offset().left),
      y: e.offsetY || (e.pageY - this.el.offset().top)
    };
  };

  /**
   * Called onmousemove. Sets the x/y of the Node, taking
   * into account the page offset and the click coordinates
   * to keep the node sitting under the mouse where it was
   * clicked. Also updates all attached segments to keep them
   * properly oriented.
   */
  Node.prototype.onDrag = function(e) {
    this.translate.x = e.pageX - this.clickCoords.x;
    this.translate.y = e.pageY - this.clickCoords.y;
    for (var i = 0; i < this.segments.length; i++) {
      this.segments[i].calculateRotation();
    }
    this.setPosition();
  };

  /**
   * Remove dragging events when mouse up.
   */
  Node.prototype.onDragEnd = function(e) {
    this.el.removeClass('dragging');
    $(window).off('mousemove');
  };

  /**
   * Called when .remove is called on a node.
   * Calls remove on all associated segments.
   */
  Node.prototype.onRemove = function() {
    while (this.segments.length) {
      this.segments.shift().remove();
    }
  };

  /**
   * Represents a line segment on the diagram.
   * Extends Particle prototype.
   * @param {object} opts
   * Possible Options:
   * w: width of the segment
   * h: height of the segment
   * stage: the parent container in which to append the element
   * origin: origin of the line segment (must be a Node object)
   * destination: destination of the line segment (must be a Node object)
   * events: {
   *   click: called when the element is clicked (optional)
   * }
   */
  function Segment(opts) {
    opts.type = 'segment';
    Particle.prototype.constructor.call(this, opts);

    this.el.css({ width: this.dimensions.w, height: this.dimensions.h });

    /* Add a canvas element to represent an arrowhead, and
       save references to the element and drawing context. */
    this.el.append('<canvas class="endpoint"></canvas>');
    this.canvas = {
      el: this.el.find('canvas'),
      raw: this.el.find('canvas')[0],
      ctx: this.el.find('canvas')[0].getContext('2d')
    };

    /* Set the canvas width and height in proportion
       to the line dimensions */
    this.canvas.raw.height = this.dimensions.h + 10;
    this.canvas.raw.width = Math.ceil((this.dimensions.h + 10) /
                                      Math.sin(40 * DEG2RAD));

    /* Place the canvas at the end of the line element */
    this.canvas.el.css({
      right: 1 + this.canvas.raw.width * -1
    });

    /* Save references to the origin and destination Nodes */
    this.origin = opts.origin;
    this.destination = opts.destination;

    /* Add references for this segment to both origin and destination */
    this.origin.addSegment(this);
    this.destination.addSegment(this);
  }

  Segment.prototype = new Particle();
  Segment.prototype.constructor = Particle;

  /**
   * Calculate the rotation of the line based
   * on the origin and destination Nodes' positions.
   */
  Segment.prototype.calculateRotation = function() {
    this.translate = {
      x: this.origin.translate.x + this.origin.dimensions.center.x,
      y: (this.origin.translate.y + this.origin.dimensions.center.y) -
        this.dimensions.center.y
    };

    this.distance = {
      x: (this.origin.translate.x - this.destination.translate.x) * -1,
      y: (this.origin.translate.y - this.destination.translate.y) * -1
    };

    this.rotate = 'rotate(' +
      (Math.atan2(this.distance.y, this.distance.x) * RAD2DEG).toFixed(2) +
      'deg)';

    this.el.css({
      width: this.calculateWidth(),
      transform: this.rotate,
      oTransform: this.rotate,
      msTransform: this.rotate,
      MozTransform: this.rotate,
      webkitTransform: this.rotate
    });

    this.setPosition();
  };

  /**
   * Calculate the line width based on origin and destination positions.
   */
  Segment.prototype.calculateWidth = function() {
    var w = Math.ceil(Math.sqrt(Math.pow(this.distance.x, 2) +
                     Math.pow(this.distance.y, 2))) -
      this.origin.dimensions.center.x - this.canvas.raw.width;
    return w < 0 ? 0 : w;
  };

  /**
   * Draw the arrowheads on the canvas when attached to the parent container.
   */
  Segment.prototype.onAttach = function() {
    this.canvas.ctx.fillStyle = '#bae4b3';
    this.canvas.ctx.beginPath();
    this.canvas.ctx.lineTo(0, this.canvas.raw.height);
    this.canvas.ctx.lineTo(this.canvas.raw.width, this.canvas.raw.height);
    this.canvas.ctx.lineTo(0, 0);
    this.canvas.ctx.closePath();
    this.canvas.ctx.fill();

    this.canvas.ctx.strokeStyle = 'white';
    this.canvas.ctx.lineWidth = 1;
    this.canvas.ctx.beginPath();
    this.canvas.ctx.moveTo(0, this.canvas.raw.height - 0.5);
    this.canvas.ctx.lineTo(this.canvas.raw.width, this.canvas.raw.height - 0.5);
    this.canvas.ctx.lineTo(0, 0);
    this.canvas.ctx.lineTo(0, this.canvas.raw.height - this.dimensions.h - 0.5);
    this.canvas.ctx.stroke();
    this.calculateRotation();
  };

  /**
   * Removes references to this line segment from the origin
   * and destination Nodes.
   */
  Segment.prototype.onRemove = function() {
    this.origin.removeSegment(this);
    this.destination.removeSegment(this);
    this.origin = null;
    this.destination = null;
  };

  /* Expose to the world */
  window.Particle = Particle;
  window.Node = Node;
  window.Segment = Segment;

}(jQuery, window));