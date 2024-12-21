import React, { useState, useEffect } from 'react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import * as yaml from 'js-yaml';

// Define BusEvent class
class BusEvent {
    fileURL: string;
    fileVal: string;

    constructor(fileURL: string, fileVal: string) {
        this.fileURL = fileURL;
        this.fileVal = fileVal;
    }
}

const customTags = [
    '!PythonFunction',
    '!BasicStage',
    '!MonitoringService',
    '!GenericPipeline',
    '!FilePath',
    '!path',
    '!NgrokService',
    '!ForEach',
    '!If',
    '!ExpressionEval',
    '!MultiLine',
];

const customSchema = yaml.DEFAULT_SCHEMA.extend(
    customTags.map(tag =>
        new yaml.Type(tag, {
            kind: 'mapping',
            construct: data => data,
        })
    )
);

const parseYamlToGraph = (yamlInput: string) => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const anchors: Record<string, string> = {};

    try {
        const parsed = yaml.load(yamlInput, { schema: customSchema }) as Record<string, any>;

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
    const [yamlInput, setYamlInput] = useState<string>('');

    // Function to process BusEvent and render the graph
    const handleBusEvent = (event: BusEvent) => {
        try {
            const { fileVal } = event;
            const { nodes, edges } = parseYamlToGraph(fileVal);
            setNodes(nodes);
            setEdges(edges);
        } catch (error) {
            console.error('Error processing BusEvent:', error);
        }
    };

    useEffect(() => {
        // Expose setCode and handleBusEvent via a global API
        const visualizerApi = {
            setCode: (code: string) => {
                const { nodes, edges } = parseYamlToGraph(code);
                setNodes(nodes);
                setEdges(edges);
            },
            processBusEvent: (event: BusEvent) => {
                handleBusEvent(event);
            },
        };

        if (typeof window !== 'undefined') {
            (window as any).visualizer = visualizerApi;
        }
    }, []);

    const handleYamlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setYamlInput(e.target.value);
    };

    const handleRenderClick = () => {
        const { nodes, edges } = parseYamlToGraph(yamlInput);
        setNodes(nodes);
        setEdges(edges);
    };

    
    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ width: '30%', padding: '10px', boxSizing: 'border-box' }}>
                <textarea
                    value={yamlInput}
                    onChange={handleYamlChange}
                    placeholder="Paste your YAML here..."
                    style={{ width: '100%', height: '80%', fontSize: '14px', fontFamily: 'monospace' }}
                />
                <button onClick={handleRenderClick} style={{ width: '100%', marginTop: '10px' }}>
                    Render Graph
                </button>
            </div>
            <div style={{ flexGrow: 1 }}>
                <ReactFlow nodes={nodes} edges={edges}>
                    <Background />
                </ReactFlow>
            </div>
        </div>
    );
    

};

export default App;
