import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Mail,
  MessageSquare,
  Clock,
  GitBranch,
  Phone,
  Tag,
  UserCheck,
  Webhook,
  StickyNote,
  Zap,
  Plus,
  Trash2,
  Settings,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ─── Node type configs ────────────────────────────────────────────────────────

const NODE_TYPES_CONFIG = {
  trigger: { label: "Trigger", icon: Zap, color: "bg-violet-500", border: "border-violet-500", textColor: "text-violet-600" },
  email: { label: "Send Email", icon: Mail, color: "bg-blue-500", border: "border-blue-500", textColor: "text-blue-600" },
  sms: { label: "Send SMS", icon: MessageSquare, color: "bg-green-500", border: "border-green-500", textColor: "text-green-600" },
  wait: { label: "Wait / Delay", icon: Clock, color: "bg-amber-500", border: "border-amber-500", textColor: "text-amber-600" },
  condition: { label: "If / Else", icon: GitBranch, color: "bg-orange-500", border: "border-orange-500", textColor: "text-orange-600" },
  vapi_call: { label: "AI Voice Call", icon: Phone, color: "bg-cyan-500", border: "border-cyan-500", textColor: "text-cyan-600" },
  tag_lead: { label: "Tag Lead", icon: Tag, color: "bg-pink-500", border: "border-pink-500", textColor: "text-pink-600" },
  update_status: { label: "Update Status", icon: UserCheck, color: "bg-teal-500", border: "border-teal-500", textColor: "text-teal-600" },
  webhook: { label: "Webhook", icon: Webhook, color: "bg-gray-500", border: "border-gray-500", textColor: "text-gray-600" },
  internal_note: { label: "Add Note", icon: StickyNote, color: "bg-yellow-500", border: "border-yellow-500", textColor: "text-yellow-600" },
};

// ─── Custom node component ────────────────────────────────────────────────────

