'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  getOutgoers,
  Handle,
  Position,
  useNodeId,
  NodeResizer,
  type OnConnect,
  type Node,
  type Edge,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { saveFlow, loadFlow, executeCommand, listFlows, createFlow, deleteFlow, renameFlow } from './actions';
import * as chrono from 'chrono-node';
import { JSONTree } from 'react-json-tree';
import { useTheme } from 'next-themes';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MoreHorizontal, Plus, Info } from 'lucide-react';

function InstructionNode({ data, selected }: { data: any; selected?: boolean }) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const handleCommandChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              command: e.target.value,
            },
          };
        }
        return node;
      })
    );
  }, [nodeId, setNodes]);


  const handleResultChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              result: e.target.value,
            },
          };
        }
        return node;
      })
    );
  }, [nodeId, setNodes]);

  return (
    <div className={`!outline-none bg-white dark:bg-gray-800 rounded-lg border-2 ${selected ? 'border-blue-500 dark:border-blue-400 shadow-lg' : 'border-blue-300 dark:border-blue-600 shadow-sm'} p-4 min-w-[280px] h-full flex flex-col`}>
      {selected && <NodeResizer minWidth={280} minHeight={200} />}
      <Handle type="target" position={Position.Left} />

      <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-200">
        Instruction
      </h3>

      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1.5 text-gray-600 dark:text-gray-300">
          CLI Command
        </label>
        <Input
          type="text"
          value={data.command || ''}
          onChange={handleCommandChange}
          placeholder="Enter command..."
          className="font-mono text-sm nodrag"
        />
      </div>

      {data.lastRun && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Last run: {new Date(data.lastRun).toLocaleString()}
          </div>
          {data.result && (
            <>
              <Button
                onClick={() => setResultDialogOpen(true)}
                variant="outline"
                size="sm"
                className="nodrag w-full"
              >
                See result
              </Button>
              <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                  <DialogTitle>Result</DialogTitle>
                  {(() => {
                    try {
                      const parsed = JSON.parse(data.result);
                      return (
                        <div className="nodrag text-sm">
                          <JSONTree
                            data={parsed}
                            invertTheme={resolvedTheme === 'dark'}
                            hideRoot={true}
                            shouldExpandNodeInitially={(keyPath, data, level) => level < 2}
                          />
                        </div>
                      );
                    } catch {
                      return (
                        <pre className="text-sm whitespace-pre-wrap font-mono p-4 bg-gray-100 dark:bg-gray-900 rounded">
                          {data.result}
                        </pre>
                      );
                    }
                  })()}
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function NoteNode({ data, selected }: { data: any; selected?: boolean }) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              text: e.target.value,
            },
          };
        }
        return node;
      })
    );
  }, [nodeId, setNodes]);

  return (
    <div className={`!outline-none bg-white dark:bg-gray-800 rounded-lg border-2 ${selected ? 'border-yellow-500 dark:border-yellow-400 shadow-lg' : 'border-yellow-300 dark:border-yellow-600 shadow-sm'} p-4 min-w-[280px] min-h-[200px] h-full flex flex-col`}>
      {selected && <NodeResizer minWidth={280} minHeight={200} />}
      <Handle type="target" position={Position.Left} />

      <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-200">
        Note
      </h3>

      <div className="flex-1 flex flex-col min-h-[80px]">
        <Textarea
          value={data.text || ''}
          onChange={handleTextChange}
          placeholder="Add notes..."
          className="text-sm resize-none nodrag flex-1 min-h-[50px]"
        />
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  instruction: InstructionNode,
  note: NoteNode,
};

