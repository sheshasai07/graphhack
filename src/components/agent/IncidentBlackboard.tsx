import React, { useState } from 'react';
import {
  ListTodo,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Server,
  Plus,
  RefreshCw,
  Wrench,
  ShieldCheck,
  X,
  Send,
  Loader2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { AgentTask, MemoryEpisode } from '../../types';
import './IncidentBlackboard.css';

interface IncidentBlackboardProps {
  tasks: AgentTask[];
  episodes: MemoryEpisode[];
  onRefreshTasks: () => void;
  onRefreshEpisodes: () => void;
  onResolveTask: (taskId: string, rootCause: string, fix: string) => Promise<void>;
  onCreateTask: (data: { symptom: string; details: string; priority: string; target_service?: string; assigned_to?: string }) => Promise<void>;
}

export const IncidentBlackboard: React.FC<IncidentBlackboardProps> = ({
  tasks,
  episodes,
  onRefreshTasks,
  onRefreshEpisodes,
  onResolveTask,
  onCreateTask,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'episodes'>('tasks');
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'OPEN' | 'COMPLETED'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State for Claim & Resolve
  const [resolvingTaskId, setResolvingTaskId] = useState<string | null>(null);
  const [rootCauseInput, setRootCauseInput] = useState('');
  const [fixInput, setFixInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Modal State for Manual Task Dispatch
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [newSymptom, setNewSymptom] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newPriority, setNewPriority] = useState('HIGH');
  const [newTargetService, setNewTargetService] = useState('AuthService');
  const [newAssignedTo, setNewAssignedTo] = useState('Sam Chen');
  const [isDispatching, setIsDispatching] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([onRefreshTasks(), onRefreshEpisodes()]);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const openResolveDialog = (task: AgentTask) => {
    setResolvingTaskId(task.id);
    setRootCauseInput(
      task.target_service === 'NotificationGateway'
        ? 'Downstream carrier throttling on single toll-free sender ID during peak load'
        : 'Connection pool exhaustion under high concurrency spike'
    );
    setFixInput(
      task.target_service === 'NotificationGateway'
        ? 'Implemented round-robin shortcode pool with SQS exponential backoff queue'
        : 'Scaled max_connections from 50 to 200, enabled Redis session cache, and refreshed circuit breaker'
    );
  };

  const handleExecuteResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTaskId || !rootCauseInput.trim() || !fixInput.trim()) return;
    setIsResolving(true);
    try {
      await onResolveTask(resolvingTaskId, rootCauseInput.trim(), fixInput.trim());
      setResolvingTaskId(null);
    } finally {
      setIsResolving(false);
    }
  };

  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymptom.trim()) return;
    setIsDispatching(true);
    try {
      await onCreateTask({
        symptom: newSymptom.trim(),
        details: newDetails.trim() || 'Manually dispatched via Incident Blackboard',
        priority: newPriority,
        target_service: newTargetService,
        assigned_to: newAssignedTo,
      });
      setIsDispatchModalOpen(false);
      setNewSymptom('');
      setNewDetails('');
    } finally {
      setIsDispatching(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'ALL') return true;
    return t.status === taskFilter;
  });

  const openTasksCount = tasks.filter(t => t.status === 'OPEN').length;

  return (
    <div className="incident-blackboard-container">
      {/* Blackboard Tabs Header */}
      <div className="blackboard-header">
        <div className="blackboard-tabs">
          <button
            type="button"
            className={`bb-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <ListTodo size={14} className="bb-tab-icon" />
            <span>Handoff Tasks</span>
            {openTasksCount > 0 && <span className="open-badge">{openTasksCount} Open</span>}
          </button>
          <button
            type="button"
            className={`bb-tab-btn ${activeTab === 'episodes' ? 'active' : ''}`}
            onClick={() => setActiveTab('episodes')}
          >
            <History size={14} className="bb-tab-icon" />
            <span>Episodic Memory Timeline</span>
            <span className="episodes-count-badge">{episodes.length}</span>
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="blackboard-header-actions">
          {activeTab === 'tasks' && (
            <div className="task-filter-pills">
              {(['ALL', 'OPEN', 'COMPLETED'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  className={`task-filter-btn ${taskFilter === f ? 'active' : ''}`}
                  onClick={() => setTaskFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <button
              type="button"
              className="dispatch-task-btn"
              onClick={() => setIsDispatchModalOpen(true)}
              title="Manually dispatch new task to blackboard"
            >
              <Plus size={13} />
              <span>Dispatch Task</span>
            </button>
          )}

          <button
            type="button"
            className="bb-refresh-btn"
            onClick={handleRefresh}
            title="Refresh Blackboard state"
          >
            <RefreshCw size={12} className={isRefreshing ? 'spin-anim' : ''} />
          </button>
        </div>
      </div>

      {/* Tab A: Tasks Blackboard */}
      {activeTab === 'tasks' && (
        <div className="blackboard-content tasks-view">
          {filteredTasks.length === 0 ? (
            <div className="bb-empty-state">
              <CheckCircle2 size={24} className="bb-empty-icon" />
              <span>No {taskFilter.toLowerCase()} tasks currently on the blackboard</span>
            </div>
          ) : (
            <div className="task-cards-list">
              {filteredTasks.map(task => {
                const isOpen = task.status === 'OPEN';
                return (
                  <div key={task.id} className={`task-card ${isOpen ? 'open' : 'completed'}`}>
                    <div className="task-card-top">
                      <div className="task-status-row">
                        <span className={`task-status-tag ${isOpen ? 'open' : 'completed'}`}>
                          {isOpen ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                          {task.status}
                        </span>
                        <span className={`task-priority-tag priority-${task.priority.toLowerCase()}`}>
                          {task.priority} Priority
                        </span>
                        <span className="task-id-tag">{task.id}</span>
                      </div>

                      {isOpen && (
                        <button
                          type="button"
                          className="claim-resolve-btn"
                          onClick={() => openResolveDialog(task)}
                          title="Claim task and record remediation to episodic memory"
                        >
                          <Wrench size={12} />
                          <span>Claim & Resolve</span>
                        </button>
                      )}
                    </div>

                    <h4 className="task-symptom-title">{task.symptom}</h4>
                    <p className="task-details-text">{task.details}</p>

                    {task.resolution_fix && (
                      <div className="task-resolution-box">
                        <span className="fix-label">Applied Remediation:</span>
                        <span className="fix-text">{task.resolution_fix}</span>
                      </div>
                    )}

                    <div className="task-card-footer">
                      <div className="task-meta-item">
                        <Server size={11} className="meta-icon" />
                        <span>{task.target_service || 'Core'}</span>
                      </div>
                      <div className="task-meta-item">
                        <User size={11} className="meta-icon" />
                        <span>{task.assigned_to || 'Unassigned'}</span>
                      </div>
                      <div className="task-meta-item time">
                        <Clock size={11} className="meta-icon" />
                        <span>{task.created_at.slice(0, 16)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab B: Episodic Memory Timeline */}
      {activeTab === 'episodes' && (
        <div className="blackboard-content episodes-view">
          <div className="episodes-timeline-list">
            {episodes.map((ep, idx) => (
              <div key={ep.id || idx} className="episode-card">
                <div className="episode-card-header">
                  <div className="episode-meta-left">
                    <span className="episode-id-badge">{ep.id}</span>
                    <span className="episode-service-badge">{ep.service_name || 'AuthService'}</span>
                    {ep.session_id && <span className="episode-session-badge">{ep.session_id}</span>}
                  </div>
                  <div className="episode-time">
                    <Clock size={11} />
                    <span>{ep.timestamp}</span>
                  </div>
                </div>

                <div className="episode-field symptom">
                  <div className="field-title">
                    <AlertTriangle size={11} className="field-icon symptom" />
                    <span>Observed Symptom</span>
                  </div>
                  <div className="field-content">{ep.symptom}</div>
                </div>

                <div className="episode-field root-cause">
                  <div className="field-title">
                    <History size={11} className="field-icon cause" />
                    <span>Root Cause Analysis</span>
                  </div>
                  <div className="field-content">{ep.root_cause}</div>
                </div>

                <div className="episode-field fix">
                  <div className="field-title">
                    <ShieldCheck size={11} className="field-icon fix" />
                    <span>Verified Remediation Runbook</span>
                  </div>
                  <div className="field-content">{ep.fix}</div>
                </div>

                <div className="episode-footer-tag">
                  <Sparkles size={11} />
                  <span>Permanently written to FalkorDB Knowledge Graph</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim & Resolve Modal Dialog */}
      {resolvingTaskId && (
        <div className="bb-modal-overlay">
          <div className="bb-modal-dialog">
            <div className="bb-modal-header">
              <div className="bb-modal-title">
                <Wrench size={16} className="modal-title-icon" />
                <span>Resolve Task: {resolvingTaskId}</span>
              </div>
              <button
                type="button"
                className="bb-modal-close"
                onClick={() => setResolvingTaskId(null)}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleExecuteResolve} className="bb-modal-form">
              <div className="bb-form-desc">
                Resolving this task claims it on the Graph Blackboard, transitions its state to{' '}
                <strong style={{ color: '#34d399' }}>COMPLETED</strong>, and writes a permanent{' '}
                <strong style={{ color: '#c084fc' }}>MemoryEpisode</strong> node into FalkorDB.
              </div>

              <div className="bb-input-group">
                <label>Verified Root Cause</label>
                <textarea
                  rows={2}
                  value={rootCauseInput}
                  onChange={e => setRootCauseInput(e.target.value)}
                  placeholder="Explain why the failure occurred..."
                  required
                />
              </div>

              <div className="bb-input-group">
                <label>Remediation Fix / Applied Runbook</label>
                <textarea
                  rows={2}
                  value={fixInput}
                  onChange={e => setFixInput(e.target.value)}
                  placeholder="Detail the configuration or code change applied..."
                  required
                />
              </div>

              <div className="bb-modal-actions">
                <button
                  type="button"
                  className="bb-cancel-btn"
                  onClick={() => setResolvingTaskId(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bb-submit-resolve-btn"
                  disabled={isResolving}
                >
                  {isResolving ? (
                    <>
                      <Loader2 size={13} className="spin-anim" />
                      <span>Writing to FalkorDB...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Complete & Record Episode</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Dispatch Task Modal */}
      {isDispatchModalOpen && (
        <div className="bb-modal-overlay">
          <div className="bb-modal-dialog">
            <div className="bb-modal-header">
              <div className="bb-modal-title">
                <Plus size={16} className="modal-title-icon" />
                <span>Dispatch Handoff Task to Blackboard</span>
              </div>
              <button
                type="button"
                className="bb-modal-close"
                onClick={() => setIsDispatchModalOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleExecuteDispatch} className="bb-modal-form">
              <div className="bb-input-group">
                <label>Symptom / Incident Anomaly</label>
                <input
                  type="text"
                  value={newSymptom}
                  onChange={e => setNewSymptom(e.target.value)}
                  placeholder="e.g. 504 timeouts on APIGateway"
                  required
                />
              </div>

              <div className="bb-input-group">
                <label>Details & Blast Radius</label>
                <textarea
                  rows={2}
                  value={newDetails}
                  onChange={e => setNewDetails(e.target.value)}
                  placeholder="Specific services and impact..."
                />
              </div>

              <div className="bb-input-row">
                <div className="bb-input-group flex-1">
                  <label>Target Service</label>
                  <select
                    value={newTargetService}
                    onChange={e => setNewTargetService(e.target.value)}
                  >
                    <option value="AuthService">AuthService</option>
                    <option value="APIGateway">APIGateway</option>
                    <option value="NotificationGateway">NotificationGateway</option>
                    <option value="UserDirectory">UserDirectory</option>
                    <option value="BillingService">BillingService</option>
                  </select>
                </div>

                <div className="bb-input-group flex-1">
                  <label>Assigned Maintainer</label>
                  <select
                    value={newAssignedTo}
                    onChange={e => setNewAssignedTo(e.target.value)}
                  >
                    <option value="Sam Chen">Sam Chen (Auth)</option>
                    <option value="Alex Rivera">Alex Rivera (SRE)</option>
                    <option value="Elena Rostova">Elena Rostova (Gateway)</option>
                  </select>
                </div>

                <div className="bb-input-group flex-1">
                  <label>Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="bb-modal-actions">
                <button
                  type="button"
                  className="bb-cancel-btn"
                  onClick={() => setIsDispatchModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bb-submit-dispatch-btn"
                  disabled={isDispatching}
                >
                  {isDispatching ? <Loader2 size={13} className="spin-anim" /> : <Send size={13} />}
                  <span>Dispatch to Blackboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentBlackboard;
