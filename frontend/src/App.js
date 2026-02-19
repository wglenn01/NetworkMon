import { useEffect, useState, useCallback, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Activity, Server, Wifi, AlertTriangle, Shield, Home, 
  Plus, Trash2, Edit, RefreshCw, Settings, ChevronRight,
  Router, GitBranch, Radio, Zap, X, Check, Clock, TrendingUp,
  FileText, Copy, Save, Pin, PinOff, History, Search, Upload, Download,
  BellOff, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Sound alert utility - plays a beep for critical alerts
const playAlertSound = (type = 'critical') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'critical') {
      // Urgent double beep for critical alerts
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      // Second beep
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 880;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.15);
      }, 200);
    } else if (type === 'warning') {
      // Single lower beep for warnings
      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'success') {
      // Pleasant chime for recovery
      oscillator.frequency.value = 523; // C5 note
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    // Silently fail if audio context is not available
    console.log('Audio not available');
  }
};

// Format value based on data type - returns { display, unit } for auto-scaling types
const formatValue = (value, dataType, unit) => {
  if (value === null || value === undefined) return '-';
  if (dataType === 'text') return String(value);
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return String(value);
  
  switch (dataType) {
    case 'mbps':
      // Value is already in Mbps, auto-scale to Gbps if >= 1000
      if (numValue >= 1000) {
        return (numValue / 1000).toFixed(2) + ' Gbps';
      }
      // Show as whole number for clean display
      return Math.round(numValue) + ' Mbps';
    case 'kbps':
      // Value is already in Kbps, auto-scale to Mbps if >= 1000
      if (numValue >= 1000) {
        return (numValue / 1000).toFixed(2) + ' Mbps';
      }
      return Math.round(numValue) + ' Kbps';
    case 'bytes':
      // Auto-scale bytes
      if (numValue >= 1073741824) return (numValue / 1073741824).toFixed(2) + ' GB';
      if (numValue >= 1048576) return (numValue / 1048576).toFixed(2) + ' MB';
      if (numValue >= 1024) return (numValue / 1024).toFixed(2) + ' KB';
      return Math.round(numValue) + ' B';
    case 'percentage':
      return numValue.toFixed(1) + '%';
    case 'counter':
      // Counters are cumulative, show as whole number
      return Math.round(numValue).toLocaleString();
    case 'gauge':
    default:
      // For gauge/default, show 2 decimals only if needed
      return numValue % 1 === 0 ? Math.round(numValue).toString() : numValue.toFixed(2);
  }
};

// Check if data type includes unit in formatted value (for auto-scaling types)
const isAutoScalingType = (dataType) => {
  return ['mbps', 'kbps', 'bytes', 'percentage'].includes(dataType);
};

// Get unit label based on data type (only for non-auto-scaling types)
const getUnitLabel = (dataType, unit) => {
  // Auto-scaling types include unit in the formatted value
  if (isAutoScalingType(dataType)) return '';
  if (unit) return unit;
  switch (dataType) {
    default: return unit || '';
  }
};

// Icon mapping
const iconMap = {
  router: Router,
  "git-branch": GitBranch,
  radio: Radio,
  home: Home,
  server: Server,
  wifi: Wifi,
  zap: Zap,
};