function Flow({ flowName }: { flowName: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();
  const lastClickTime = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [pendingNodePosition, setPendingNodePosition] = useState<{ x: number; y: number } | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleText, setScheduleText] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [tempScheduleText, setTempScheduleText] = useState('');
  const [tempScheduledDate, setTempScheduledDate] = useState<Date | null>(null);
  const [isParsingSchedule, setIsParsingSchedule] = useState(false);
  const flowScheduleTimeout = useRef<NodeJS.Timeout | null>(null);
  const scheduleParseTimeout = useRef<NodeJS.Timeout | null>(null);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce schedule text parsing
  useEffect(() => {
    if (scheduleParseTimeout.current) {
      clearTimeout(scheduleParseTimeout.current);
    }

    setIsParsingSchedule(true);

    scheduleParseTimeout.current = setTimeout(() => {
      if (tempScheduleText) {
        const parsedDate = chrono.parseDate(tempScheduleText, new Date(), { forwardDate: true });
        setTempScheduledDate(parsedDate);
      } else {
        setTempScheduledDate(null);
      }
      setIsParsingSchedule(false);
    }, 500);

    return () => {
      if (scheduleParseTimeout.current) {
        clearTimeout(scheduleParseTimeout.current);
      }
    };
  }, [tempScheduleText]);

  // Generate a unique ID
  const generateId = () => {
    return crypto.randomUUID();
  };

  // Load flow on mount
  useEffect(() => {
    loadFlow(flowName).then((savedFlow) => {
      if (savedFlow) {
        // Deselect nodes
        const processedNodes = (savedFlow.nodes || []).map((node: any) => ({
          ...node,
          selected: false,
          dragging: false,
        }));

        setNodes(processedNodes);
        setEdges(savedFlow.edges || []);

        // Load schedule if exists
        if (savedFlow.scheduleText) {
          setScheduleText(savedFlow.scheduleText);
          const parsedDate = chrono.parseDate(savedFlow.scheduleText, new Date(), { forwardDate: true });
          setScheduledDate(parsedDate);
        } else {
          setScheduleText('');
          setScheduledDate(null);
        }

        setLoaded(true);
      }
    });
  }, [flowName, setNodes, setEdges]);

  // Schedule flow execution
  useEffect(() => {
    // Clear existing timeout
    if (flowScheduleTimeout.current) {
      clearTimeout(flowScheduleTimeout.current);
      flowScheduleTimeout.current = null;
    }

    if (scheduledDate) {
      const now = new Date();
      const timeUntilExecution = scheduledDate.getTime() - now.getTime();

      if (timeUntilExecution > 0) {
        console.log(`Flow "${flowName}" scheduled for ${scheduledDate.toLocaleString()}`);

        flowScheduleTimeout.current = setTimeout(async () => {
          console.log(`Executing scheduled flow: ${flowName}`);

          // Execute the flow using the ref to avoid stale closures
          await handleRunRef.current();

          // Clear the schedule after execution
          setScheduleText('');
          setScheduledDate(null);

          // Save flow with cleared schedule
          const flowData = {
            nodes: getNodes(),
            edges: getEdges(),
            scheduleText: '',
          };
          await saveFlow(flowName, JSON.stringify(flowData, null, 2));
        }, timeUntilExecution);
      }
    }

    return () => {
      if (flowScheduleTimeout.current) {
        clearTimeout(flowScheduleTimeout.current);
      }
    };
  }, [scheduledDate, flowName, getNodes, getEdges]);

  const isValidConnection = useCallback(
    (connection: any) => {
      const nodes = getNodes();
      const edges = getEdges();
      const target = nodes.find((node) => node.id === connection.target);

      if (!target) return false;

      const hasCycle = (node: Node, visited = new Set<string>()) => {
        if (visited.has(node.id)) return false;
        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) return true;
          if (hasCycle(outgoer, visited)) return true;
        }

        return false;
      };

      // Prevent self-connections
      if (target.id === connection.source) return false;

      // Prevent cycles
      return !hasCycle(target);
    },
    [getNodes, getEdges]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const createNode = useCallback(
    (nodeType: 'instruction' | 'note', position: { x: number; y: number }) => {
      const newNode: Node = {
        id: generateId(),
        type: nodeType,
        position,
        data: {
          command: nodeType === 'instruction' ? '' : undefined,
          text: '',
          autoRun: nodeType === 'instruction' ? false : undefined,
        },
        style: nodeType === 'note' ? { height: 200 } : undefined,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTime.current;

      // Double-click detection (300ms threshold)
      if (timeSinceLastClick < 300) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        setPendingNodePosition(position);
        setCommandOpen(true);
        lastClickTime.current = 0; // Reset to prevent triple-click
      } else {
        lastClickTime.current = currentTime;
      }
    },
    [screenToFlowPosition],
  );

  const handleSave = useCallback(async () => {
    const flowData = {
      nodes,
      edges,
      scheduleText,
    };

    const dataStr = JSON.stringify(flowData, null, 2);

    // Save to file
    await saveFlow(flowName, dataStr);
  }, [flowName, nodes, edges, scheduleText]);

  const handleRun = useCallback(async () => {
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Topological sort to get execution order
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    nodes.forEach((node) => {
      adjList.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build adjacency list and calculate in-degrees
    edges.forEach((edge) => {
      adjList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    nodes.forEach((node) => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });

    const executionOrder: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      executionOrder.push(nodeId);

      adjList.get(nodeId)?.forEach((neighbor) => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    let hasErrors = false;
    const nodeResults = new Map<string, string>();

    // Execute commands in order (all instruction nodes) and send note notifications
    for (const nodeId of executionOrder) {
      const node = nodes.find((n) => n.id === nodeId);
      console.log('Processing node:', node?.type, 'ID:', nodeId);

      if (node?.type === 'instruction' && node?.data?.command) {
        console.log(`\n=== Executing: ${node.data.command} ===`);
        const result = await executeCommand(String(node.data.command));

        let resultText = '';
        if (result.success) {
          if (result.stdout) {
            console.log('STDOUT:', result.stdout);
            resultText = result.stdout;
          }
          if (result.stderr) {
            console.warn('STDERR:', result.stderr);
            resultText += (resultText ? '\n\n' : '') + 'STDERR:\n' + result.stderr;
          }
        } else {
          hasErrors = true;
          console.error('ERROR:', result.error);
          resultText = `ERROR: ${result.error}`;
          if (result.stdout) {
            console.log('STDOUT:', result.stdout);
            resultText += '\n\nSTDOUT:\n' + result.stdout;
          }
          if (result.stderr) {
            console.error('STDERR:', result.stderr);
            resultText += '\n\nSTDERR:\n' + result.stderr;
          }
        }

        nodeResults.set(nodeId, resultText);
      }
    }

    // Update nodes with results
    setNodes((nds) =>
      nds.map((node) => {
        if (nodeResults.has(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              result: nodeResults.get(node.id),
              lastRun: new Date().toISOString(),
            },
          };
        }
        return node;
      })
    );

    console.log('\n✓ All commands executed');

    // Send notification when done
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${flowName} - Run Complete`, {
        body: hasErrors
          ? 'Commands finished with errors'
          : 'Click to review results',
        icon: '/favicon.ico',
        tag: `run-complete-${Date.now()}`,
      });
    }
  }, [flowName, nodes, edges, setNodes]);

  // Wrapper for handleRun to avoid stale closure issues
  const handleRunRef = useRef(handleRun);
  useEffect(() => {
    handleRunRef.current = handleRun;
  }, [handleRun]);

  if (!mounted) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#000' }} />
    );
  }

  return (
    <div className="w-full h-full">
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search node type..." />
        <CommandList>
          <CommandEmpty>No node types found.</CommandEmpty>
          <CommandGroup heading="Node Types">
            <CommandItem
              onSelect={() => {
                if (pendingNodePosition) {
                  createNode('instruction', pendingNodePosition);
                  setCommandOpen(false);
                  setPendingNodePosition(null);
                }
              }}
            >
              <div>
                <div className="font-semibold">Instruction</div>
                <div className="text-sm text-gray-500">Execute CLI commands with auto-run</div>
              </div>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                if (pendingNodePosition) {
                  createNode('note', pendingNodePosition);
                  setCommandOpen(false);
                  setPendingNodePosition(null);
                }
              }}
            >
              <div>
                <div className="font-semibold">Note</div>
                <div className="text-sm text-gray-500">Add notes and reminders</div>
              </div>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (open) {
            // Initialize temp values when opening dialog
            setTempScheduleText(scheduleText);
            setTempScheduledDate(scheduledDate);
          }
        }}
      >
        <DialogContent>
          <DialogTitle>Schedule Flow Run</DialogTitle>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                When should this flow run?
              </label>
              <Input
                type="text"
                value={tempScheduleText}
                onChange={(e) => {
                  setTempScheduleText(e.target.value);
                }}
                placeholder="e.g. 'tomorrow 3pm', 'Monday 10am'"
                className="font-mono"
              />
            </div>

            {!isParsingSchedule && tempScheduledDate && (
              <div className="text-sm text-muted-foreground">
                Scheduled for: <strong>{tempScheduledDate.toLocaleString()}</strong>
              </div>
            )}

            {!isParsingSchedule && tempScheduleText && !tempScheduledDate && (
              <div className="text-sm text-destructive">
                Could not parse date. Try a different format.
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setScheduleDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (tempScheduleText && tempScheduledDate) {
                    setScheduleText(tempScheduleText);
                    setScheduledDate(tempScheduledDate);
                    await handleSave();
                    setScheduleDialogOpen(false);
                  }
                }}
                disabled={!tempScheduledDate}
              >
                Save Schedule
              </Button>
              {scheduledDate && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    setScheduleText('');
                    setScheduledDate(null);
                    setTempScheduleText('');
                    setTempScheduledDate(null);
                    await handleSave();
                    setScheduleDialogOpen(false);
                  }}
                >
                  Clear Schedule
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {nodes.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-96">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Get Started</AlertTitle>
            <AlertDescription>
              Double-click anywhere on the canvas to open the command palette and add your first node.
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button onClick={handleSave} variant="outline">
            Save
          </Button>
          <Button onClick={handleRun} variant="outline">
            Run now
          </Button>
          <Button onClick={() => setScheduleDialogOpen(true)} variant="outline">
            Schedule run
          </Button>
        </div>
        {scheduledDate && (
          <div className="text-xs text-muted-foreground bg-card border rounded px-2 py-1">
            Next run: {scheduledDate.toLocaleString()}
          </div>
        )}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        zoomOnDoubleClick={false}
        colorMode="system"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default function Home() {
  const [flows, setFlows] = useState<string[]>([]);
  const [currentFlow, setCurrentFlow] = useState<string | null>(null);
  const [editingFlow, setEditingFlow] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load flows on mount
  useEffect(() => {
    async function loadFlowList() {
      const flowList = await listFlows();
      setFlows(flowList);

      if (flowList.length === 0) {
        // Create first flow if none exist
        const firstFlowName = 'Untitled Flow';
        await createFlow(firstFlowName);
        setFlows([firstFlowName]);
        setCurrentFlow(firstFlowName);
      } else {
        setCurrentFlow(flowList[0]);
      }
    }
    loadFlowList();
  }, []);

  const handleCreateFlow = async () => {
    let flowName = 'Untitled Flow';
    let counter = 1;

    // Find unique name
    while (flows.includes(flowName)) {
      counter++;
      flowName = `Untitled Flow ${counter}`;
    }

    const result = await createFlow(flowName);
    if (result.success) {
      const updatedFlows = [...flows, flowName];
      setFlows(updatedFlows);
      setCurrentFlow(flowName);
    }
  };

  const handleRenameFlow = async (oldName: string, newName: string) => {
    if (newName === oldName || !newName.trim()) {
      setEditingFlow(null);
      return;
    }

    if (flows.includes(newName)) {
      alert('A flow with this name already exists');
      setEditingFlow(null);
      return;
    }

    const result = await renameFlow(oldName, newName);
    if (result.success) {
      const updatedFlows = flows.map(f => f === oldName ? newName : f);
      setFlows(updatedFlows);
      if (currentFlow === oldName) {
        setCurrentFlow(newName);
      }
    }
    setEditingFlow(null);
  };

  const handleDeleteFlow = async (flowName: string) => {
    const result = await deleteFlow(flowName);
    if (result.success) {
      const updatedFlows = flows.filter(f => f !== flowName);
      setFlows(updatedFlows);

      // Select another flow
      if (currentFlow === flowName) {
        setCurrentFlow(updatedFlows[0] || null);
      }

      // Create a new flow if none left
      if (updatedFlows.length === 0) {
        const firstFlowName = 'Untitled Flow';
        await createFlow(firstFlowName);
        setFlows([firstFlowName]);
        setCurrentFlow(firstFlowName);
      }
    }
    setDeleteConfirm(null);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Flows</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {flows.map((flowName) => (
                  <SidebarMenuItem key={flowName}>
                    {editingFlow === flowName ? (
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleRenameFlow(flowName, editName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameFlow(flowName, editName);
                          } else if (e.key === 'Escape') {
                            setEditingFlow(null);
                          }
                        }}
                        className="h-8"
                      />
                    ) : (
                      <>
                        <SidebarMenuButton
                          isActive={currentFlow === flowName}
                          onClick={() => setCurrentFlow(flowName)}
                        >
                          {flowName}
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction>
                              <MoreHorizontal />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingFlow(flowName);
                                setEditName(flowName);
                              }}
                            >
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(flowName)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
            <div className="p-2">
              <Button onClick={handleCreateFlow} variant="outline" className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Flow
              </Button>
            </div>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <main className="flex-1 relative h-screen">
        <SidebarTrigger className="absolute top-4 left-4 z-10" />
        {currentFlow && (
          <ReactFlowProvider key={currentFlow}>
            <Flow flowName={currentFlow} />
          </ReactFlowProvider>
        )}
      </main>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogTitle>Delete Flow</DialogTitle>
          <p>Are you sure you want to delete "{deleteConfirm}"?</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteFlow(deleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