function WorkflowNode({ data, selected }: { data: any; selected: boolean }) {
  const config = NODE_TYPES_CONFIG[data.stepType as keyof typeof NODE_TYPES_CONFIG] || NODE_TYPES_CONFIG.email;
  const Icon = config.icon;
  const isTrigger = data.stepType === "trigger";

  return (
    <div
      className={`
        relative bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 min-w-[200px] max-w-[260px]
        transition-all duration-150
        ${selected ? `${config.border} shadow-xl ring-2 ring-offset-1` : "border-slate-200 dark:border-slate-700"}
        ${isTrigger ? "border-violet-500 shadow-violet-100 dark:shadow-violet-900/20" : ""}
      `}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${config.color} bg-opacity-10`}>
        <div className={`p-1.5 rounded-lg ${config.color} bg-opacity-20`}>
          <Icon className={`h-3.5 w-3.5 ${config.textColor}`} />
        </div>
        <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {data.label || config.label}
        </p>
        {data.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {data.description}
          </p>
        )}
        {data.delay && (
          <Badge variant="outline" className="mt-1.5 text-[10px] h-4 px-1.5">
            <Clock className="h-2.5 w-2.5 mr-1" />{data.delay}
          </Badge>
        )}
      </div>

      {/* Handles */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-800"
        />
      )}
      {data.stepType === "condition" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: "30%" }}
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white dark:!border-slate-800"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: "70%" }}
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white dark:!border-slate-800"
          />
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between px-4 text-[9px] text-slate-400">
            <span className="text-green-600">✓ Yes</span>
            <span className="text-red-500">✗ No</span>
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-800"
        />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
};

// ─── Node palette item ────────────────────────────────────────────────────────

function PaletteItem({ type, onAdd }: { type: string; onAdd: (type: string) => void }) {
  const config = NODE_TYPES_CONFIG[type as keyof typeof NODE_TYPES_CONFIG];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <button
      onClick={() => onAdd(type)}
      className={`
        flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left
        hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group
      `}
    >
      <div className={`p-1.5 rounded-lg ${config.color} bg-opacity-15 group-hover:bg-opacity-25 transition-colors`}>
        <Icon className={`h-3.5 w-3.5 ${config.textColor}`} />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{config.label}</span>
    </button>
  );
}

// ─── Node editor panel ────────────────────────────────────────────────────────

function NodeEditor({
  node,
  onSave,
  onDelete,
  onClose,
}: {
  node: Node;
  onSave: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(node.data.label as string || "");
  const [content, setContent] = useState(node.data.content as string || "");
  const [subject, setSubject] = useState(node.data.subject as string || "");
  const [delayAmount, setDelayAmount] = useState(node.data.delayAmount as string || "1");
  const [delayUnit, setDelayUnit] = useState(node.data.delayUnit as string || "hours");
  const [conditionField, setConditionField] = useState(node.data.conditionField as string || "status");
  const [conditionOp, setConditionOp] = useState(node.data.conditionOp as string || "equals");
  const [conditionValue, setConditionValue] = useState(node.data.conditionValue as string || "");
  const [tagName, setTagName] = useState(node.data.tagName as string || "");
  const [newStatus, setNewStatus] = useState(node.data.newStatus as string || "contacted");

  const stepType = node.data.stepType as string;
  const config = NODE_TYPES_CONFIG[stepType as keyof typeof NODE_TYPES_CONFIG];

  const handleSave = () => {
    const delayMinutes = stepType === "wait"
      ? (parseInt(delayAmount) || 0) * (delayUnit === "hours" ? 60 : delayUnit === "days" ? 1440 : 1)
      : 0;

    onSave(node.id, {
      ...node.data,
      label: label || config?.label,
      content,
      subject,
      delayAmount,
      delayUnit,
      delayMinutes,
      delay: stepType === "wait" ? `${delayAmount} ${delayUnit}` : undefined,
      description: stepType === "email" ? subject
        : stepType === "sms" ? content?.substring(0, 60) + (content?.length > 60 ? "..." : "")
        : stepType === "wait" ? `Wait ${delayAmount} ${delayUnit}`
        : stepType === "condition" ? `If ${conditionField} ${conditionOp} "${conditionValue}"`
        : stepType === "tag_lead" ? `Add tag: ${tagName}`
        : stepType === "update_status" ? `Set status: ${newStatus}`
        : undefined,
      conditionField,
      conditionOp,
      conditionValue,
      tagName,
      newStatus,
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        {config && (
          <div className={`p-1.5 rounded-lg ${config.color} bg-opacity-15`}>
            <config.icon className={`h-4 w-4 ${config.textColor}`} />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold">{config?.label || stepType}</p>
          <p className="text-xs text-muted-foreground">Configure this step</p>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Step Label</Label>
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder={config?.label} className="h-8 text-sm" />
      </div>

      {stepType === "email" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Subject Line</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Your Mortgage Journey Starts Here" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email Body</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Use {{firstName}}, {{agentName}}, {{bookingLink}} for personalization..." rows={6} className="text-sm resize-none" />
          </div>
        </>
      )}

      {stepType === "sms" && (
        <div className="space-y-1">
          <Label className="text-xs">SMS Message</Label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Use {{firstName}}, {{agentName}} for personalization..." rows={4} className="text-sm resize-none" />
          <p className="text-[10px] text-muted-foreground">{content.length}/160 characters</p>
        </div>
      )}

      {stepType === "wait" && (
        <div className="space-y-1">
          <Label className="text-xs">Wait Duration</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={delayAmount}
              onChange={e => setDelayAmount(e.target.value)}
              className="h-8 text-sm w-24"
            />
            <Select value={delayUnit} onValueChange={setDelayUnit}>
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {stepType === "condition" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Check Field</Label>
            <Select value={conditionField} onValueChange={setConditionField}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Lead Status</SelectItem>
                <SelectItem value="score">Lead Score</SelectItem>
                <SelectItem value="source">Lead Source</SelectItem>
                <SelectItem value="contactType">Contact Type</SelectItem>
                <SelectItem value="pipelineType">Pipeline Type</SelectItem>
                <SelectItem value="loanAmount">Loan Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Operator</Label>
            <Select value={conditionOp} onValueChange={setConditionOp}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Does Not Equal</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Value</Label>
            <Input value={conditionValue} onChange={e => setConditionValue(e.target.value)} placeholder="e.g. qualified, 80, facebook" className="h-8 text-sm" />
          </div>
        </div>
      )}

      {stepType === "tag_lead" && (
        <div className="space-y-1">
          <Label className="text-xs">Tag Name</Label>
          <Input value={tagName} onChange={e => setTagName(e.target.value)} placeholder="e.g. refi-prospect, hot-lead" className="h-8 text-sm" />
        </div>
      )}

      {stepType === "update_status" && (
        <div className="space-y-1">
          <Label className="text-xs">New Status</Label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="appointment_set">Appointment Set</SelectItem>
              <SelectItem value="appointment_completed">Appointment Completed</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {stepType === "internal_note" && (
        <div className="space-y-1">
          <Label className="text-xs">Note Content</Label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Internal note to add to the lead record..." rows={3} className="text-sm resize-none" />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} size="sm" className="flex-1 h-8 text-xs">Save Step</Button>
        <Button onClick={() => onDelete(node.id)} variant="destructive" size="sm" className="h-8 text-xs px-3">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main WorkflowBuilder component ──────────────────────────────────────────

export default function WorkflowBuilder() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const workflowId = params.id ? parseInt(params.id) : null;

  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [trigger, setTrigger] = useState<string>("lead_created");
  const [isActive, setIsActive] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const nodeIdCounter = useRef(1);

  // Load existing workflow
  const { data: existingWorkflow } = trpc.workflows.get.useQuery(
    { id: workflowId! },
    { enabled: !!workflowId }
  );

  const createMutation = trpc.workflows.create.useMutation();
  const updateMutation = trpc.workflows.update.useMutation();
  const toggleMutation = trpc.workflows.toggle.useMutation();
  const utils = trpc.useUtils();

  // Load workflow data into canvas
  useEffect(() => {
    if (!existingWorkflow) return;
    setWorkflowName(existingWorkflow.name);
    setTrigger(existingWorkflow.trigger);
    setIsActive(existingWorkflow.isActive);

    if (existingWorkflow.canvasNodes) {
      try {
        const savedNodes = JSON.parse(existingWorkflow.canvasNodes);
        const savedEdges = existingWorkflow.canvasEdges ? JSON.parse(existingWorkflow.canvasEdges) : [];
        setNodes(savedNodes);
        setEdges(savedEdges);
        // Update counter to avoid ID conflicts
        const maxId = savedNodes.reduce((max: number, n: Node) => {
          const num = parseInt(n.id.replace("node_", "")) || 0;
          return Math.max(max, num);
        }, 0);
        nodeIdCounter.current = maxId + 1;
      } catch {
        initializeCanvas(existingWorkflow.trigger);
      }
    } else {
      initializeCanvas(existingWorkflow.trigger);
    }
  }, [existingWorkflow]);

  // Initialize with trigger node if new workflow
  useEffect(() => {
    if (!workflowId && nodes.length === 0) {
      initializeCanvas("lead_created");
    }
  }, []);

  function initializeCanvas(triggerType: string) {
    const triggerLabels: Record<string, string> = {
      lead_created: "New Lead Created",
      lead_status_change: "Lead Status Changes",
      appointment_booking: "Appointment Booked",
      webinar_registration: "Webinar Registration",
      manual: "Manual Trigger",
      time_based: "Scheduled Time",
      form_submitted: "Form Submitted",
      lead_tag_added: "Tag Added to Lead",
      lead_score_changed: "Lead Score Changes",
      appointment_missed: "Appointment Missed",
    };

    const triggerNode: Node = {
      id: "trigger",
      type: "workflowNode",
      position: { x: 250, y: 50 },
      data: {
        stepType: "trigger",
        label: triggerLabels[triggerType] || "Trigger",
        description: "This workflow starts here",
      },
    };
    setNodes([triggerNode]);
    setEdges([]);
  }

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      style: { stroke: "#94a3b8", strokeWidth: 2 },
      animated: true,
    }, eds));
  }, []);

  const addNode = useCallback((stepType: string) => {
    const id = `node_${nodeIdCounter.current++}`;
    const config = NODE_TYPES_CONFIG[stepType as keyof typeof NODE_TYPES_CONFIG];
    const yPositions = nodes.map(n => n.position.y);
    const maxY = yPositions.length > 0 ? Math.max(...yPositions) : 100;

    const newNode: Node = {
      id,
      type: "workflowNode",
      position: { x: 250, y: maxY + 140 },
      data: {
        stepType,
        label: config?.label || stepType,
        description: undefined,
      },
    };

    setNodes(nds => [...nds, newNode]);

    // Auto-connect to the last non-condition node
    const lastNode = [...nodes].reverse().find(n => n.data.stepType !== "condition");
    if (lastNode) {
      setEdges(eds => addEdge({
        id: `edge_${lastNode.id}_${id}`,
        source: lastNode.id,
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        style: { stroke: "#94a3b8", strokeWidth: 2 },
        animated: true,
      }, eds));
    }
  }, [nodes]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.data.stepType === "trigger") {
      setShowTriggerDialog(true);
      return;
    }
    setSelectedNode(node);
    setShowNodeEditor(true);
  }, []);

  const handleNodeSave = useCallback((id: string, data: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data } : n));
  }, []);

  const handleNodeDelete = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setShowNodeEditor(false);
  }, []);

  const buildStepsFromNodes = () => {
    return nodes
      .filter(n => n.data.stepType !== "trigger")
      .map((n, i) => ({
        nodeId: n.id,
        stepOrder: i + 1,
        stepType: n.data.stepType as any,
        label: n.data.label as string,
        delayMinutes: (n.data.delayMinutes as number) || 0,
        delayUnit: (n.data.delayUnit as any) || "minutes",
        subject: n.data.subject as string,
        content: n.data.content as string,
        conditionField: n.data.conditionField as string,
        conditionOperator: n.data.conditionOp as string,
        conditionValue: n.data.conditionValue as string,
        actionConfig: n.data.tagName
          ? JSON.stringify({ tagName: n.data.tagName })
          : n.data.newStatus
          ? JSON.stringify({ newStatus: n.data.newStatus })
          : undefined,
      }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const canvasNodes = JSON.stringify(nodes);
      const canvasEdges = JSON.stringify(edges);
      const steps = buildStepsFromNodes();

      if (workflowId) {
        await updateMutation.mutateAsync({
          id: workflowId,
          name: workflowName,
          trigger: trigger as any,
          canvasNodes,
          canvasEdges,
          steps,
        });
        await utils.workflows.get.invalidate({ id: workflowId });
      } else {
        const result = await createMutation.mutateAsync({
          name: workflowName,
          trigger: trigger as any,
          canvasNodes,
          canvasEdges,
          steps,
        });
        navigate(`/workflows/${result.id}/builder`);
      }

      await utils.workflows.list.invalidate();
      toast.success("Workflow saved successfully");
    } catch (err) {
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!workflowId) {
      toast.error("Save the workflow first before activating it");
      return;
    }
    try {
      await toggleMutation.mutateAsync({ id: workflowId, isActive: !isActive });
      setIsActive(!isActive);
      await utils.workflows.list.invalidate();
      toast.success(isActive ? "Workflow paused" : "Workflow activated!");
    } catch {
      toast.error("Failed to toggle workflow");
    }
  };

  const TRIGGER_OPTIONS = [
    { value: "lead_created", label: "New Lead Created", description: "Fires when a new lead enters the system" },
    { value: "lead_status_change", label: "Lead Status Changes", description: "Fires when a lead moves to a new stage" },
    { value: "lead_tag_added", label: "Tag Added to Lead", description: "Fires when a specific tag is applied" },
    { value: "lead_score_changed", label: "Lead Score Changes", description: "Fires when lead score crosses a threshold" },
    { value: "appointment_booking", label: "Appointment Booked", description: "Fires when a lead books an appointment" },
    { value: "appointment_missed", label: "Appointment Missed", description: "Fires when a lead no-shows" },
    { value: "form_submitted", label: "Form Submitted", description: "Fires when a landing page form is submitted" },
    { value: "manual", label: "Manual Trigger", description: "Manually enroll leads into this workflow" },
    { value: "time_based", label: "Scheduled / Time-Based", description: "Runs on a schedule (e.g., anniversaries)" },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/workflows")} className="gap-1.5 h-8 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {editingName ? (
          <Input
            value={workflowName}
            onChange={e => setWorkflowName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === "Enter" && setEditingName(false)}
            className="h-8 text-sm font-semibold w-64"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors"
          >
            {workflowName}
          </button>
        )}

        <Badge
          variant="outline"
          className={`text-xs cursor-pointer ${isActive ? "border-green-500 text-green-600 bg-green-50" : "border-slate-300 text-slate-500"}`}
          onClick={handleToggle}
        >
          {isActive ? "● Active" : "○ Inactive"}
        </Badge>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className={`gap-1.5 h-8 text-xs ${isActive ? "text-amber-600 border-amber-300" : "text-green-600 border-green-300"}`}
        >
          {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isActive ? "Pause" : "Activate"}
        </Button>

        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 h-8 text-xs">
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: node palette */}
        <div className="w-52 shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
          <div className="p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Add Step</p>
            <div className="space-y-0.5">
              {Object.entries(NODE_TYPES_CONFIG)
                .filter(([type]) => type !== "trigger")
                .map(([type]) => (
                  <PaletteItem key={type} type={type} onAdd={addNode} />
                ))}
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Variables</p>
            <div className="space-y-1">
              {["{{firstName}}", "{{agentName}}", "{{company}}", "{{phone}}", "{{bookingLink}}", "{{state}}"].map(v => (
                <button
                  key={v}
                  onClick={() => { navigator.clipboard.writeText(v); toast.success(`Copied ${v}`); }}
                  className="block w-full text-left text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
              style: { stroke: "#94a3b8", strokeWidth: 2 },
              animated: true,
            }}
          >
            <Background color="#e2e8f0" gap={20} />
            <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !shadow-sm" />
            <MiniMap
              className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700"
              nodeColor={(n) => {
                const config = NODE_TYPES_CONFIG[n.data?.stepType as keyof typeof NODE_TYPES_CONFIG];
                return config ? "#6366f1" : "#94a3b8";
              }}
            />
            <Panel position="top-center">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                Click a node to edit · Drag to reposition · Connect handles to link steps
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right panel: node editor */}
        {showNodeEditor && selectedNode && (
          <div className="w-72 shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold">Edit Step</p>
                <Button variant="ghost" size="sm" onClick={() => setShowNodeEditor(false)} className="h-7 w-7 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <NodeEditor
                node={selectedNode}
                onSave={handleNodeSave}
                onDelete={handleNodeDelete}
                onClose={() => setShowNodeEditor(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Trigger dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Workflow Trigger</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto py-1">
            {TRIGGER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setTrigger(opt.value);
                  setNodes(nds => nds.map(n =>
                    n.id === "trigger"
                      ? { ...n, data: { ...n.data, label: opt.label, description: opt.description } }
                      : n
                  ));
                  setShowTriggerDialog(false);
                }}
                className={`
                  w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all
                  ${trigger === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }
                `}
              >
                <Zap className={`h-4 w-4 mt-0.5 shrink-0 ${trigger === opt.value ? "text-primary" : "text-slate-400"}`} />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTriggerDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
