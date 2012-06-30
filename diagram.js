(function($, window) {

  var stage,
      Node = window.Node,
      Segment = window.Segment;

  var NODE_DIMENSIONS = {
    w: 50,
    h: 50
  };

  function initialize() {
    stage = $('#stage');

    var nodeA = new Node({
      title: 'Node A',
      stage: stage,
      w: NODE_DIMENSIONS.w,
      h: NODE_DIMENSIONS.h,
      x: 100,
      y: 200,
      events: {
        click: function() {
          window.console.log(this);
        }
      }
    }).attach();

    var nodeB = new Node({
      title: 'Node B',
      stage: stage,
      w: NODE_DIMENSIONS.w,
      h: NODE_DIMENSIONS.h,
      x: 200,
      y: 50
    }).attach();

    var nodeC = new Node({
      title: 'Node C',
      stage: stage,
      w: NODE_DIMENSIONS.w,
      h: NODE_DIMENSIONS.h,
      x: 300,
      y: 300
    }).attach();

    var nodeD = new Node({
      title: 'Node D',
      stage: stage,
      w: NODE_DIMENSIONS.w,
      h: NODE_DIMENSIONS.h,
      x: 350,
      y: 150
    }).attach();

    new Segment({
      h: 5,
      stage: stage,
      origin: nodeA,
      destination: nodeB
    }).attach();

    new Segment({
      h: 5,
      stage: stage,
      origin: nodeC,
      destination: nodeA
    }).attach();

    new Segment({
      h: 5,
      stage: stage,
      origin: nodeA,
      destination: nodeD
    }).attach();

    new Segment({
      h: 5,
      stage: stage,
      origin: nodeB,
      destination: nodeD
    }).attach();

    new Segment({
      h: 5,
      stage: stage,
      origin: nodeC,
      destination: nodeD
    }).attach();

    new Segment({
      h: 5,
      stage: stage,
      origin: nodeD,
      destination: nodeC
    }).attach();

  }

  initialize();

}(jQuery, window));