import React, { useState, useEffect } from 'react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import * as yaml from 'js-yaml';

const parseYamlToGraph = (yamlInput: string) => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const anchors: Record<string, string> = {};

    try {
        const customSchema = yaml.DEFAULT_SCHEMA.extend([
            new yaml.Type('!path', {
                kind: 'mapping',
                construct: (data) => {
                    return { path: data.path, files: data.files || [] };
                },
            }),
            new yaml.Type('!Stage', {
                kind: 'mapping',
                construct: (data) => {
                    return { name: data.name, params: data.params, outputs: data.outputs, script: data.script };
                },
            }),
        ]);

        const parsed = yaml.load(yamlInput, { schema: customSchema }) as Record<string, any>;

        // Traverse logic remains the same
        const traverse = (
            obj: any,
            parentId: string | null,
            depth: number,
            siblingIndex: number,
            keyName: string | null = null
        ) => {
            if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
                return;
            }

            const currentNodeId = `node-${nodes.length + 1}`;
            const nodeLabel = obj.name || keyName || `Unnamed Node ${nodes.length + 1}`;
            const x = siblingIndex * 200; // Adjust spacing as needed
            const y = depth * 150;

            nodes.push({
                id: currentNodeId,
                position: { x, y },
                data: { label: nodeLabel },
            });

            if (parentId) {
                edges.push({
                    id: `${parentId}-${currentNodeId}`,
                    source: parentId,
                    target: currentNodeId,
                });
            }

            if (obj.outputs) {
                Object.entries(obj.outputs).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        anchors[value] = currentNodeId;
                    }
                });
            }

            if (obj.inputs) {
                const inputAnchor = anchors[obj.inputs];
                if (inputAnchor) {
                    edges.push({
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
                traverse(value, null, 0, 0, key);
            });
        }
    } catch (err) {
        console.error('Error parsing YAML:', err);
    }

    return { nodes, edges };
};

const App = () => {
    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);

    // Expose API
    useEffect(() => {
        const visualizerApi = {
            setCode: (code: string) => {
                const { nodes, edges } = parseYamlToGraph(code);
                setNodes(nodes);
                setEdges(edges);
            },
        };

        // Expose the API globally
        if (typeof window !== 'undefined') {
            (window as any).visualizer = visualizerApi;
        }

        // Expose for Node.js or other environments
        if (typeof globalThis !== 'undefined') {
            (globalThis as any).visualizer = visualizerApi;
        }

        // Cleanup (optional, especially for Hot Module Replacement)
        return () => {
            if (typeof window !== 'undefined') {
                delete (window as any).visualizer;
            }
            if (typeof globalThis !== 'undefined') {
                delete (globalThis as any).visualizer;
            }
        };
    }, []);

    return (
        <div style={{ height: '100vh' }}>
            <ReactFlow nodes={nodes} edges={edges}>
                <Background />
            </ReactFlow>
        </div>
    );
};

export default App;
