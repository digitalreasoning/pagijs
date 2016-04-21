var assert = require('assert');
var testStreams = require('../test-stream');
var Pagi = require('../../src/js/pagi');
var Node = require('../../src/js/graph/node');
var maryStream = testStreams.fullList.filter(function(stream) {
    return stream.name === 'mary';
})[0];

describe('Graph manipulation for `mary` stream', function() {
    var graph;
    function createGraph(done) {
        Pagi.parse(maryStream.getXmlStream()).then(function(aGraph) {
            graph = aGraph;
            done();
        });
    }

    describe('graph functions for manipulation', function() {
        beforeEach(createGraph);

        it('can create new nodes', function() {
            var node = graph.createNode('TEST NODE');
            assert(node instanceof Node);
            assert.equal(node.getType(), 'TEST NODE');
            assert.ok(node.getId());
            assert.strictEqual(node._graph, graph);
        });
    });

    describe('adding a node to the graph', function() {
        var node;
        beforeEach(createGraph);
        beforeEach(function() { node = graph.createNode('TEST NODE'); });

        it('node must contain a type', function() {
            assert.throws(function() {
                graph.createNode();
            }, /type is a required param/);
        });
        it('adding a node with the same id as another will error', function() {
            node.setId('1');
            node.setType('TOK');
            assert.throws(function() {
                graph.addNode(node);
            }, /contains a node with id `1`/);
        });
        it('node without an id will get a generated id', function() {
            node.setType('TOK');
            // IDs should increment consecutively.
            assert.equal(node.getId(), (parseInt(graph._generateNodeId()) - 1).toString());
        });
        it('node will be added to the graph', function() {
            var preAddTotalCount = graph.getNodes().length;
            var preAddTypeCount = graph.getNodesByType('TOK').length;
            node = new Node('900000', graph, 'TOK');
            graph.addNode(node);
            assert.equal(node, graph.getNodeById(node.getId()));
            assert.equal(preAddTotalCount, graph.getNodes().length - 1);
            assert.equal(preAddTypeCount, graph.getNodesByType(node.getType()).length - 1);
        });
        describe.only('sequence trait', function() {
            beforeEach(createGraph);
            beforeEach(function() { node = graph.createNode('TOK', '9000000'); });

            it('adding a first node', function() {
                node.addEdge('24', 'next');
                assert.equal(node.next(), graph.getNodeById('24'));
                assert.equal(node.previous(), undefined);
            });
            it('adding a middle node', function() {
                // console.log('24s next edge', graph.getNodeById('24').next()._id);
                // console.log('83s prev edge', graph.getNodeById('83').previous()._id);
                node.addEdge('83', 'next');
                // console.log('Nodes next edge should be 83', node.next()._id);
                assert.equal(node.previous(), graph.getNodeById('24'));
                assert.equal(node.next(), graph.getNodeById('83'));
            });
            it('has access to it\'s parents', function() {
                node.addEdge('83', 'next');
                graph.addNode(node);
                assert.equal(node.getFirstParentOfType('SB'), graph.getNodeById('68'));
            });
        });
    });
    describe('adding an edge to a node', function() {
        var node;
        beforeEach(createGraph);
        beforeEach(function() {
            node = graph.createNode('TOK');
        });

        it('creates the edge', function() {
            node.addEdge('2', 'arbitrary-edge', 'TOK');
            var edge = node.getFirstEdgeByType('arbitrary-edge');
            assert.equal(edge.getTargetId(), '2');
            assert.equal(edge.getTargetType(), 'TOK');
            assert.equal(edge.getEdgeType(), 'arbitrary-edge');
        });
    });
    describe('removing a node from a graph', function() {
        var node, prevNode, nextNode, nodeTotalCnt, nodeTypeCnt;
        beforeEach(createGraph);
        beforeEach(function() {
            node = graph.getNodeById('2');
            prevNode = node.previous();
            nextNode = node.next();
            nodeTotalCnt = graph.getNodes().length;
            nodeTypeCnt = graph.getNodesByType(node.getType()).length;
            graph.removeNode(node);
        });

        it('node is removed properly', function() {
            assert.equal(graph.getNodes().length, nodeTotalCnt - 1);
            assert.equal(graph.getNodesByType(node.getType()).length, nodeTypeCnt - 1);
            assert.equal(graph.getNodeById(node.getId()), null);
        });
        it('works when there are broken edges', function() {
            var tokNode = graph.getNodeById('77');
            graph.removeNode(tokNode);
            var sbNode = graph.getNodeById('71');
            assert.doesNotThrow(function() { graph.removeNode(sbNode); });
        });
        it('node\'s edges are removed properly for sequences', function() {
            assert(nextNode.hasPrevious());
            assert(nextNode.previous() === prevNode);
            assert(prevNode.hasNext());
            assert(prevNode.next() === nextNode);
        });
    });
    describe('removing an edge from a node', function() {
        var node;
        beforeEach(createGraph);
        beforeEach(function() {
            node = graph.getNodeById('2');
            var nextEdge = node.getFirstEdgeByType('next');
            node.removeEdge(nextEdge);
        });

        it('should no longer have a reference to that edge', function() {
            assert.equal(node.getFirstEdgeByType('next'), undefined);
            assert.equal(node.hasNext(), false);
        });
        it('should return undefined if first or last edge is removed', function() {
            var sbNode = graph.getNodeById('71');
            sbNode.removeEdges();
            assert(sbNode.getFirst() === undefined);
            assert(sbNode.getLast() === undefined);
        });
    });
});
