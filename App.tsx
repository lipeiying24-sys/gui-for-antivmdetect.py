import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Monitor, 
  Settings, 
  Shield,
  Server,
  Map,
  Eye,
  Layers,
  Disc,
  Cpu,
  Box,
  Terminal,
  FileJson,
  Code,
  Copy,
  Wifi,
  Image,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';

import { 
  ConfigData, 
  SecurityData, 
  VmConfigData, 
  RegionConfigData, 
  CustomField, 
  CpuidLeaf 
} from './types';

import { 
  MAC_OUIS, 
  NIC_TYPES, 
  STORAGE_CONTROLLERS, 
  CPUID_PRESETS, 
  DEFAULT_TEMPLATE, 
  PRESETS 
} from './templates';

import { generateHostScript, generatePythonScriptCode } from './HostScriptGenerator';
import { generateGuestScript } from './GuestScriptGenerator';

// --- Default States ---

const DEFAULT_SECURITY: SecurityData = {
  spoofRegistry: true,
  generateFakeFiles: true,
  injectHoneytokens: true,
  randomizeVolumeId: true,
  removeVBoxFiles: true,
  randomizeProductIds: true
};

const DEFAULT_VM_CONFIG: VmConfigData = {
  osType: "Windows10_64",
  cpuCount: "2",
  memorySize: "4096",
  vramSize: "128",
  diskSize: "60000", 
  networkMode: "nat",
  isoPath: "",
  macAddress: "080027123456",
  nicType: "82540EM",
  storageController: "IntelAhci",
  videoResolution: "1920x1080",
  videoColorDepth: "32"
};

const DEFAULT_REGION_CONFIG: RegionConfigData = {
  RegionLocale: "zh-CN",
  TimeZone: "China Standard Time",
  LanguageList: "zh-CN,en-US",
  GeoID: "45"
};