// Sidebar Component
const Sidebar = ({ categories, categoryStats, activeCategory, setActiveCategory, onAddCategory, onDeleteCategory }) => {
  const navigate = useNavigate();
  
  // Merge category info with stats
  const getCategoryStats = (catId) => {
    const stats = categoryStats?.find(s => s.id === catId);
    return stats || { online: 0, offline: 0, total: 0 };
  };
  
  return (
    <div className="sidebar w-64 h-screen fixed left-0 top-0 flex flex-col" data-testid="sidebar">
      <div className="p-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground font-mono">NETGRAPH</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Network Monitor</p>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-1">
          <button
            onClick={() => { setActiveCategory(null); navigate('/'); }}
            className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 text-sm ${!activeCategory ? 'active' : ''}`}
            data-testid="nav-dashboard"
          >
            <Home className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">Dashboard</span>
          </button>
          
          <button
            onClick={() => { setActiveCategory('all'); navigate('/devices'); }}
            className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 text-sm ${activeCategory === 'all' ? 'active' : ''}`}
            data-testid="nav-all-devices"
          >
            <Server className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">All Devices</span>
          </button>
          
          <button
            onClick={() => navigate('/alerts')}
            className="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 text-sm"
            data-testid="nav-alerts"
          >
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">Alerts</span>
          </button>
          
          <button
            onClick={() => navigate('/templates')}
            className="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 text-sm"
            data-testid="nav-templates"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">SNMP Templates</span>
          </button>
        </div>
        
        <Separator className="my-4 bg-border/20" />
        
        <div className="px-3">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Categories</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={onAddCategory}
              data-testid="add-category-btn"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="space-y-1">
            {categories.map((cat) => {
              const IconComponent = iconMap[cat.icon] || Server;
              const stats = getCategoryStats(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); navigate('/devices'); }}
                  className={`sidebar-item w-full flex items-center justify-between px-3 py-2 text-sm group cursor-pointer ${activeCategory === cat.id ? 'active' : ''}`}
                  data-testid={`category-${cat.name.toLowerCase()}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="category-dot" style={{ backgroundColor: cat.color }} />
                    <IconComponent className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {stats.total > 0 && (
                      <span className="text-[10px] font-mono">
                        <span className="text-emerald-400">{stats.online}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className={stats.offline > 0 ? "text-red-400" : "text-muted-foreground"}>{stats.offline}</span>
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                      data-testid={`delete-category-${cat.name.toLowerCase()}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

// Mini Sparkline Component for Dashboard
const DeviceSparkline = ({ deviceId, metricName = "PHYRx" }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/monitoring/${deviceId}?hours=24`);
        // Filter for the specific metric and get last 24 data points
        const metricData = res.data
          .filter(d => d.metric_name?.toLowerCase().includes(metricName.toLowerCase()) || 
                       d.metric_name?.toLowerCase().includes('rx') ||
                       d.metric_name?.toLowerCase().includes('traffic'))
          .slice(-24)
          .map(d => ({ value: typeof d.value === 'number' ? d.value : 0 }));
        setData(metricData);
      } catch (err) {
        // Silently fail - sparkline just won't show
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [deviceId, metricName]);
  
  if (loading || data.length < 2) return null;
  
  return (
    <div className="w-full h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${deviceId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#0EA5E9"
            fill={`url(#spark-${deviceId})`}
            strokeWidth={1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const variants = {
    online: "badge-online",
    offline: "badge-offline",
    warning: "badge-warning",
    unknown: "badge-unknown"
  };
  
  return (
    <Badge className={`${variants[status] || variants.unknown} font-mono uppercase text-[10px] tracking-widest border`}>
      {status}
    </Badge>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, unit, icon: Icon, trend, color = "primary", onClick }) => {
  const colorClasses = {
    primary: "text-primary",
    success: "text-emerald-400",
    warning: "text-amber-400",
    error: "text-red-400"
  };
  
  return (
    <Card 
      className={`metric-card bg-card/50 border-border/30 backdrop-blur-sm card-hover ${onClick ? 'cursor-pointer hover:border-primary/50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold font-mono ${colorClasses[color]}`}>{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-400">{trend}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Pinned Graph Card Component for Dashboard
const PinnedGraphCard = ({ graph, onUnpin, devices }) => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get OID config for data type from devices
  const device = devices?.find(d => d.id === graph.device_id);
  const oidConfig = device?.oids?.find(o => o.name === graph.metric_name);
  const dataType = oidConfig?.data_type || 'gauge';
  const unit = getUnitLabel(dataType, oidConfig?.unit);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/pinned-graphs/${graph.id}/data?hours=1`);
        setData(res.data.data.map(d => ({
          time: new Date(d.timestamp).toLocaleTimeString(),
          value: d.value
        })));
      } catch (err) {
        console.error('Failed to fetch pinned graph data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [graph.id]);
  
  const latestValue = data.length > 0 ? data[data.length - 1].value : null;
  const formattedValue = latestValue !== null ? formatValue(latestValue, dataType, unit) : null;
  
  return (
    <Card className="bg-card/50 border-border/30 backdrop-blur-sm card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div 
            className="cursor-pointer"
            onClick={() => navigate(`/device/${graph.device_id}`)}
          >
            <CardTitle className="text-sm font-mono hover:text-primary">{graph.device_name}</CardTitle>
            <CardDescription className="text-xs">{graph.metric_name}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {formattedValue !== null && (
              <span className="text-lg font-bold font-mono text-primary">
                {formattedValue}{!isAutoScalingType(dataType) && unit ? ` ${unit}` : ''}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              onClick={() => onUnpin(graph.id)}
              data-testid={`unpin-graph-${graph.id}`}
            >
              <PinOff className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[120px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`gradient-${graph.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={graph.metric_type === 'ping' ? '#10B981' : '#0EA5E9'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={graph.metric_type === 'ping' ? '#10B981' : '#0EA5E9'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={graph.metric_type === 'ping' ? '#10B981' : '#0EA5E9'}
                  fill={`url(#gradient-${graph.id})`}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              No data
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Dashboard Component
const Dashboard = ({ stats, alerts, devices, categories, schedulerStatus, pinnedGraphs, onUnpinGraph }) => {
  const navigate = useNavigate();
  
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };
  
  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">Network Overview</h1>
          <p className="text-muted-foreground mt-1">Monitor your infrastructure in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Scheduler Status Indicator */}
          {schedulerStatus && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 border border-border/30 text-xs">
              <div className={`w-2 h-2 rounded-full ${schedulerStatus.scheduler_running ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-muted-foreground font-mono">
                Auto-poll: {schedulerStatus.auto_poll_enabled_devices} devices
              </span>
            </div>
          )}
          <Button 
            className="btn-technical gap-2"
            onClick={() => axios.post(`${API}/monitoring/poll-all`).then(() => toast.success('Polling all devices...'))}
            data-testid="poll-all-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Poll All
          </Button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Devices" 
          value={stats.total_devices} 
          icon={Server}
          color="primary"
        />
        <MetricCard 
          title="Online" 
          value={stats.online_devices} 
          icon={Shield}
          color="success"
          onClick={() => navigate('/devices?status=online')}
        />
        <MetricCard 
          title="Offline" 
          value={stats.offline_devices} 
          icon={AlertTriangle}
          color="error"
          onClick={() => navigate('/devices?status=offline')}
        />
        <MetricCard 
          title="Active Alerts" 
          value={stats.active_alerts} 
          icon={Zap}
          color={stats.active_alerts > 0 ? "warning" : "primary"}
          onClick={() => navigate('/alerts')}
        />
      </div>
      
      {/* Pinned Graphs */}
      {pinnedGraphs && pinnedGraphs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-mono font-semibold text-foreground">Pinned Graphs</h2>
            <span className="text-xs text-muted-foreground">({pinnedGraphs.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pinnedGraphs.map(graph => (
              <PinnedGraphCard 
                key={graph.id} 
                graph={graph} 
                devices={devices}
                onUnpin={onUnpinGraph}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Device Status */}
        <Card className="lg:col-span-2 bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-mono tracking-tight">Device Status</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/devices')}>
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {devices.slice(0, 6).map((device) => {
                const category = categories.find(c => c.id === device.category_id);
                return (
                  <div 
                    key={device.id}
                    className="flex items-center p-3 bg-background/50 border border-border/20 hover:border-primary/30 cursor-pointer"
                    onClick={() => navigate(`/device/${device.id}`)}
                    data-testid={`device-row-${device.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className={`device-status ${device.status}`} />
                      <div>
                        <p className="font-medium text-sm text-foreground">{device.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground font-mono">{device.ip_address}</p>
                          {device.last_polled && (
                            <span className="text-[10px] text-muted-foreground">
                              • polled {formatTimeAgo(device.last_polled)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 px-4">
                      <DeviceSparkline deviceId={device.id} />
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {category && (
                        <Badge variant="outline" className="font-mono text-[10px] tracking-wider" style={{ borderColor: category.color, color: category.color }}>
                          {category.name}
                        </Badge>
                      )}
                      <StatusBadge status={device.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Active Alerts */}
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-mono tracking-tight">Active Alerts</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/alerts')}>
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {alerts.filter(a => !a.acknowledged).slice(0, 5).map((alert) => (
                  <div 
                    key={alert.id}
                    className={`alert-card p-3 ${alert.alert_type.includes('critical') ? 'critical' : alert.alert_type.includes('warning') ? 'warning' : 'info'}`}
                    data-testid={`alert-${alert.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{alert.device_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => axios.put(`${API}/alerts/${alert.id}/acknowledge`)}
                        data-testid={`ack-alert-${alert.id}`}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {alerts.filter(a => !a.acknowledged).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active alerts</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Category Distribution */}
      <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-mono tracking-tight">Devices by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.devices_by_category?.map((item, index) => {
              const category = categories.find(c => c.name === item.category);
              return (
                <div 
                  key={index}
                  className="p-4 bg-background/50 border border-border/20 hover:border-primary/30 cursor-pointer"
                  onClick={() => navigate('/devices')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="category-dot" style={{ backgroundColor: category?.color || '#0EA5E9' }} />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.category}</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">{item.count}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Device List Component
const DeviceList = ({ devices, categories, activeCategory, onAddDevice, onEditDevice, onDeleteDevice, onToggleSilence, onRefresh }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  
  // Get status filter from URL params
  const searchParams = new URLSearchParams(location.search);
  const statusFilter = searchParams.get('status');
  
  // Filter by category, then by status, then by search query
  const filteredDevices = (activeCategory && activeCategory !== 'all' 
    ? devices.filter(d => d.category_id === activeCategory)
    : devices
  ).filter(d => {
    // Status filter
    if (statusFilter === 'online') {
      return d.status === 'online';
    } else if (statusFilter === 'offline') {
      return d.status === 'offline' || d.status === 'unknown';
    }
    return true;
  }).filter(d => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(query) || d.ip_address.toLowerCase().includes(query);
  });
  
  const clearStatusFilter = () => {
    navigate('/devices');
  };
  
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImporting(true);
    setImportResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/devices/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      if (res.data.imported > 0 && onRefresh) {
        onRefresh();
      }
    } catch (err) {
      setImportResult({ 
        message: err.response?.data?.detail || 'Import failed', 
        imported: 0, 
        failed: 0 
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const downloadSampleCSV = () => {
    const sample = `Name,IP,Category,Template,Community
Router-1,192.168.1.1,Routers,Cisco Router,public
Switch-1,192.168.1.2,Switches,Cisco Switch,public
Radio-1,10.0.0.1,Backhauls,Ubiquiti Radio,public`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'device_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6 animate-fade-in" data-testid="device-list">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">Devices</h1>
          <p className="text-muted-foreground mt-1">
            {statusFilter ? (
              <span className="flex items-center gap-2">
                Showing <span className={statusFilter === 'offline' ? 'text-red-400' : 'text-emerald-400'}>{statusFilter}</span> devices
                <button 
                  onClick={clearStatusFilter}
                  className="text-xs text-primary hover:underline"
                >
                  (clear filter)
                </button>
              </span>
            ) : activeCategory && activeCategory !== 'all' 
              ? `Showing ${categories.find(c => c.id === activeCategory)?.name || ''} devices`
              : 'All monitored devices'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or IP..."
              className="input-technical pl-9 w-64"
              data-testid="device-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button 
            variant="outline" 
            className="btn-technical gap-2" 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            data-testid="import-csv-btn"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button className="btn-technical gap-2" onClick={onAddDevice} data-testid="add-device-btn">
            <Plus className="w-4 h-4" />
            Add Device
          </Button>
        </div>
      </div>
      
      {/* Import Result */}
      {importResult && (
        <div className={`p-4 border ${importResult.imported > 0 ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{importResult.message}</p>
              {importResult.details?.errors?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-muted-foreground cursor-pointer">View errors ({importResult.details.errors.length})</summary>
                  <ul className="mt-2 text-xs space-y-1 text-red-400">
                    {importResult.details.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={downloadSampleCSV} className="text-xs">
                <Download className="w-3 h-3 mr-1" />
                Sample CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Show search results count when searching */}
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          Found {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => {
          const category = categories.find(c => c.id === device.category_id);
          const IconComponent = iconMap[category?.icon] || Server;
          
          return (
            <Card 
              key={device.id}
              className="bg-card/50 border-border/30 backdrop-blur-sm card-hover cursor-pointer"
              onClick={() => navigate(`/device/${device.id}`)}
              data-testid={`device-card-${device.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`device-status status-pulse ${device.status}`} />
                    <div>
                      <p className="font-medium text-foreground">{device.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{device.ip_address}</p>
                    </div>
                  </div>
                  <StatusBadge status={device.status} />
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="category-dot" style={{ backgroundColor: category?.color }} />
                  <span className="text-xs text-muted-foreground">{category?.name}</span>
                  {device.alerts_silenced && (
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">
                      <BellOff className="w-2.5 h-2.5 mr-1" />
                      SILENCED
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {device.oids?.length || 0} OIDs
                    </span>
                    <span className="flex items-center gap-1">
                      <Wifi className={`w-3 h-3 ${device.ping_enabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                      Ping {device.ping_enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-6 w-6 ${device.alerts_silenced ? 'text-amber-400' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onToggleSilence(device.id, !device.alerts_silenced); }}
                      title={device.alerts_silenced ? 'Enable alerts' : 'Silence alerts'}
                      data-testid={`silence-device-${device.id}`}
                    >
                      {device.alerts_silenced ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); onEditDevice(device); }}
                      data-testid={`edit-device-${device.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDeleteDevice(device.id); }}
                      data-testid={`delete-device-${device.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredDevices.length === 0 && (
          <Card className="col-span-full bg-card/50 border-border/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No devices found</p>
              <Button className="mt-4 btn-technical" onClick={onAddDevice}>
                Add Your First Device
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Device Detail Component
const DeviceDetail = ({ categories, pinnedGraphs, onPinGraph, onUnpinGraph }) => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [monitoringData, setMonitoringData] = useState([]);
  const [latestData, setLatestData] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [timeRange, setTimeRange] = useState("24");
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    try {
      const [deviceRes, monitoringRes, latestRes, alertsRes] = await Promise.all([
        axios.get(`${API}/devices/${deviceId}`),
        axios.get(`${API}/monitoring/${deviceId}?hours=${timeRange}`),
        axios.get(`${API}/monitoring/${deviceId}/latest`),
        axios.get(`${API}/alerts/history/${deviceId}?limit=20`)
      ]);
      setDevice(deviceRes.data);
      setMonitoringData(monitoringRes.data);
      setLatestData(latestRes.data);
      setAlertHistory(alertsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load device data');
    } finally {
      setLoading(false);
    }
  }, [deviceId, timeRange]);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  const isGraphPinned = (metricName) => {
    return pinnedGraphs?.some(g => g.device_id === deviceId && g.metric_name === metricName);
  };
  
  const handlePinToggle = async (metricType, metricName) => {
    const existing = pinnedGraphs?.find(g => g.device_id === deviceId && g.metric_name === metricName);
    if (existing) {
      await onUnpinGraph(existing.id);
    } else {
      await onPinGraph({
        device_id: deviceId,
        device_name: device.name,
        metric_type: metricType,
        metric_name: metricName
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!device) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Device not found</p>
        <Button className="mt-4" onClick={() => navigate('/devices')}>Back to Devices</Button>
      </div>
    );
  }
  
  const category = categories.find(c => c.id === device.category_id);
  const pingData = monitoringData.filter(d => d.metric_type === 'ping').map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString(),
    value: d.value
  }));
  
  // Group SNMP data by metric name
  const snmpMetrics = {};
  monitoringData.filter(d => d.metric_type === 'snmp').forEach(d => {
    if (!snmpMetrics[d.metric_name]) {
      snmpMetrics[d.metric_name] = [];
    }
    snmpMetrics[d.metric_name].push({
      time: new Date(d.timestamp).toLocaleTimeString(),
      value: d.value
    });
  });
  
  return (
    <div className="space-y-6 animate-fade-in" data-testid="device-detail">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/devices')} className="text-muted-foreground">
              <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Back
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className={`device-status status-pulse ${device.status}`} style={{ width: '14px', height: '14px' }} />
            <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">{device.name}</h1>
            <StatusBadge status={device.status} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span className="font-mono">{device.ip_address}</span>
            {category && (
              <Badge variant="outline" style={{ borderColor: category.color, color: category.color }}>
                {category.name}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 input-technical" data-testid="time-range-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1 Hour</SelectItem>
              <SelectItem value="24">Last 24 Hours</SelectItem>
              <SelectItem value="168">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            className="btn-technical gap-2"
            onClick={() => axios.post(`${API}/monitoring/poll/${deviceId}`).then(() => { toast.success('Polling device...'); fetchData(); })}
            data-testid="poll-device-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Poll Now
          </Button>
        </div>
      </div>
      
      {/* Latest Values */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {latestData.map((metric, index) => {
          // Get OID config for data type
          const oidConfig = device.oids?.find(o => o.name === metric.metric_name);
          const dataType = oidConfig?.data_type || 'gauge';
          const displayUnit = getUnitLabel(dataType, metric.unit);
          const formattedValue = formatValue(metric.value, dataType, metric.unit);
          
          return (
            <MetricCard
              key={index}
              title={metric.metric_name}
              value={formattedValue}
              unit={!isAutoScalingType(dataType) ? displayUnit : ''}
              icon={metric.metric_type === 'ping' ? Wifi : Activity}
              color={metric.metric_type === 'ping' ? 'success' : 'primary'}
            />
          );
        })}
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="ping" className="space-y-4">
        <TabsList className="bg-card/50 border border-border/30">
          <TabsTrigger value="ping" className="font-mono text-xs data-[state=active]:bg-primary/20">PING</TabsTrigger>
          {Object.keys(snmpMetrics).map(name => (
            <TabsTrigger key={name} value={name} className="font-mono text-xs data-[state=active]:bg-primary/20">
              {name.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="ping">
          <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-mono">Response Time (ms)</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className={`btn-technical text-xs ${isGraphPinned('Response Time') ? 'text-primary' : ''}`}
                onClick={() => handlePinToggle('ping', 'Response Time')}
                data-testid="pin-ping-graph"
              >
                {isGraphPinned('Response Time') ? <PinOff className="w-3 h-3 mr-1" /> : <Pin className="w-3 h-3 mr-1" />}
                {isGraphPinned('Response Time') ? 'Unpin' : 'Pin to Dashboard'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pingData}>
                    <defs>
                      <linearGradient id="pingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(220 25% 5%)', 
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: 0
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10B981" 
                      fill="url(#pingGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {Object.entries(snmpMetrics).map(([name, data]) => (
          <TabsContent key={name} value={name}>
            <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-mono">{name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`btn-technical text-xs ${isGraphPinned(name) ? 'text-primary' : ''}`}
                  onClick={() => handlePinToggle('snmp', name)}
                  data-testid={`pin-${name}-graph`}
                >
                  {isGraphPinned(name) ? <PinOff className="w-3 h-3 mr-1" /> : <Pin className="w-3 h-3 mr-1" />}
                  {isGraphPinned(name) ? 'Unpin' : 'Pin to Dashboard'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(220 25% 5%)', 
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          borderRadius: 0
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0EA5E9" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Alert History */}
      <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-mono">Alert History</CardTitle>
          </div>
          <CardDescription>Recent alerts for this device</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {alertHistory.map((alert) => (
                <div 
                  key={alert.id}
                  className={`flex items-center justify-between p-3 border border-border/20 ${
                    alert.resolved ? 'bg-background/30 opacity-60' : 
                    alert.alert_type.includes('critical') || alert.alert_type === 'device_down' ? 'bg-red-500/5 border-l-2 border-l-red-500' :
                    alert.alert_type.includes('warning') ? 'bg-amber-500/5 border-l-2 border-l-amber-500' :
                    'bg-primary/5 border-l-2 border-l-primary'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{alert.metric_name}</span>
                      <Badge variant="outline" className="font-mono text-[9px]">
                        {alert.alert_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {alert.resolved && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0 font-mono text-[9px]">
                          RESOLVED
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-mono">
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                      {alert.resolved_at && (
                        <span className="text-emerald-400">
                          Resolved: {new Date(alert.resolved_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {alertHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No alert history for this device</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* OID Configuration */}
      <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-mono">SNMP OID Configuration</CardTitle>
          <CardDescription>Custom OIDs configured for this device</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {device.oids?.map((oid, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background/50 border border-border/20">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground">{oid.name}</p>
                    <Badge variant="outline" className="text-[9px] font-mono capitalize">
                      {oid.data_type || 'gauge'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{oid.oid}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {oid.unit && <span>Unit: {oid.unit}</span>}
                  {oid.threshold_warning && (
                    <span className="text-amber-400">Warning: {oid.threshold_warning}{oid.unit}</span>
                  )}
                  {oid.threshold_critical && (
                    <span className="text-red-400">Critical: {oid.threshold_critical}{oid.unit}</span>
                  )}
                </div>
              </div>
            ))}
            {(!device.oids || device.oids.length === 0) && (
              <p className="text-center py-4 text-muted-foreground">No OIDs configured</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Alerts Page Component
const AlertsPage = ({ alerts, onAcknowledge, onAcknowledgeAll, onDelete, onClear, onRefresh }) => {
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  
  return (
    <div className="space-y-6 animate-fade-in" data-testid="alerts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">Alerts</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage network alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="btn-technical gap-2" onClick={onRefresh} data-testid="refresh-alerts-btn">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {unacknowledgedCount > 0 && (
            <Button 
              variant="outline" 
              className="btn-technical gap-2 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10" 
              onClick={onAcknowledgeAll}
              data-testid="acknowledge-all-btn"
            >
              <Check className="w-4 h-4" />
              Acknowledge All ({unacknowledgedCount})
            </Button>
          )}
          <Button variant="outline" className="btn-technical gap-2 text-destructive" onClick={onClear} data-testid="clear-alerts-btn">
            <Trash2 className="w-4 h-4" />
            Clear Acknowledged
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        {alerts.map((alert) => (
          <Card 
            key={alert.id}
            className={`alert-card ${alert.alert_type.includes('critical') || alert.alert_type === 'device_down' ? 'critical' : alert.alert_type.includes('warning') ? 'warning' : 'info'} bg-card/50 border-border/30`}
            data-testid={`alert-item-${alert.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className={`w-4 h-4 ${alert.alert_type.includes('critical') || alert.alert_type === 'device_down' ? 'text-red-400' : alert.alert_type.includes('warning') ? 'text-amber-400' : 'text-primary'}`} />
                    <span className="font-medium text-foreground">{alert.device_name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {alert.alert_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {alert.acknowledged && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0 font-mono text-[10px]">
                        ACKNOWLEDGED
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                    {alert.value && (
                      <span>Value: {alert.value.toFixed(2)}</span>
                    )}
                    {alert.threshold && (
                      <span>Threshold: {alert.threshold}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!alert.acknowledged && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="btn-technical"
                      onClick={() => onAcknowledge(alert.id)}
                      data-testid={`ack-btn-${alert.id}`}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:text-destructive"
                    onClick={() => onDelete(alert.id)}
                    data-testid={`delete-alert-${alert.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {alerts.length === 0 && (
          <Card className="bg-card/50 border-border/30">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-emerald-400 opacity-50" />
              <p className="text-muted-foreground">No alerts in the last 24 hours</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Templates Page Component
const TemplatesPage = ({ templates, onSave, onDelete, onRefresh }) => {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const handleEdit = (template) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };
  
  const handleAdd = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };
  
  const handleSave = async (data) => {
    await onSave(data, editingTemplate?.id);
    setDialogOpen(false);
  };
  
  // Group templates by brand
  const templatesByBrand = templates.reduce((acc, t) => {
    const brand = t.brand || 'Other';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(t);
    return acc;
  }, {});
  
  return (
    <div className="space-y-6 animate-fade-in" data-testid="templates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">SNMP Templates</h1>
          <p className="text-muted-foreground mt-1">Manage reusable OID configurations for device types</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="btn-technical gap-2" onClick={onRefresh} data-testid="refresh-templates-btn">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="btn-technical gap-2" onClick={handleAdd} data-testid="add-template-btn">
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        </div>
      </div>
      
      {Object.entries(templatesByBrand).map(([brand, brandTemplates]) => (
        <div key={brand} className="space-y-3">
          <h2 className="text-lg font-mono font-semibold text-foreground flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" />
            {brand}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brandTemplates.map((template) => (
              <Card 
                key={template.id}
                className="bg-card/50 border-border/30 backdrop-blur-sm card-hover"
                data-testid={`template-card-${template.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-mono">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {template.oids?.length || 0} OIDs
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {template.oids?.slice(0, 3).map((oid, index) => (
                      <div key={index} className="text-xs flex items-center justify-between p-2 bg-background/50 border border-border/20">
                        <span className="text-muted-foreground">{oid.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={oid.oid}>
                          {oid.oid}
                        </span>
                      </div>
                    ))}
                    {(template.oids?.length || 0) > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{template.oids.length - 3} more OIDs
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="btn-technical text-xs"
                      onClick={async () => {
                        try {
                          const res = await axios.post(`${API}/templates/${template.id}/apply-to-devices`);
                          toast.success(res.data.message);
                        } catch (err) {
                          toast.error('Failed to apply template');
                        }
                      }}
                      title="Apply template OIDs to all devices using this template"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Apply to Devices
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="btn-technical text-xs"
                      onClick={() => handleEdit(template)}
                      data-testid={`edit-template-${template.id}`}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs hover:text-destructive"
                      onClick={() => onDelete(template.id)}
                      data-testid={`delete-template-${template.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      
      {templates.length === 0 && (
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No templates yet</p>
            <Button className="mt-4 btn-technical" onClick={handleAdd}>
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}
      
      <TemplateDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editingTemplate}
        onSave={handleSave}
      />
    </div>
  );
};

// Template Dialog Component
const TemplateDialog = ({ open, onOpenChange, template, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    description: '',
    oids: []
  });
  const [newOid, setNewOid] = useState({ oid: '', name: '', unit: '', data_type: 'gauge', threshold_operator: 'gt', threshold_warning: '', threshold_critical: '' });
  
  const dataTypes = [
    { value: 'gauge', label: 'Gauge (number)' },
    { value: 'counter', label: 'Counter (cumulative)' },
    { value: 'mbps', label: 'Mbps (megabits/sec)' },
    { value: 'kbps', label: 'Kbps (kilobits/sec)' },
    { value: 'bytes', label: 'Bytes (auto-scale)' },
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'text', label: 'Text (no graph)' },
  ];
  
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        brand: template.brand || '',
        description: template.description || '',
        oids: template.oids || []
      });
    } else {
      setFormData({
        name: '',
        brand: '',
        description: '',
        oids: []
      });
    }
  }, [template, open]);
  
  const addOid = () => {
    if (newOid.oid && newOid.name) {
      setFormData(prev => ({
        ...prev,
        oids: [...prev.oids, {
          ...newOid,
          threshold_warning: newOid.threshold_warning ? parseFloat(newOid.threshold_warning) : null,
          threshold_critical: newOid.threshold_critical ? parseFloat(newOid.threshold_critical) : null
        }]
      }));
      setNewOid({ oid: '', name: '', unit: '', data_type: 'gauge', threshold_operator: 'gt', threshold_warning: '', threshold_critical: '' });
    }
  };
  
  const updateOid = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      oids: prev.oids.map((oid, i) => {
        if (i === index) {
          const updated = { ...oid, [field]: value };
          if (field === 'threshold_warning' || field === 'threshold_critical') {
            updated[field] = value ? parseFloat(value) : null;
          }
          return updated;
        }
        return oid;
      })
    }));
  };
  
  const removeOid = (index) => {
    setFormData(prev => ({
      ...prev,
      oids: prev.oids.filter((_, i) => i !== index)
    }));
  };
  
  const handleSave = () => {
    if (!formData.name) {
      toast.error('Please enter a template name');
      return;
    }
    onSave(formData);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-glass max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl">{template ? 'Edit Template' : 'Add Template'}</DialogTitle>
          <DialogDescription>Configure SNMP OIDs for this template</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Template Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-technical"
                placeholder="e.g., Cisco Router"
                data-testid="template-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Brand</Label>
              <Input 
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                className="input-technical"
                placeholder="e.g., Cisco, Ubiquiti"
                data-testid="template-brand-input"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Description</Label>
            <Input 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input-technical"
              placeholder="Brief description of this template"
            />
          </div>
          
          <Separator className="bg-border/30" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider">OIDs ({formData.oids.length})</Label>
              {formData.oids.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-destructive hover:text-destructive"
                  onClick={() => setFormData(prev => ({ ...prev, oids: [] }))}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            {/* Editable OID List */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {formData.oids.map((oid, index) => (
                  <div key={index} className="p-3 bg-background/50 border border-border/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">OID #{index + 1}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 hover:text-destructive"
                        onClick={() => removeOid(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        value={oid.oid}
                        onChange={(e) => updateOid(index, 'oid', e.target.value)}
                        className="input-technical text-xs font-mono"
                        placeholder="OID"
                      />
                      <Input 
                        value={oid.name}
                        onChange={(e) => updateOid(index, 'name', e.target.value)}
                        className="input-technical text-xs"
                        placeholder="Name"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Select value={oid.data_type || 'gauge'} onValueChange={(v) => updateOid(index, 'data_type', v)}>
                        <SelectTrigger className="input-technical text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dataTypes.map(dt => (
                            <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        value={oid.unit || ''}
                        onChange={(e) => updateOid(index, 'unit', e.target.value)}
                        className="input-technical text-xs"
                        placeholder="Unit"
                      />
                      <Select value={oid.threshold_operator || 'gt'} onValueChange={(v) => updateOid(index, 'threshold_operator', v)}>
                        <SelectTrigger className="input-technical text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gt">&gt; Greater</SelectItem>
                          <SelectItem value="lt">&lt; Less</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Input 
                          value={oid.threshold_warning || ''}
                          onChange={(e) => updateOid(index, 'threshold_warning', e.target.value)}
                          className="input-technical text-xs w-1/2"
                          placeholder="Warn"
                          type="number"
                        />
                        <Input 
                          value={oid.threshold_critical || ''}
                          onChange={(e) => updateOid(index, 'threshold_critical', e.target.value)}
                          className="input-technical text-xs w-1/2"
                          placeholder="Crit"
                          type="number"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="space-y-2 p-3 border border-dashed border-border/30">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">Add OID</p>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  value={newOid.oid}
                  onChange={(e) => setNewOid(prev => ({ ...prev, oid: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="OID (e.g., 1.3.6.1.2.1.1.3.0)"
                />
                <Input 
                  value={newOid.name}
                  onChange={(e) => setNewOid(prev => ({ ...prev, name: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Metric Name"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select value={newOid.data_type} onValueChange={(v) => setNewOid(prev => ({ ...prev, data_type: v }))}>
                  <SelectTrigger className="input-technical text-xs">
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypes.map(dt => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  value={newOid.unit}
                  onChange={(e) => setNewOid(prev => ({ ...prev, unit: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Unit"
                />
                <Select value={newOid.threshold_operator} onValueChange={(v) => setNewOid(prev => ({ ...prev, threshold_operator: v }))}>
                  <SelectTrigger className="input-technical text-xs">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gt">&gt; Greater than</SelectItem>
                    <SelectItem value="lt">&lt; Less than</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  value={newOid.threshold_warning}
                  onChange={(e) => setNewOid(prev => ({ ...prev, threshold_warning: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Warning Threshold"
                  type="number"
                />
                <Input 
                  value={newOid.threshold_critical}
                  onChange={(e) => setNewOid(prev => ({ ...prev, threshold_critical: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Critical Threshold"
                  type="number"
                />
              </div>
              <Button variant="outline" size="sm" className="btn-technical w-full" onClick={addOid}>
                <Plus className="w-3 h-3 mr-1" />
                Add OID
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="btn-technical">Cancel</Button>
          <Button onClick={handleSave} className="btn-technical bg-primary/20 hover:bg-primary/30" data-testid="save-template-dialog-btn">
            {template ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Device Dialog Component
const DeviceDialog = ({ open, onOpenChange, device, categories, templates, onSave, onSaveTemplate }) => {
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    category_id: '',
    device_type: 'snmp',
    // SNMP fields
    community_string: 'public',
    oids: [],
    // Mikrotik fields
    mikrotik_user: '',
    mikrotik_password: '',
    mikrotik_port: 9001,
    mikrotik_use_ssl: false,
    mikrotik_interfaces: [],
    // Common fields
    ping_enabled: true,
    snmp_enabled: true,
    polling_interval: 300,
    auto_poll: true,
    alerts_silenced: false
  });
  const [newOid, setNewOid] = useState({ oid: '', name: '', unit: '', data_type: 'gauge', threshold_operator: 'gt', threshold_warning: '', threshold_critical: '' });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBrand, setNewTemplateBrand] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newInterface, setNewInterface] = useState({ name: '', display_name: '', warning_threshold_mbps: '', critical_threshold_mbps: '' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [availableInterfaces, setAvailableInterfaces] = useState([]);
  
  const pollingIntervals = [
    { value: 5, label: '5 seconds (realtime)' },
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
    { value: 900, label: '15 minutes' },
    { value: 1800, label: '30 minutes' },
    { value: 3600, label: '1 hour' },
  ];
  
  const mikrotikPollingIntervals = [
    { value: 5, label: '5 seconds (realtime)' },
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
  ];
  
  const dataTypes = [
    { value: 'gauge', label: 'Gauge (number)' },
    { value: 'counter', label: 'Counter (cumulative)' },
    { value: 'mbps', label: 'Mbps (megabits/sec)' },
    { value: 'kbps', label: 'Kbps (kilobits/sec)' },
    { value: 'bytes', label: 'Bytes (auto-scale)' },
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'text', label: 'Text (no graph)' },
  ];
  
  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name,
        ip_address: device.ip_address,
        category_id: device.category_id,
        device_type: device.device_type || 'snmp',
        // SNMP fields
        community_string: device.community_string || 'public',
        oids: device.oids || [],
        // Mikrotik fields
        mikrotik_user: device.mikrotik_user || '',
        mikrotik_password: device.mikrotik_password || '',
        mikrotik_port: device.mikrotik_port || 9001,
        mikrotik_use_ssl: device.mikrotik_use_ssl ?? false,
        mikrotik_interfaces: device.mikrotik_interfaces || [],
        // Common fields
        ping_enabled: device.ping_enabled ?? true,
        snmp_enabled: device.snmp_enabled ?? true,
        polling_interval: device.polling_interval ?? (device.device_type === 'mikrotik' ? 5 : 300),
        auto_poll: device.auto_poll ?? true,
        alerts_silenced: device.alerts_silenced ?? false
      });
    } else {
      setFormData({
        name: '',
        ip_address: '',
        category_id: categories[0]?.id || '',
        device_type: 'snmp',
        // SNMP fields
        community_string: 'public',
        oids: [],
        // Mikrotik fields
        mikrotik_user: '',
        mikrotik_password: '',
        mikrotik_port: 9001,
        mikrotik_use_ssl: false,
        mikrotik_interfaces: [],
        // Common fields
        ping_enabled: true,
        snmp_enabled: true,
        polling_interval: 300,
        auto_poll: true,
        alerts_silenced: false
      });
    }
    setSelectedTemplate('');
    setShowSaveTemplate(false);
    setAvailableInterfaces([]);
  }, [device, categories, open]);
  
  const applyTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        oids: [...template.oids]
      }));
      setSelectedTemplate(templateId);
      toast.success(`Applied template: ${template.name}`);
    }
  };
  
  const handleSaveAsTemplate = async () => {
    if (!newTemplateName) {
      toast.error('Please enter a template name');
      return;
    }
    if (formData.oids.length === 0) {
      toast.error('Add at least one OID to save as template');
      return;
    }
    
    await onSaveTemplate({
      name: newTemplateName,
      brand: newTemplateBrand,
      description: newTemplateDesc,
      oids: formData.oids
    });
    
    setShowSaveTemplate(false);
    setNewTemplateName('');
    setNewTemplateBrand('');
    setNewTemplateDesc('');
    toast.success('Template saved successfully');
  };
  
  const addOid = () => {
    if (newOid.oid && newOid.name) {
      setFormData(prev => ({
        ...prev,
        oids: [...prev.oids, {
          ...newOid,
          threshold_warning: newOid.threshold_warning ? parseFloat(newOid.threshold_warning) : null,
          threshold_critical: newOid.threshold_critical ? parseFloat(newOid.threshold_critical) : null
        }]
      }));
      setNewOid({ oid: '', name: '', unit: '', data_type: 'gauge', threshold_operator: 'gt', threshold_warning: '', threshold_critical: '' });
    }
  };
  
  const removeOid = (index) => {
    setFormData(prev => ({
      ...prev,
      oids: prev.oids.filter((_, i) => i !== index)
    }));
  };
  
  const handleSave = () => {
    if (!formData.name || !formData.ip_address || !formData.category_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };
  
  // Group templates by brand
  const templatesByBrand = templates.reduce((acc, t) => {
    const brand = t.brand || 'Other';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(t);
    return acc;
  }, {});
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-glass max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl">{device ? 'Edit Device' : 'Add Device'}</DialogTitle>
          <DialogDescription>Configure device monitoring settings and SNMP OIDs</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Device Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-technical"
                placeholder="Core-Router-01"
                data-testid="device-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">IP Address *</Label>
              <Input 
                value={formData.ip_address}
                onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
                className="input-technical"
                placeholder="192.168.1.1"
                data-testid="device-ip-input"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Category *</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v }))}
              >
                <SelectTrigger className="input-technical" data-testid="device-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Community String</Label>
              <Input 
                value={formData.community_string}
                onChange={(e) => setFormData(prev => ({ ...prev, community_string: e.target.value }))}
                className="input-technical"
                placeholder="public"
                data-testid="device-community-input"
              />
            </div>
          </div>
          
          {/* Monitoring Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Switch 
                  checked={formData.ping_enabled}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, ping_enabled: v }))}
                  data-testid="ping-enabled-switch"
                />
                <Label className="text-sm">Ping Monitoring</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch 
                  checked={formData.snmp_enabled}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, snmp_enabled: v }))}
                  data-testid="snmp-enabled-switch"
                />
                <Label className="text-sm">SNMP Monitoring</Label>
              </div>
            </div>
            
            {/* Auto Polling Configuration */}
            <div className="p-3 border border-border/30 bg-background/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={formData.auto_poll}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_poll: v }))}
                    data-testid="auto-poll-switch"
                  />
                  <Label className="text-sm">Auto Polling</Label>
                </div>
                {formData.auto_poll && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Interval:</Label>
                    <Select 
                      value={String(formData.polling_interval)} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, polling_interval: parseInt(v) }))}
                    >
                      <SelectTrigger className="input-technical w-32 h-8 text-xs" data-testid="polling-interval-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pollingIntervals.map(interval => (
                          <SelectItem key={interval.value} value={String(interval.value)}>
                            {interval.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {formData.auto_poll && (
                <p className="text-xs text-muted-foreground">
                  Device will be automatically polled every {pollingIntervals.find(i => i.value === formData.polling_interval)?.label || '5 minutes'}
                </p>
              )}
            </div>
            
            {/* Silence Alerts */}
            <div className="flex items-center justify-between p-3 border border-border/30 bg-background/30">
              <div className="flex items-center gap-3">
                <Switch 
                  checked={formData.alerts_silenced}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, alerts_silenced: v }))}
                  data-testid="silence-alerts-switch"
                />
                <div>
                  <Label className="text-sm flex items-center gap-2">
                    <BellOff className="w-4 h-4" />
                    Silence Alerts
                  </Label>
                  <p className="text-xs text-muted-foreground">When enabled, no alerts will be created for this device</p>
                </div>
              </div>
              {formData.alerts_silenced && (
                <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                  SILENCED
                </Badge>
              )}
            </div>
          </div>
          
          <Separator className="bg-border/30" />
          
          {/* SNMP Template Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider">SNMP Template</Label>
              <div className="flex items-center gap-2">
                {formData.oids.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="btn-technical text-[10px]"
                    onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                    data-testid="save-as-template-toggle"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save as Template
                  </Button>
                )}
              </div>
            </div>
            
            {/* Template Selection Dropdown */}
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger className="input-technical" data-testid="template-select">
                <SelectValue placeholder="Select a template to apply OIDs..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templatesByBrand).map(([brand, brandTemplates]) => (
                  <div key={brand}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-background/50">
                      {brand}
                    </div>
                    {brandTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-primary" />
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">({template.oids?.length || 0} OIDs)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            
            {/* Save as Template Form */}
            {showSaveTemplate && (
              <div className="p-3 border border-primary/30 bg-primary/5 space-y-3">
                <p className="text-xs text-primary font-mono uppercase tracking-wider">Save Current OIDs as Template</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="input-technical text-xs"
                    placeholder="Template Name *"
                    data-testid="new-template-name"
                  />
                  <Input 
                    value={newTemplateBrand}
                    onChange={(e) => setNewTemplateBrand(e.target.value)}
                    className="input-technical text-xs"
                    placeholder="Brand (e.g., Cisco)"
                  />
                </div>
                <Input 
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  className="input-technical text-xs"
                  placeholder="Description (optional)"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="btn-technical bg-primary/20 text-xs"
                    onClick={handleSaveAsTemplate}
                    data-testid="confirm-save-template"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Save Template
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => setShowSaveTemplate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <Separator className="bg-border/30" />
          
          {/* OID Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider">Custom OIDs ({formData.oids.length})</Label>
              {formData.oids.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-destructive hover:text-destructive"
                  onClick={() => setFormData(prev => ({ ...prev, oids: [] }))}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            {/* OID List Header */}
            {formData.oids.length > 0 && (
              <div className="grid grid-cols-5 gap-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                <span>OID</span>
                <span>Name</span>
                <span>Type</span>
                <span>Unit</span>
                <span>Thresholds</span>
              </div>
            )}
            
            {/* Existing OIDs */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {formData.oids.map((oid, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-background/50 border border-border/20">
                  <div className="flex-1 grid grid-cols-5 gap-2 text-xs">
                    <span className="font-mono truncate" title={oid.oid}>{oid.oid}</span>
                    <span>{oid.name}</span>
                    <span className="text-primary capitalize">{oid.data_type || 'gauge'}</span>
                    <span>{oid.unit || '-'}</span>
                    <span>
                      {(oid.threshold_warning || oid.threshold_critical) ? (
                        <>
                          <span className="text-muted-foreground">{oid.threshold_operator === 'lt' ? '<' : '>'}</span>
                          {oid.threshold_warning && <span className="text-amber-400 ml-1">W:{oid.threshold_warning}</span>}
                          {oid.threshold_critical && <span className="text-red-400 ml-1">C:{oid.threshold_critical}</span>}
                        </>
                      ) : '-'}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 hover:text-destructive"
                    onClick={() => removeOid(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {formData.oids.length === 0 && (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  No OIDs configured. Select a template or add manually below.
                </p>
              )}
            </div>
            
            {/* Add New OID */}
            <div className="space-y-2 p-3 border border-dashed border-border/30">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">Add Custom OID</p>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  value={newOid.oid}
                  onChange={(e) => setNewOid(prev => ({ ...prev, oid: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="OID (e.g., 1.3.6.1.2.1.1.3.0)"
                  data-testid="new-oid-input"
                />
                <Input 
                  value={newOid.name}
                  onChange={(e) => setNewOid(prev => ({ ...prev, name: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Metric Name"
                  data-testid="new-oid-name-input"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select value={newOid.data_type} onValueChange={(v) => setNewOid(prev => ({ ...prev, data_type: v }))}>
                  <SelectTrigger className="input-technical text-xs">
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypes.map(dt => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  value={newOid.unit}
                  onChange={(e) => setNewOid(prev => ({ ...prev, unit: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Unit"
                />
                <Select value={newOid.threshold_operator} onValueChange={(v) => setNewOid(prev => ({ ...prev, threshold_operator: v }))}>
                  <SelectTrigger className="input-technical text-xs">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gt">&gt; Greater than</SelectItem>
                    <SelectItem value="lt">&lt; Less than</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  value={newOid.threshold_warning}
                  onChange={(e) => setNewOid(prev => ({ ...prev, threshold_warning: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Warning Threshold"
                  type="number"
                />
                <Input 
                  value={newOid.threshold_critical}
                  onChange={(e) => setNewOid(prev => ({ ...prev, threshold_critical: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Critical Threshold"
                  type="number"
                />
              </div>
              <Button variant="outline" size="sm" className="btn-technical w-full" onClick={addOid} data-testid="add-oid-btn">
                <Plus className="w-3 h-3 mr-1" />
                Add OID
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="btn-technical">Cancel</Button>
          <Button onClick={handleSave} className="btn-technical bg-primary/20 hover:bg-primary/30" data-testid="save-device-btn">
            {device ? 'Update Device' : 'Add Device'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Category Dialog Component
const CategoryDialog = ({ open, onOpenChange, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0EA5E9',
    icon: 'server'
  });
  
  const colors = ['#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
  const icons = ['server', 'router', 'git-branch', 'radio', 'home', 'wifi'];
  
  const handleSave = () => {
    if (!formData.name) {
      toast.error('Please enter a category name');
      return;
    }
    onSave(formData);
    onOpenChange(false);
    setFormData({ name: '', description: '', color: '#0EA5E9', icon: 'server' });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-glass">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl">Add Category</DialogTitle>
          <DialogDescription>Create a new device category</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Category Name *</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input-technical"
              placeholder="e.g., Firewalls"
              data-testid="category-name-input"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Description</Label>
            <Input 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input-technical"
              placeholder="Optional description"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Color</Label>
            <div className="flex gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  className={`w-8 h-8 border-2 ${formData.color === color ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Icon</Label>
            <div className="flex gap-2">
              {icons.map(icon => {
                const IconComponent = iconMap[icon] || Server;
                return (
                  <button
                    key={icon}
                    className={`w-10 h-10 flex items-center justify-center border ${formData.icon === icon ? 'border-primary bg-primary/10' : 'border-border/30'}`}
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="btn-technical">Cancel</Button>
          <Button onClick={handleSave} className="btn-technical bg-primary/20 hover:bg-primary/30" data-testid="save-category-btn">
            Add Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Layout Component
const MainLayout = ({ children, categories, categoryStats, activeCategory, setActiveCategory, onAddCategory, onDeleteCategory }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar 
        categories={categories}
        categoryStats={categoryStats}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onAddCategory={onAddCategory}
        onDeleteCategory={onDeleteCategory}
      />
      <main className="flex-1 ml-64 p-6 grid-bg">
        <div className="scanlines" />
        {children}
      </main>
    </div>
  );
};

// Main App Component
function App() {
  const [categories, setCategories] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [pinnedGraphs, setPinnedGraphs] = useState([]);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [stats, setStats] = useState({
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0,
    warning_devices: 0,
    active_alerts: 0,
    devices_by_category: []
  });
  const [activeCategory, setActiveCategory] = useState(null);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Track shown alert IDs and previous device statuses for notifications
  const shownAlertIds = useRef(new Set());
  const previousDeviceStatuses = useRef(new Map());
  const isInitialLoad = useRef(true);
  
  const fetchDevices = useCallback(async () => {
    try {
      const [devRes, catStatsRes] = await Promise.all([
        axios.get(`${API}/devices`),
        axios.get(`${API}/categories/stats`)
      ]);
      setDevices(devRes.data);
      setCategoryStats(catStatsRes.data);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  }, []);
  
  const fetchData = useCallback(async () => {
    try {
      const [catRes, devRes, alertRes, statsRes, templateRes, schedulerRes, catStatsRes, pinnedRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/devices`),
        axios.get(`${API}/alerts?hours=24`),
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/templates`),
        axios.get(`${API}/scheduler/status`),
        axios.get(`${API}/categories/stats`),
        axios.get(`${API}/pinned-graphs`)
      ]);
      setCategories(catRes.data);
      setDevices(devRes.data);
      setAlerts(alertRes.data);
      setStats(statsRes.data);
      setTemplates(templateRes.data);
      setSchedulerStatus(schedulerRes.data);
      setCategoryStats(catStatsRes.data);
      setPinnedGraphs(pinnedRes.data);
      
      // Show notifications only after initial load
      if (!isInitialLoad.current) {
        // Check for NEW alerts (not previously shown)
        const unacknowledgedAlerts = alertRes.data.filter(a => !a.acknowledged);
        let hasCritical = false;
        let hasWarning = false;
        
        unacknowledgedAlerts.forEach(alert => {
          if (!shownAlertIds.current.has(alert.id)) {
            shownAlertIds.current.add(alert.id);
            if (alert.alert_type.includes('critical') || alert.alert_type === 'device_down') {
              hasCritical = true;
              toast.error(`🚨 ${alert.device_name}: ${alert.message}`, { 
                duration: 8000,
                icon: '⚠️'
              });
            } else if (alert.alert_type.includes('warning')) {
              hasWarning = true;
              toast.warning(`⚠️ ${alert.device_name}: ${alert.message}`, { 
                duration: 6000 
              });
            }
          }
        });
        
        // Play sound for new alerts (only once per poll cycle)
        if (hasCritical) {
          playAlertSound('critical');
        } else if (hasWarning) {
          playAlertSound('warning');
        }
        
        // Check for device status changes (online <-> offline)
        let hasDeviceDown = false;
        let hasDeviceRecovered = false;
        
        devRes.data.forEach(device => {
          const prevStatus = previousDeviceStatuses.current.get(device.id);
          if (prevStatus !== undefined && prevStatus !== device.status) {
            if (device.status === 'offline' && prevStatus === 'online') {
              hasDeviceDown = true;
              toast.error(`📡 ${device.name} is now OFFLINE`, { 
                duration: 10000,
                description: device.ip_address
              });
            } else if (device.status === 'online' && prevStatus === 'offline') {
              hasDeviceRecovered = true;
              toast.success(`✅ ${device.name} is back ONLINE`, { 
                duration: 5000,
                description: device.ip_address
              });
            }
          }
        });
        
        // Play sound for device status changes (if no alert sound was already played)
        if (!hasCritical && !hasWarning) {
          if (hasDeviceDown) {
            playAlertSound('critical');
          } else if (hasDeviceRecovered) {
            playAlertSound('success');
          }
        }
      }
      
      // Update previous device statuses for next comparison
      devRes.data.forEach(device => {
        previousDeviceStatuses.current.set(device.id, device.status);
      });
      
      // Mark initial load as complete and seed shown alerts
      if (isInitialLoad.current) {
        alertRes.data.forEach(a => shownAlertIds.current.add(a.id));
        isInitialLoad.current = false;
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Device handlers
  const handleAddDevice = () => {
    setEditingDevice(null);
    setDeviceDialogOpen(true);
  };
  
  const handleEditDevice = (device) => {
    setEditingDevice(device);
    setDeviceDialogOpen(true);
  };
  
  const handleSaveDevice = async (data) => {
    try {
      if (editingDevice) {
        await axios.put(`${API}/devices/${editingDevice.id}`, data);
        toast.success('Device updated');
      } else {
        await axios.post(`${API}/devices`, data);
        toast.success('Device added');
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to save device');
    }
  };
  
  const handleDeleteDevice = async (id) => {
    try {
      await axios.delete(`${API}/devices/${id}`);
      toast.success('Device deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete device');
    }
  };
  
  const handleToggleSilence = async (id, silenced) => {
    try {
      await axios.put(`${API}/devices/${id}`, { alerts_silenced: silenced });
      toast.success(silenced ? 'Alerts silenced for this device' : 'Alerts enabled for this device');
      fetchData();
    } catch (err) {
      toast.error('Failed to update device');
    }
  };
  
  // Category handlers
  const handleAddCategory = () => {
    setCategoryDialogOpen(true);
  };
  
  const handleSaveCategory = async (data) => {
    try {
      await axios.post(`${API}/categories`, data);
      toast.success('Category added');
      fetchData();
    } catch (err) {
      toast.error('Failed to add category');
    }
  };
  
  const handleDeleteCategory = async (id) => {
    try {
      await axios.delete(`${API}/categories/${id}`);
      toast.success('Category deleted');
      setActiveCategory(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };
  
  // Template handlers
  const handleSaveTemplate = async (data, templateId = null) => {
    try {
      if (templateId) {
        await axios.put(`${API}/templates/${templateId}`, data);
        toast.success('Template updated');
      } else {
        await axios.post(`${API}/templates`, data);
        toast.success('Template created');
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to save template');
    }
  };
  
  const handleDeleteTemplate = async (id) => {
    try {
      await axios.delete(`${API}/templates/${id}`);
      toast.success('Template deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete template');
    }
  };
  
  // Pinned graph handlers
  const handlePinGraph = async (data) => {
    try {
      await axios.post(`${API}/pinned-graphs`, data);
      toast.success('Graph pinned to dashboard');
      fetchData();
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error('This graph is already pinned');
      } else {
        toast.error('Failed to pin graph');
      }
    }
  };
  
  const handleUnpinGraph = async (id) => {
    try {
      await axios.delete(`${API}/pinned-graphs/${id}`);
      toast.success('Graph unpinned');
      fetchData();
    } catch (err) {
      toast.error('Failed to unpin graph');
    }
  };
  
  // Alert handlers
  const handleAcknowledgeAlert = async (id) => {
    try {
      await axios.put(`${API}/alerts/${id}/acknowledge`);
      toast.success('Alert acknowledged');
      fetchData();
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    }
  };
  
  const handleDeleteAlert = async (id) => {
    try {
      await axios.delete(`${API}/alerts/${id}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete alert');
    }
  };
  
  const handleClearAlerts = async () => {
    try {
      await axios.delete(`${API}/alerts?acknowledged_only=true`);
      toast.success('Acknowledged alerts cleared');
      fetchData();
    } catch (err) {
      toast.error('Failed to clear alerts');
    }
  };
  
  const handleAcknowledgeAllAlerts = async () => {
    try {
      const res = await axios.put(`${API}/alerts/acknowledge-all`);
      toast.success(`Acknowledged ${res.data.count} alerts`);
      fetchData();
    } catch (err) {
      toast.error('Failed to acknowledge alerts');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">Loading NetGraph Hub...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="App">
      <Toaster 
        position="top-right" 
        richColors 
        toastOptions={{
          style: {
            background: 'hsl(220 25% 5%)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            color: 'hsl(210 40% 96%)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px'
          }
        }}
      />
      <BrowserRouter>
        <MainLayout 
          categories={categories}
          categoryStats={categoryStats}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
        >
          <Routes>
            <Route path="/" element={
              <Dashboard 
                stats={stats} 
                alerts={alerts} 
                devices={devices}
                categories={categories}
                schedulerStatus={schedulerStatus}
                pinnedGraphs={pinnedGraphs}
                onUnpinGraph={handleUnpinGraph}
              />
            } />
            <Route path="/devices" element={
              <DeviceList 
                devices={devices}
                categories={categories}
                activeCategory={activeCategory}
                onAddDevice={handleAddDevice}
                onEditDevice={handleEditDevice}
                onDeleteDevice={handleDeleteDevice}
                onToggleSilence={handleToggleSilence}
                onRefresh={fetchDevices}
              />
            } />
            <Route path="/device/:deviceId" element={
              <DeviceDetail 
                categories={categories}
                pinnedGraphs={pinnedGraphs}
                onPinGraph={handlePinGraph}
                onUnpinGraph={handleUnpinGraph}
              />
            } />
            <Route path="/alerts" element={
              <AlertsPage 
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onAcknowledgeAll={handleAcknowledgeAllAlerts}
                onDelete={handleDeleteAlert}
                onClear={handleClearAlerts}
                onRefresh={fetchData}
              />
            } />
            <Route path="/templates" element={
              <TemplatesPage 
                templates={templates}
                onSave={handleSaveTemplate}
                onDelete={handleDeleteTemplate}
                onRefresh={fetchData}
              />
            } />
          </Routes>
        </MainLayout>
        
        <DeviceDialog 
          open={deviceDialogOpen}
          onOpenChange={setDeviceDialogOpen}
          device={editingDevice}
          categories={categories}
          templates={templates}
          onSave={handleSaveDevice}
          onSaveTemplate={handleSaveTemplate}
        />
        
        <CategoryDialog 
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          onSave={handleSaveCategory}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;
