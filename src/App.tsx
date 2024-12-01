import React, { useState } from 'react';
import './App.css';
import * as yaml from 'js-yaml';
import ReactFlow, { Node, Edge, Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

interface Position {
    x: number;
    y: number;
}

const App: React.FC = () => {
    const [yamlInput, setYamlInput] = useState<string>('');
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const parseYamlToGraph = () => {
        try {
            const customSchema = yaml.DEFAULT_SCHEMA.extend([
                new yaml.Type('!BasicStage', {
                    kind: 'mapping',
                    construct: (data) => data,
                }),
                new yaml.Type('!GenericPipeline', {
                    kind: 'mapping',
                    construct: (data) => data,
                }),
            ]);

            const parsed = yaml.load(yamlInput, { schema: customSchema }) as Record<string, any>;
            console.log("Parsed YAML:", parsed);

            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];
            const anchors: Record<string, string> = {};

            const NODE_WIDTH = 150;
            const NODE_HEIGHT = 100;
            const SPACING_ADDER = 50;

            const resolveReference = (value: any): string | null => {
                if (typeof value === 'string' && value.startsWith('*')) {
                    return anchors[value.slice(1)];
                }
                return null;
            };

            let hasTopNode = false;

            const traverse = (
                obj: any,
                parentId: string | null,
                depth: number,
                siblingIndex: number
            ) => {
                if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
                    console.log("Skipping invalid or empty node:", obj);
                    return;
                }

                console.log("Traversing:", { obj, parentId, depth, siblingIndex });

                const currentNodeId = `node-${newNodes.length + 1}`;
                const nodeLabel = obj.name || (!hasTopNode && depth === 0 ? 'Root' : `Unnamed Node ${newNodes.length + 1}`);
                const x = siblingIndex * (NODE_WIDTH + SPACING_ADDER);
                const y = depth * (NODE_HEIGHT + SPACING_ADDER);

                // Avoid adding duplicate root
                if (!hasTopNode && depth === 0) {
                    hasTopNode = true;
                } else {
                    newNodes.push({
                        id: currentNodeId,
                        position: { x, y },
                        data: { label: nodeLabel },
                    });

                    if (parentId) {
                        newEdges.push({
                            id: `${parentId}-${currentNodeId}`,
                            source: parentId,
                            target: currentNodeId,
                        });
                    }
                }

                if (obj.outputs) {
                    Object.entries(obj.outputs).forEach(([key, value]) => {
                        if (typeof value === 'string') {
                            anchors[value] = currentNodeId;
                        }
                    });
                }

                if (obj.inputs) {
                    const inputAnchor = resolveReference(obj.inputs);
                    if (inputAnchor) {
                        newEdges.push({
                            id: `${inputAnchor}-${currentNodeId}`,
                            source: inputAnchor,
                            target: currentNodeId,
                        });
                    }
                }

                if (obj.runs && Array.isArray(obj.runs)) {
                    obj.runs.forEach((child: any, index: number) => {
                        traverse(child, currentNodeId, depth + 1, index);
                    });
                }
            };

            if (parsed) {
                Object.entries(parsed).forEach(([key, value]) => {
                    traverse(value, null, 0, 0);
                });
            }

            console.log("Nodes:", newNodes);
            console.log("Edges:", newEdges);

            setNodes(newNodes);
            setEdges(newEdges);
        } catch (err) {
            console.error('Invalid YAML:', err);
        }
    };


    return (
        <div className="App">
            <textarea
                value={yamlInput}
                onChange={(e) => setYamlInput(e.target.value)}
                placeholder="Paste your YAML here"
                rows={10}
                cols={50}
                style={{ marginBottom: '20px' }}
            />
            <button onClick={parseYamlToGraph}>Visualize</button>
            <div style={{ height: '500px', border: '1px solid #ccc', marginTop: '20px' }}>
                <ReactFlow nodes={nodes} edges={edges} fitView>
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
};

export default App;