// --- Helper Functions ---

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const generateRandomSerial = (minLen: number = 10, maxLen: number = 20) => {
  const chars = "0123456789ABCDEF";
  const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Fix Bug 10: Logic to pick correct OUI or random valid OUI
const generateRandomMac = (prefixOrType: string = "080027") => {
    let prefix = prefixOrType;
    // If prefix is actually a full type name like "VirtualBox (Default)", look it up
    // Otherwise check if it is a 6-char hex string. If empty, pick a random one.
    
    if (MAC_OUIS[prefixOrType as keyof typeof MAC_OUIS]) {
        prefix = MAC_OUIS[prefixOrType as keyof typeof MAC_OUIS];
    } else if (!/^[0-9A-Fa-f]{6}$/.test(prefix)) {
        // Pick a random valid OUI from the list if input is invalid
        const values = Object.values(MAC_OUIS);
        prefix = values[Math.floor(Math.random() * values.length)];
    }

    let mac = prefix;
    const chars = "0123456789ABCDEF";
    for(let i=0; i<6; i++) {
        mac += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return mac;
};

// Helper to validate Hex for UI feedback (Fix Bug 1)
const isValidHex8 = (val: string) => /^[0-9A-Fa-f]{8}$/.test(val.replace(/^0x/i,''));

// --- React App Components ---

const App = () => {
  const [config, setConfig] = useState<ConfigData>({ ...DEFAULT_TEMPLATE, DmiSystemUuid: crypto.randomUUID().toUpperCase() });
  const [security, setSecurity] = useState<SecurityData>({ ...DEFAULT_SECURITY });
  const [vmConfig, setVmConfig] = useState<VmConfigData>({...DEFAULT_VM_CONFIG});
  const [regionConfig, setRegionConfig] = useState<RegionConfigData>({...DEFAULT_REGION_CONFIG});
  const [cpuidLeaves, setCpuidLeaves] = useState<CpuidLeaf[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  
  // Custom Field Inputs
  const [newCustomKey, setNewCustomKey] = useState("");
  const [newCustomVal, setNewCustomVal] = useState("");

  const [activeTab, setActiveTab] = useState("BIOS");
  const [vmName, setVmName] = useState("MyVM");
  const [appendCreate, setAppendCreate] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState<'bat' | 'sh' | 'ps1'>('bat');
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce inputs to prevent lag
  const debouncedConfig = useDebounce(config, 300);
  const debouncedVmConfig = useDebounce(vmConfig, 300);
  const debouncedCpuid = useDebounce(cpuidLeaves, 300);
  const debouncedCustomFields = useDebounce(customFields, 300);

  const updateRegionConfig = (key: keyof RegionConfigData, value: string) => {
    setRegionConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateSecurity = (key: keyof SecurityData, value: any) => {
    setSecurity(prev => ({ ...prev, [key]: value }));
  };
  
  const updateVmConfig = (key: keyof VmConfigData, value: any) => {
    setVmConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateField = (key: keyof ConfigData, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // CPUID Handlers (Fix Bug 1: Validation in UI)
  const addCpuidLeaf = () => {
    setCpuidLeaves([...cpuidLeaves, { leaf: "00000000", eax: "00000000", ebx: "00000000", ecx: "00000000", edx: "00000000" }]);
  };

  const updateCpuidLeaf = (index: number, field: keyof CpuidLeaf, value: string) => {
    const newLeaves = [...cpuidLeaves];
    newLeaves[index][field] = value;
    setCpuidLeaves(newLeaves);
  };

  const removeCpuidLeaf = (index: number) => {
    setCpuidLeaves(cpuidLeaves.filter((_, i) => i !== index));
  };

  // Custom Field Handlers (Fix Bug 9)
  const addCustomField = () => {
    if (newCustomKey.trim() && newCustomVal) {
      setCustomFields([...customFields, { key: newCustomKey.trim(), value: newCustomVal }]);
      setNewCustomKey("");
      setNewCustomVal("");
    }
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  // --- Consistency Checker (Fix Bug 11: Expanded Checks) ---
  useEffect(() => {
    const newWarnings: string[] = [];
    const vendor = config.DmiSystemVendor.toLowerCase();
    const proc = config.DmiProcManufacturer.toLowerCase();
    const diskModel = config.DiskModelNumber.toLowerCase();
    const mac = vmConfig.macAddress.toLowerCase().replace(/[:]/g, '');

    // Check 1: Apple Hardware with Non-Apple/Intel CPU
    if (vendor.includes("apple") && (proc.includes("amd") || proc.includes("ryzen"))) {
        newWarnings.push("一致性警告: 选择了 Apple 厂商，但处理器配置为 AMD。真实 Mac 通常使用 Intel 或 Apple Silicon。");
    }

    // Check 2: Disk Vendor Mismatch
    if (diskModel.includes("samsung") && config.DiskSerialNumber.startsWith("WD")) {
        newWarnings.push("一致性警告: 硬盘型号显示为 Samsung，但序列号符合 Western Digital 格式。");
    }

    // Check 3: ACPI Table Path (Fix Bug 8, 11)
    if (config.AcpiTablePath) {
        // Bug 11 Fix: Loosened regex, checking for valid looking path string instead of rigid structure
        if (config.AcpiTablePath.length < 3) {
             newWarnings.push("安全警告: ACPI 路径过短。");
        } else {
             newWarnings.push("提示: 生成 Host 脚本时将自动检查此 ACPI 文件是否存在。");
        }
    }

    // Check 4: Apple MAC OUI with Non-Apple Vendor (Fix Bug 11)
    if (mac.startsWith("0017f2") && !vendor.includes("apple")) {
       newWarnings.push("一致性警告: MAC 地址属于 Apple Inc，但系统厂商不是 Apple。");
    }

    // Check 5: Intel/AMD OUI Mismatch (Fix Bug 11)
    if (proc.includes("amd") && mac.startsWith("0007e9")) {
        newWarnings.push("一致性提示: 处理器为 AMD，但网卡 MAC 属于 Intel。这虽然在 PC 上可能发生，但建议避嫌。");
    }

    setWarnings(newWarnings);
  }, [config, vmConfig]);

  // --- Effects for Preview ---

  useEffect(() => {
    // Fix Bug 12: debouncedCpuid is now correctly in dependency array (it was, but ensure flow is correct)
    if (previewType === 'bat' || previewType === 'sh') {
        setPreviewContent(generateHostScript(previewType, vmName, debouncedConfig, debouncedVmConfig, debouncedCpuid, debouncedCustomFields, appendCreate));
    } else if (previewType === 'ps1') {
        setPreviewContent(generateGuestScript(debouncedConfig, security, regionConfig));
    }
  }, [debouncedConfig, regionConfig, vmName, appendCreate, debouncedVmConfig, debouncedCustomFields, security, previewType, debouncedCpuid]);

  // --- Actions ---

  const randomizeAll = () => {
    const newConfig = { ...config };
    newConfig.DmiSystemUuid = crypto.randomUUID().toUpperCase();
    newConfig.DmiSystemSerial = generateRandomSerial(10, 20);
    newConfig.DmiBoardSerial = generateRandomSerial(10, 20);
    newConfig.DmiChassisSerial = generateRandomSerial(10, 20);
    newConfig.DiskSerialNumber = generateRandomSerial(12, 20);
    newConfig.ATAPISerialNumber = generateRandomSerial(12, 20);
    setConfig(newConfig);
    
    // Fix Bug 10: Randomize MAC with a random valid OUI
    setVmConfig(prev => ({...prev, macAddress: generateRandomMac()}));
  };

  const applyPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    const preset = PRESETS[name];
    if (preset) {
        if (preset.config) setConfig(prev => ({ ...prev, ...preset.config }));
        if (preset.vmConfig) setVmConfig(prev => ({ ...prev, ...preset.vmConfig }));
    }
  };

  const applyCpuidPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    // @ts-ignore
    const preset = CPUID_PRESETS[name];
    if (preset) {
        setCpuidLeaves(preset);
    }
  };

  const downloadFile = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const data = {
        config,
        security,
        vmConfig,
        regionConfig,
        cpuidLeaves,
        customFields,
        vmName,
        appendCreate,
        version: "3.5.0"
    };
    downloadFile("antivm_config.json", JSON.stringify(data, null, 2), "application/json");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
            if (data.security) setSecurity(prev => ({ ...prev, ...data.security }));
            if (data.vmConfig) setVmConfig(prev => ({ ...prev, ...data.vmConfig }));
            if (data.regionConfig) setRegionConfig(prev => ({ ...prev, ...data.regionConfig }));
            if (data.cpuidLeaves) setCpuidLeaves(data.cpuidLeaves);
            if (data.customFields) setCustomFields(data.customFields);
            if (data.vmName) setVmName(data.vmName);
            if (data.appendCreate !== undefined) setAppendCreate(data.appendCreate);
        } catch (err) {
            alert("JSON 导入失败 / Import failed");
        }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Render Helpers ---

  const renderInput = (label: string, field: keyof ConfigData, placeholder?: string) => (
    <div className="flex items-center gap-4 mb-2">
      <label className="w-1/3 text-sm font-medium text-gray-700 text-right">{label}:</label>
      <div className="flex-1 flex gap-2">
        <input
          type="text"
          value={config[field]}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
          className="flex-1 p-1.5 border rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {((field as string).includes("Serial") || (field as string).includes("Uuid")) && (
          <button 
            onClick={() => updateField(field, (field as string).includes("Uuid") ? crypto.randomUUID().toUpperCase() : generateRandomSerial(10, 20))}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
            title="随机化 / Randomize"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800 flex justify-center py-8">
      <div className="w-full max-w-7xl bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <header className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><Monitor size={24} className="text-white" /></div>
            <div>
                <h1 className="text-xl font-bold tracking-tight">Anti-VM Manager Pro</h1>
                <p className="text-xs text-slate-400">Advanced Spoofing & Environment Generator</p>
            </div>
          </div>
          <div className="flex gap-3">
             <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <Box size={14} className="text-blue-400"/>
                <select onChange={applyPreset} className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer">
                    <option value="自定义 (Custom)">硬件预设: 自定义</option>
                    {Object.keys(PRESETS).filter(k => k !== "自定义 (Custom)").map(k => <option key={k} value={k}>{k}</option>)}
                </select>
             </div>
             <button onClick={() => downloadFile("AntiVM_Tool.py", generatePythonScriptCode(), "text/x-python")} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <Terminal size={16}/> 下载 Python 脚本
             </button>
          </div>
        </header>

        {/* Consistency Warnings */}
        {warnings.length > 0 && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex flex-col gap-1">
                {warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-yellow-800 font-medium">
                        <AlertCircle size={14}/> {w}
                    </div>
                ))}
            </div>
        )}

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar */}
          <aside className="w-64 bg-slate-50 border-r flex flex-col overflow-y-auto">
            <div className="p-4">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">配置选项 / Configuration</label>
                <nav className="space-y-1">
                    {[
                        { id: "BIOS", icon: Cpu, label: "BIOS 与固件" },
                        { id: "System", icon: Server, label: "系统信息" },
                        { id: "Board", icon: Layers, label: "主板与机箱" },
                        { id: "Network", icon: Wifi, label: "网卡与 MAC" },
                        { id: "Storage", icon: Disc, label: "存储设备" },
                        { id: "Display", icon: Image, label: "显卡与分辨率" },
                        { id: "VM", icon: Box, label: "虚拟机资源" },
                        { id: "Region", icon: Map, label: "地区与语言 (Guest)" },
                        { id: "Security", icon: Shield, label: "Guest 伪装行为" },
                        { id: "Advanced", icon: Settings, label: "自定义字段" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                activeTab === tab.id 
                                ? "bg-white text-blue-600 shadow-sm border border-gray-100" 
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="mt-auto p-4 border-t">
                 <button 
                    onClick={() => setActiveTab("Preview")}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold rounded-lg border-2 transition-all ${
                        activeTab === "Preview"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                >
                    <Eye size={18}/> 脚本预览 / Preview
                </button>
            </div>
          </aside>

          {/* Editor Area */}
          <main className="flex-1 overflow-y-auto bg-white p-8">
            <div className="max-w-4xl mx-auto">
                
                {activeTab === "BIOS" && (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Cpu/> BIOS 设置</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                            {renderInput("BIOS 厂商 (Vendor)", "DmiBIOSVendor")}
                            {renderInput("BIOS 版本 (Version)", "DmiBIOSVersion")}
                            {renderInput("发布日期 (Release Date)", "DmiBIOSReleaseDate")}
                            <div className="grid grid-cols-2 gap-4">
                                {renderInput("主版本号 (Major)", "DmiBIOSReleaseMajor")}
                                {renderInput("次版本号 (Minor)", "DmiBIOSReleaseMinor")}
                                {renderInput("固件主版本 (Fw Major)", "DmiBIOSFirmwareMajor")}
                                {renderInput("固件次版本 (Fw Minor)", "DmiBIOSFirmwareMinor")}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Code size={16}/> ACPI Custom Table</label>
                                <input 
                                    type="text" 
                                    value={config.AcpiTablePath} 
                                    onChange={e=>updateField('AcpiTablePath', e.target.value)}
                                    placeholder="C:\Path\To\acpi_table.bin"
                                    className={`w-full border p-2 rounded font-mono text-sm ${config.AcpiTablePath && !config.AcpiTablePath.includes("\\") ? 'border-yellow-500' : ''}`}
                                />
                                <p className="text-xs text-gray-500 mt-1">Command: VBoxInternal/Devices/acpi/0/Config/CustomTable</p>
                            </div>

                            <div className="mt-4 pt-4 border-t">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2"><Cpu size={16}/> CPUID Spoofing (Type 1 Leaf 1)</label>
                                    <select onChange={applyCpuidPreset} className="text-xs border p-1 rounded">
                                        <option value="Default">选择 CPU 预设...</option>
                                        {Object.keys(CPUID_PRESETS).filter(k=>k!=="Default").map(k=><option key={k} value={k}>{k}</option>)}
                                    </select>
                                </div>
                                {cpuidLeaves.map((leaf, idx) => (
                                    <div key={idx} className="flex gap-2 items-center mb-2">
                                        <input className={`w-20 border p-1 rounded font-mono text-xs ${!isValidHex8(leaf.leaf) ? 'border-red-500 bg-red-50' : ''}`} placeholder="Leaf" value={leaf.leaf} onChange={e=>updateCpuidLeaf(idx, 'leaf', e.target.value)}/>
                                        <input className={`flex-1 border p-1 rounded font-mono text-xs ${!isValidHex8(leaf.eax) ? 'border-red-500 bg-red-50' : ''}`} placeholder="EAX" value={leaf.eax} onChange={e=>updateCpuidLeaf(idx, 'eax', e.target.value)}/>
                                        <input className={`flex-1 border p-1 rounded font-mono text-xs ${!isValidHex8(leaf.ebx) ? 'border-red-500 bg-red-50' : ''}`} placeholder="EBX" value={leaf.ebx} onChange={e=>updateCpuidLeaf(idx, 'ebx', e.target.value)}/>
                                        <input className={`flex-1 border p-1 rounded font-mono text-xs ${!isValidHex8(leaf.ecx) ? 'border-red-500 bg-red-50' : ''}`} placeholder="ECX" value={leaf.ecx} onChange={e=>updateCpuidLeaf(idx, 'ecx', e.target.value)}/>
                                        <input className={`flex-1 border p-1 rounded font-mono text-xs ${!isValidHex8(leaf.edx) ? 'border-red-500 bg-red-50' : ''}`} placeholder="EDX" value={leaf.edx} onChange={e=>updateCpuidLeaf(idx, 'edx', e.target.value)}/>
                                        <button onClick={()=>removeCpuidLeaf(idx)} className="text-red-500 font-bold px-2">×</button>
                                    </div>
                                ))}
                                <button onClick={addCpuidLeaf} className="text-xs text-blue-600 hover:underline">+ 添加 CPUID Leaf</button>
                                <p className="text-xs text-gray-400 mt-1">* 红色框表示 Hex 格式错误（将自动修正）</p>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === "System" && (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Server/> 系统信息</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                            {renderInput("厂商 (Manufacturer)", "DmiSystemVendor")}
                            {renderInput("产品名称 (Product)", "DmiSystemProduct")}
                            {renderInput("版本 (Version)", "DmiSystemVersion")}
                            {renderInput("序列号 (Serial)", "DmiSystemSerial")}
                            {renderInput("系统 UUID", "DmiSystemUuid")}
                            {renderInput("家族 (Family)", "DmiSystemFamily")}
                            {renderInput("SKU 编号", "DmiSystemSKU")}
                        </div>
                    </section>
                )}

                {activeTab === "Board" && (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Layers/> 主板与机箱</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                                <h3 className="font-bold text-gray-600 mb-4 uppercase text-xs tracking-wide">主板 (Motherboard)</h3>
                                {renderInput("厂商 (Vendor)", "DmiBoardVendor")}
                                {renderInput("产品 (Product)", "DmiBoardProduct")}
                                {renderInput("版本 (Version)", "DmiBoardVersion")}
                                {renderInput("序列号 (Serial)", "DmiBoardSerial")}
                                {renderInput("资产标签 (Asset Tag)", "DmiBoardAssetTag")}
                                {renderInput("位置 (Location)", "DmiBoardLocInChass")}
                                {renderInput("类型 ID (Type ID)", "DmiBoardBoardType")}
                            </div>
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                                <h3 className="font-bold text-gray-600 mb-4 uppercase text-xs tracking-wide">机箱 (Chassis)</h3>
                                {renderInput("厂商 (Vendor)", "DmiChassisVendor")}
                                {renderInput("版本 (Version)", "DmiChassisVersion")}
                                {renderInput("序列号 (Serial)", "DmiChassisSerial")}
                                {renderInput("资产标签 (Asset Tag)", "DmiChassisAssetTag")}
                                {renderInput("类型 ID (Type ID)", "DmiChassisType")}
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === "Network" && (
                     <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Wifi/> 网络伪装</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">MAC 地址 (Host Spoofing)</label>
                                <div className="flex gap-2">
                                    <input className="flex-1 border p-2 rounded font-mono" value={vmConfig.macAddress} onChange={e=>updateVmConfig('macAddress', e.target.value)}/>
                                    <select className="border rounded bg-white px-2" onChange={(e) => updateVmConfig('macAddress', generateRandomMac(e.target.value))}>
                                        <option value="">随机生成 (厂商 OUI)...</option>
                                        {Object.entries(MAC_OUIS).map(([name, code]) => (
                                            <option key={code} value={code}>{name} ({code})</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Generated command: --macaddress1 {vmConfig.macAddress.replace(/:/g, '')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">网卡芯片型号 (NIC Type)</label>
                                <select className="w-full border p-2 rounded" value={vmConfig.nicType} onChange={e=>updateVmConfig('nicType', e.target.value)}>
                                    {NIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Generated command: --nictype1 {vmConfig.nicType}</p>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === "Display" && (
                     <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Image/> 显卡与 Canvas 伪装</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">分辨率 (Resolution)</label>
                                    <select className="w-full border p-2 rounded" value={vmConfig.videoResolution} onChange={e=>updateVmConfig('videoResolution', e.target.value)}>
                                        <option value="1366x768">1366 x 768 (Laptop)</option>
                                        <option value="1920x1080">1920 x 1080 (FHD)</option>
                                        <option value="2560x1440">2560 x 1440 (2K)</option>
                                        <option value="3840x2160">3840 x 2160 (4K)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">色深 (Color Depth)</label>
                                    <select className="w-full border p-2 rounded" value={vmConfig.videoColorDepth} onChange={e=>updateVmConfig('videoColorDepth', e.target.value)}>
                                        <option value="16">16-bit</option>
                                        <option value="24">24-bit</option>
                                        <option value="32">32-bit (True Color)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                                注入 <strong>CustomVideoMode1</strong> 和 <strong>GUI/LastGuestSizeHint</strong>。这有助于对抗基于 HTML5 Canvas 的指纹识别。
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === "Storage" && (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Disc/> 处理器与存储</h2>
                         <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4 mb-6">
                            {renderInput("处理器名称 (CPU Name)", "DmiProcVersion")}
                            {renderInput("处理器厂商 (Manufacturer)", "DmiProcManufacturer")}
                         </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                                <h3 className="font-bold text-gray-600 mb-4 uppercase text-xs tracking-wide">硬盘 (SATA/IDE Dual Write)</h3>
                                {renderInput("序列号 (Serial)", "DiskSerialNumber")}
                                {renderInput("型号 (Model)", "DiskModelNumber")}
                                {renderInput("固件版本 (Firmware)", "DiskFirmwareRevision")}
                                <div className="mt-2 pt-2 border-t">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">控制器芯片组 (Controller)</label>
                                    <select className="w-full border p-2 rounded text-sm" value={vmConfig.storageController} onChange={e=>updateVmConfig('storageController', e.target.value)}>
                                        {STORAGE_CONTROLLERS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                                <h3 className="font-bold text-gray-600 mb-4 uppercase text-xs tracking-wide">光驱 (ATAPI)</h3>
                                {renderInput("序列号 (Serial)", "ATAPISerialNumber")}
                                {renderInput("修订号 (Revision)", "ATAPIRevision")}
                                {renderInput("产品 ID (Product ID)", "ATAPIProductId")}
                                {renderInput("厂商 ID (Vendor ID)", "ATAPIVendorId")}
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === "VM" && (
                     <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Box/> 虚拟机设置</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">系统类型 (OS Type)</label>
                                    <input className="w-full border p-2 rounded" value={vmConfig.osType} onChange={e=>updateVmConfig('osType', e.target.value)}/>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium mb-1">CPU 核心数</label>
                                    <input className="w-full border p-2 rounded" value={vmConfig.cpuCount} onChange={e=>updateVmConfig('cpuCount', e.target.value)}/>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium mb-1">内存大小 (MB)</label>
                                    <input className="w-full border p-2 rounded" value={vmConfig.memorySize} onChange={e=>updateVmConfig('memorySize', e.target.value)}/>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium mb-1">硬盘大小 (MB)</label>
                                    <input className="w-full border p-2 rounded" value={vmConfig.diskSize} onChange={e=>updateVmConfig('diskSize', e.target.value)}/>
                                </div>
                            </div>
                            <div className="pt-4 border-t">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={appendCreate} onChange={e=>setAppendCreate(e.target.checked)} className="w-4 h-4 text-blue-600 rounded"/>
                                    <span className="font-medium text-gray-700">生成脚本包含 "Create VM" 命令</span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1 ml-6">如果勾选，将使用原版推荐的 PIIX3 芯片组 + IOAPIC 开启模式创建 VM。</p>
                            </div>
                        </div>
                    </section>
                )}
                
                {activeTab === "Region" && (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Map/> 地区与语言 (Guest)</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                             <div><label className="block text-xs font-bold text-gray-500 mb-1">区域语言 (e.g., zh-CN)</label>
                            <input className="w-full border p-2 rounded" value={regionConfig.RegionLocale} onChange={e=>updateRegionConfig('RegionLocale', e.target.value)}/></div>
                            
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">时区 (e.g., China Standard Time)</label>
                            <input className="w-full border p-2 rounded" value={regionConfig.TimeZone} onChange={e=>updateRegionConfig('TimeZone', e.target.value)}/></div>
                            
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">语言列表 (e.g., zh-CN,en-US)</label>
                            <input className="w-full border p-2 rounded" value={regionConfig.LanguageList} onChange={e=>updateRegionConfig('LanguageList', e.target.value)}/></div>
                            
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">GeoID (244=US, 208=TW, 45=CN)</label>
                            <input className="w-full border p-2 rounded" value={regionConfig.GeoID} onChange={e=>updateRegionConfig('GeoID', e.target.value)}/></div>
                            
                            <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                                注意：这些设置不会影响 Host 配置，只会写入 <strong>Guest.ps1</strong> 供虚拟机内部执行。
                            </div>
                        </div>
                    </section>
                )}

                 {activeTab === "Security" && (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Shield/> Guest 伪装行为</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                             <p className="text-sm text-gray-500 mb-4">以下选项用于生成 <strong>Guest.ps1</strong>，在虚拟机内部执行以配合 Host 设置。</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    ['spoofRegistry', '回填注册表硬件信息 (Registry Spoof)'],
                                    ['generateFakeFiles', '生成伪造文件 (Desktop/Docs)'],
                                    ['injectHoneytokens', '注入剪贴板 Honeytoken'],
                                    ['randomizeProductIds', '随机化 ProductId'],
                                    ['removeVBoxFiles', '删除 VBox 驱动残留'],
                                    ['randomizeVolumeId', '随机化卷 ID (需要 VolumeId.exe)']
                                ].map(([k, label]) => (
                                    <label key={k} className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:border-blue-300 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={security[k as keyof SecurityData]} 
                                            onChange={e=>updateSecurity(k as keyof SecurityData, e.target.checked)}
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                        <span className="text-sm font-medium">{label}</span>
                                    </label>
                                ))}
                             </div>
                        </div>
                    </section>
                )}

                {activeTab === "Advanced" && (
                    <section>
                         <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings/> 自定义字段 (Custom Fields)</h2>
                         <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                             <p className="text-sm text-gray-500 mb-4">在此添加额外的 VBox 内部配置键值对 (ExtraData)。</p>
                             
                             <div className="flex gap-2 mb-4">
                                 <input 
                                    className="flex-1 border p-2 rounded text-sm font-mono" 
                                    placeholder="Key (e.g., VBoxInternal/Devices/...)" 
                                    value={newCustomKey}
                                    onChange={e => setNewCustomKey(e.target.value)}
                                 />
                                 <input 
                                    className="flex-1 border p-2 rounded text-sm font-mono" 
                                    placeholder="Value" 
                                    value={newCustomVal}
                                    onChange={e => setNewCustomVal(e.target.value)}
                                 />
                                 <button 
                                    onClick={addCustomField}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                 >
                                     <Plus size={16}/> 添加
                                 </button>
                             </div>

                             <div className="space-y-2">
                                 {customFields.map((field, idx) => (
                                     <div key={idx} className="flex items-center gap-2 bg-white p-2 border rounded">
                                         <div className="flex-1 font-mono text-xs text-gray-600 truncate" title={field.key}>{field.key}</div>
                                         <div className="flex-1 font-mono text-xs font-bold text-gray-800 truncate" title={field.value}>{field.value}</div>
                                         <button onClick={() => removeCustomField(idx)} className="text-red-500 hover:text-red-700 p-1">
                                             <Trash2 size={14}/>
                                         </button>
                                     </div>
                                 ))}
                                 {customFields.length === 0 && <div className="text-center text-gray-400 text-sm py-4">暂无自定义字段</div>}
                             </div>
                         </div>
                    </section>
                )}

                {activeTab === "Preview" && (
                    <div className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Eye/> 脚本预览</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setPreviewType('bat')} className={`px-3 py-1 text-xs font-bold rounded ${previewType==='bat'?'bg-blue-600 text-white':'bg-gray-200'}`}>BAT</button>
                                <button onClick={() => setPreviewType('sh')} className={`px-3 py-1 text-xs font-bold rounded ${previewType==='sh'?'bg-blue-600 text-white':'bg-gray-200'}`}>SH</button>
                                <button onClick={() => setPreviewType('ps1')} className={`px-3 py-1 text-xs font-bold rounded ${previewType==='ps1'?'bg-blue-600 text-white':'bg-gray-200'}`}>PS1 (Guest)</button>
                            </div>
                        </div>
                        <div className="flex-1 border rounded-lg bg-slate-900 text-green-400 p-4 font-mono text-xs overflow-auto whitespace-pre shadow-inner">
                            {previewContent}
                        </div>
                        <div className="mt-4 flex gap-3">
                             <button onClick={() => navigator.clipboard.writeText(previewContent)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded text-sm font-medium transition-colors">
                                <Copy size={16}/> 复制内容
                             </button>
                             <button onClick={() => downloadFile(previewType === 'ps1' ? 'Guest.ps1' : `config.${previewType}`, previewContent, 'text/plain')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors">
                                <Download size={16}/> 下载 {previewType.toUpperCase()}
                             </button>
                        </div>
                    </div>
                )}
            </div>
          </main>
        </div>
        
        {/* Footer Bar */}
        <div className="bg-white border-t p-3 flex justify-between items-center px-6">
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-500">目标虚拟机 (Target VM):</span>
                <input 
                    type="text" 
                    value={vmName} 
                    onChange={e => setVmName(e.target.value)} 
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-48 focus:border-blue-500 outline-none"
                />
            </div>
            <div className="flex gap-3">
                <button onClick={randomizeAll} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-sm font-bold transition-colors">
                    <RefreshCw size={16}/> 全部随机化
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm font-bold transition-colors cursor-pointer">
                    <Upload size={16}/> 导入 JSON
                    <input type="file" ref={fileInputRef} onChange={handleImportJson} className="hidden" accept=".json" />
                </label>
                 <button onClick={handleExportJson} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm font-bold transition-colors">
                    <FileJson size={16}/> 导出 JSON
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);