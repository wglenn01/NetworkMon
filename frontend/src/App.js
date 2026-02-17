import { useEffect, useState, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Activity, Server, Wifi, AlertTriangle, Shield, Home, 
  Plus, Trash2, Edit, RefreshCw, Settings, ChevronRight,
  Router, GitBranch, Radio, Zap, X, Check, Clock, TrendingUp,
  FileText, Copy, Save
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
const Sidebar = ({ categories, activeCategory, setActiveCategory, onAddCategory, onDeleteCategory }) => {
  const navigate = useNavigate();
  
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
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                    data-testid={`delete-category-${cat.name.toLowerCase()}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-border/20">
        <Button 
          variant="outline" 
          className="w-full btn-technical justify-center gap-2"
          onClick={() => axios.post(`${API}/seed`).then(() => { toast.success('Sample data loaded'); window.location.reload(); })}
          data-testid="load-sample-data-btn"
        >
          <RefreshCw className="w-3 h-3" />
          Load Sample Data
        </Button>
      </div>
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
const MetricCard = ({ title, value, unit, icon: Icon, trend, color = "primary" }) => {
  const colorClasses = {
    primary: "text-primary",
    success: "text-emerald-400",
    warning: "text-amber-400",
    error: "text-red-400"
  };
  
  return (
    <Card className="metric-card bg-card/50 border-border/30 backdrop-blur-sm card-hover">
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

// Dashboard Component
const Dashboard = ({ stats, alerts, devices, categories }) => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">Network Overview</h1>
          <p className="text-muted-foreground mt-1">Monitor your infrastructure in real-time</p>
        </div>
        <Button 
          className="btn-technical gap-2"
          onClick={() => axios.post(`${API}/monitoring/poll-all`).then(() => toast.success('Polling all devices...'))}
          data-testid="poll-all-btn"
        >
          <RefreshCw className="w-4 h-4" />
          Poll All
        </Button>
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
        />
        <MetricCard 
          title="Offline" 
          value={stats.offline_devices} 
          icon={AlertTriangle}
          color="error"
        />
        <MetricCard 
          title="Active Alerts" 
          value={stats.active_alerts} 
          icon={Zap}
          color={stats.active_alerts > 0 ? "warning" : "primary"}
        />
      </div>
      
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
                    className="flex items-center justify-between p-3 bg-background/50 border border-border/20 hover:border-primary/30 cursor-pointer"
                    onClick={() => navigate(`/device/${device.id}`)}
                    data-testid={`device-row-${device.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`device-status ${device.status}`} />
                      <div>
                        <p className="font-medium text-sm text-foreground">{device.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{device.ip_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
const DeviceList = ({ devices, categories, activeCategory, onAddDevice, onEditDevice, onDeleteDevice }) => {
  const navigate = useNavigate();
  const filteredDevices = activeCategory && activeCategory !== 'all' 
    ? devices.filter(d => d.category_id === activeCategory)
    : devices;
  
  return (
    <div className="space-y-6 animate-fade-in" data-testid="device-list">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">Devices</h1>
          <p className="text-muted-foreground mt-1">
            {activeCategory && activeCategory !== 'all' 
              ? `Showing ${categories.find(c => c.id === activeCategory)?.name || ''} devices`
              : 'All monitored devices'}
          </p>
        </div>
        <Button className="btn-technical gap-2" onClick={onAddDevice} data-testid="add-device-btn">
          <Plus className="w-4 h-4" />
          Add Device
        </Button>
      </div>
      
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
const DeviceDetail = ({ categories }) => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [monitoringData, setMonitoringData] = useState([]);
  const [latestData, setLatestData] = useState([]);
  const [timeRange, setTimeRange] = useState("24");
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    try {
      const [deviceRes, monitoringRes, latestRes] = await Promise.all([
        axios.get(`${API}/devices/${deviceId}`),
        axios.get(`${API}/monitoring/${deviceId}?hours=${timeRange}`),
        axios.get(`${API}/monitoring/${deviceId}/latest`)
      ]);
      setDevice(deviceRes.data);
      setMonitoringData(monitoringRes.data);
      setLatestData(latestRes.data);
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
        {latestData.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.metric_name}
            value={metric.value?.toFixed(2)}
            unit={metric.unit}
            icon={metric.metric_type === 'ping' ? Wifi : Activity}
            color={metric.metric_type === 'ping' ? 'success' : 'primary'}
          />
        ))}
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
            <CardHeader>
              <CardTitle className="text-lg font-mono">Response Time (ms)</CardTitle>
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
              <CardHeader>
                <CardTitle className="text-lg font-mono">{name}</CardTitle>
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
                  <p className="font-medium text-sm text-foreground">{oid.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{oid.oid}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
const AlertsPage = ({ alerts, onAcknowledge, onDelete, onClear, onRefresh }) => {
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
  const [newOid, setNewOid] = useState({ oid: '', name: '', unit: '', threshold_warning: '', threshold_critical: '' });
  
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
      setNewOid({ oid: '', name: '', unit: '', threshold_warning: '', threshold_critical: '' });
    }
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
            
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {formData.oids.map((oid, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-background/50 border border-border/20">
                    <div className="flex-1 grid grid-cols-5 gap-2 text-xs">
                      <span className="font-mono truncate" title={oid.oid}>{oid.oid}</span>
                      <span>{oid.name}</span>
                      <span>{oid.unit || '-'}</span>
                      <span className="text-amber-400">{oid.threshold_warning || '-'}</span>
                      <span className="text-red-400">{oid.threshold_critical || '-'}</span>
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
                <Input 
                  value={newOid.unit}
                  onChange={(e) => setNewOid(prev => ({ ...prev, unit: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Unit (e.g., %)"
                />
                <Input 
                  value={newOid.threshold_warning}
                  onChange={(e) => setNewOid(prev => ({ ...prev, threshold_warning: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Warning"
                  type="number"
                />
                <Input 
                  value={newOid.threshold_critical}
                  onChange={(e) => setNewOid(prev => ({ ...prev, threshold_critical: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Critical"
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
    community_string: 'public',
    ping_enabled: true,
    snmp_enabled: true,
    polling_interval: 300,
    auto_poll: true,
    oids: []
  });
  const [newOid, setNewOid] = useState({ oid: '', name: '', unit: '', threshold_warning: '', threshold_critical: '' });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBrand, setNewTemplateBrand] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  
  const pollingIntervals = [
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
    { value: 900, label: '15 minutes' },
    { value: 1800, label: '30 minutes' },
    { value: 3600, label: '1 hour' },
  ];
  
  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name,
        ip_address: device.ip_address,
        category_id: device.category_id,
        community_string: device.community_string || 'public',
        ping_enabled: device.ping_enabled ?? true,
        snmp_enabled: device.snmp_enabled ?? true,
        polling_interval: device.polling_interval ?? 300,
        auto_poll: device.auto_poll ?? true,
        oids: device.oids || []
      });
    } else {
      setFormData({
        name: '',
        ip_address: '',
        category_id: categories[0]?.id || '',
        community_string: 'public',
        ping_enabled: true,
        snmp_enabled: true,
        polling_interval: 300,
        auto_poll: true,
        oids: []
      });
    }
    setSelectedTemplate('');
    setShowSaveTemplate(false);
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
      setNewOid({ oid: '', name: '', unit: '', threshold_warning: '', threshold_critical: '' });
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
            
            {/* Existing OIDs */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {formData.oids.map((oid, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-background/50 border border-border/20">
                  <div className="flex-1 grid grid-cols-5 gap-2 text-xs">
                    <span className="font-mono truncate" title={oid.oid}>{oid.oid}</span>
                    <span>{oid.name}</span>
                    <span>{oid.unit || '-'}</span>
                    <span className="text-amber-400">{oid.threshold_warning || '-'}</span>
                    <span className="text-red-400">{oid.threshold_critical || '-'}</span>
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
                <Input 
                  value={newOid.unit}
                  onChange={(e) => setNewOid(prev => ({ ...prev, unit: e.target.value }))}
                  className="input-technical text-xs"
                  placeholder="Unit (e.g., %)"
                />
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
const MainLayout = ({ children, categories, activeCategory, setActiveCategory, onAddCategory, onDeleteCategory }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar 
        categories={categories}
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
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [templates, setTemplates] = useState([]);
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
  
  const fetchData = useCallback(async () => {
    try {
      const [catRes, devRes, alertRes, statsRes, templateRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/devices`),
        axios.get(`${API}/alerts?hours=24`),
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/templates`)
      ]);
      setCategories(catRes.data);
      setDevices(devRes.data);
      setAlerts(alertRes.data);
      setStats(statsRes.data);
      setTemplates(templateRes.data);
      
      // Show toast for new unacknowledged alerts
      const newAlerts = alertRes.data.filter(a => !a.acknowledged);
      if (newAlerts.length > 0 && !loading) {
        newAlerts.slice(0, 3).forEach(alert => {
          if (alert.alert_type.includes('critical') || alert.alert_type === 'device_down') {
            toast.error(alert.message, { duration: 5000 });
          } else if (alert.alert_type.includes('warning')) {
            toast.warning(alert.message, { duration: 4000 });
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);
  
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
  const handleSaveTemplate = async (data) => {
    try {
      await axios.post(`${API}/templates`, data);
      fetchData();
    } catch (err) {
      toast.error('Failed to save template');
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
              />
            } />
            <Route path="/device/:deviceId" element={
              <DeviceDetail categories={categories} />
            } />
            <Route path="/alerts" element={
              <AlertsPage 
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onDelete={handleDeleteAlert}
                onClear={handleClearAlerts}
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
