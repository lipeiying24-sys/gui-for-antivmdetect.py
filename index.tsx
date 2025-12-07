import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Monitor, 
  Settings, 
  FileText, 
  Shield,
  Server,
  Map,
  Eye,
  Layers,
  Disc,
  Cpu,
  Box,
  Terminal,
  AlertTriangle,
  FileJson,
  Code,
  Copy,
  Wifi,
  Image,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

// --- Constants & Types ---

// OUI Prefixes for MAC Spoofing
const MAC_OUIS = {
  "VirtualBox (Default)": "080027",
  "Intel": "0007E9",
  "Dell": "001422",
  "HP": "001871",
  "Realtek": "00E04C",
  "Cisco": "00000C"
};

const NIC_TYPES = [
  "82540EM", // Intel PRO/1000 MT Desktop
  "82543GC", // Intel PRO/1000 T Server
  "82545EM", // Intel PRO/1000 MT Server
  "Am79C970A", // PCnet-PCI II
  "Am79C973", // PCnet-FAST III
  "virtio-net" // Paravirtualized Network
];

const STORAGE_CONTROLLERS = [
  "IntelAhci",
  "PIIX4",
  "ICH6",
  "PIIX3"
];

const CPUID_PRESETS = {
  "Default": [],
  "Intel IvyBridge": [
    { leaf: "00000001", eax: "000306A9", ebx: "00100800", ecx: "7F9AE3BF", edx: "BFEBFBFF" }
  ],
  "Intel Skylake": [
    { leaf: "00000001", eax: "000506E3", ebx: "00100800", ecx: "7FFAFEBF", edx: "BF-BF-BF" }
  ],
  "AMD Ryzen": [
    { leaf: "00000001", eax: "00800F11", ebx: "00000000", ecx: "00000000", edx: "00000000" } // Simplified example
  ]
};

// Expanded Presets with Hardware Config
const PRESETS = {
  "自定义 (Custom)": {},
  "Dell OptiPlex 7050": {
    config: {
        DmiBIOSVendor: "Dell Inc.",
        DmiBIOSVersion: "1.15.1",
        DmiSystemVendor: "Dell Inc.",
        DmiSystemProduct: "OptiPlex 7050",
        DmiBoardVendor: "Dell Inc.",
        DmiBoardProduct: "0F5C5X",
        DmiChassisVendor: "Dell Inc.",
        DmiProcManufacturer: "Intel(R) Corporation",
        DmiProcVersion: "Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz"
    },
    vmConfig: {
        nicType: "82540EM",
        videoResolution: "1920x1080",
        storageController: "IntelAhci"
    }
  },
  "Lenovo ThinkPad X1": {
    config: {
        DmiBIOSVendor: "LENOVO",
        DmiBIOSVersion: "N2HET45W (1.28 )",
        DmiSystemVendor: "LENOVO",
        DmiSystemProduct: "20QDCTO1WW",
        DmiBoardVendor: "LENOVO",
        DmiBoardProduct: "20QDCTO1WW",
        DmiChassisVendor: "LENOVO",
        DmiProcManufacturer: "Intel(R) Corporation",
        DmiProcVersion: "Intel(R) Core(TM) i7-8565U CPU @ 1.80GHz"
    },
    vmConfig: {
        nicType: "82545EM",
        videoResolution: "2560x1440",
        storageController: "IntelAhci"
    }
  }
};

const DEFAULT_TEMPLATE = {
  // BIOS
  DmiBIOSVendor: "American Megatrends Inc.",
  DmiBIOSVersion: "2.1.0",
  DmiBIOSReleaseDate: "04/18/2022",
  DmiBIOSReleaseMajor: "2",
  DmiBIOSReleaseMinor: "1",
  DmiBIOSFirmwareMajor: "2",
  DmiBIOSFirmwareMinor: "1",
  // System
  DmiSystemVendor: "Micro-Star International Co., Ltd.",
  DmiSystemProduct: "MS-7B89",
  DmiSystemVersion: "1.0",
  DmiSystemSerial: "DefaultString",
  DmiSystemUuid: "", 
  DmiSystemFamily: "Default String",
  DmiSystemSKU: "Default String",
  // Board
  DmiBoardVendor: "Micro-Star International Co., Ltd.",
  DmiBoardProduct: "B450M MORTAR MAX",
  DmiBoardVersion: "1.0",
  DmiBoardSerial: "DefaultString",
  DmiBoardAssetTag: "Default String",
  DmiBoardLocInChass: "Default String",
  DmiBoardBoardType: "10", 
  // Chassis
  DmiChassisVendor: "Micro-Star International Co., Ltd.",
  DmiChassisVersion: "1.0",
  DmiChassisType: "3", 
  DmiChassisSerial: "DefaultString",
  DmiChassisAssetTag: "Default String",
  // Processor
  DmiProcManufacturer: "AMD",
  DmiProcVersion: "AMD Ryzen 5 3600 6-Core Processor",
  // OEM (Type 11)
  DmiOEMVBoxVer: "string:6.1.0",
  DmiOEMVBoxRev: "string:1.0",
  // Disk (AHCI + PIIX3)
  DiskSerialNumber: "S1D5N10B23",
  DiskModelNumber: "Samsung SSD 860 EVO 500GB",
  DiskFirmwareRevision: "RVT0",
  // CDROM (ATAPI)
  ATAPISerialNumber: "DefaultString",
  ATAPIRevision: "1.0",
  ATAPIProductId: "CD-ROM Drive",
  ATAPIVendorId: "VBOX",
  // ACPI
  AcpiTablePath: "" 
};

const DEFAULT_SECURITY = {
  spoofRegistry: true,      // 写入 HKLM 注册表 (BIOS/CPU/Disk)
  generateFakeFiles: true,  // 生成 Desktop/Documents 伪装文件
  injectHoneytokens: true,  // 注入剪贴板 Honeytoken
  randomizeVolumeId: true,  // 随机化卷序列号
  removeVBoxFiles: true,    // 清理 VBox 驱动文件
  randomizeProductIds: true // 随机化 Windows ProductID
};

const DEFAULT_VM_CONFIG = {
  osType: "Windows10_64",
  cpuCount: "2",
  memorySize: "4096",
  vramSize: "128",
  diskSize: "60000", 
  networkMode: "nat",
  isoPath: "",
  // New Fields
  macAddress: "080027123456",
  nicType: "82540EM",
  storageController: "IntelAhci",
  videoResolution: "1920x1080",
  videoColorDepth: "32"
};

const DEFAULT_REGION_CONFIG = {
  RegionLocale: "zh-CN",
  TimeZone: "China Standard Time",
  LanguageList: "zh-CN,en-US",
  GeoID: "45"
};

type ConfigData = typeof DEFAULT_TEMPLATE;
type SecurityData = typeof DEFAULT_SECURITY;
type VmConfigData = typeof DEFAULT_VM_CONFIG;
type RegionConfigData = typeof DEFAULT_REGION_CONFIG;
type CustomField = { key: string; value: string };
type CpuidLeaf = { leaf: string; eax: string; ebx: string; ecx: string; edx: string };

// --- Python Script Template (Updated to match functionality) ---
const generatePythonScriptCode = () => `#!/usr/bin/python3
# AntiVM Detection Tool - WebGUI Generated
# Based on antivmdetect.py by nsmfoo

import sys
import os
import subprocess
import uuid
import random
import re

VERSION = "WebGUI-Compat-1.1"

def generate_script(vm_name, config, filename):
    script_content = []
    
    if filename.endswith(".bat"):
        script_content.append("@echo off")
        script_content.append(f"echo Configuring VM: {vm_name}...")
        pre = f'VBoxManage setextradata "{vm_name}"'
        cmt = "REM"
        pause = "pause"
    else:
        script_content.append("#!/bin/bash")
        script_content.append(f"echo 'Configuring VM: {vm_name}...'")
        pre = f'VBoxManage setextradata "{vm_name}"'
        cmt = "#"
        pause = ""

    script_content.append(f"{cmt} --- DMI Configuration ---")
    for key, val in config.items():
        if key.startswith("VBoxInternal"):
            script_content.append(f'{pre} "{key}" "{val}"')
            
    if pause: script_content.append(pause)
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write("\\n".join(script_content))
    print(f"Script saved to {filename}")

if __name__ == "__main__":
    print(f"--- AntiVM Tool v{VERSION} ---")
    pass
`;

// --- Helper Functions ---

const generateRandomSerial = (minLen: number = 10, maxLen: number = 20) => {
  const chars = "0123456789ABCDEF";
  const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateRandomMac = (oui: string = "080027") => {
    let mac = oui;
    const chars = "0123456789ABCDEF";
    for(let i=0; i<6; i++) {
        mac += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return mac;
};

// --- React App Components ---

const App = () => {
  const [config, setConfig] = useState<ConfigData>({ ...DEFAULT_TEMPLATE, DmiSystemUuid: crypto.randomUUID().toUpperCase() });
  const [security, setSecurity] = useState<SecurityData>({ ...DEFAULT_SECURITY });
  const [vmConfig, setVmConfig] = useState<VmConfigData>({...DEFAULT_VM_CONFIG});
  const [regionConfig, setRegionConfig] = useState<RegionConfigData>({...DEFAULT_REGION_CONFIG});
  const [cpuidLeaves, setCpuidLeaves] = useState<CpuidLeaf[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [activeTab, setActiveTab] = useState("BIOS");
  const [vmName, setVmName] = useState("MyVM");
  const [appendCreate, setAppendCreate] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState<'bat' | 'sh' | 'ps1'>('bat');
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- Consistency Checker ---
  useEffect(() => {
    const newWarnings: string[] = [];
    const vendor = config.DmiSystemVendor.toLowerCase();
    const proc = config.DmiProcManufacturer.toLowerCase();
    const diskModel = config.DiskModelNumber.toLowerCase();

    // Logic Check 1: Apple Hardware with Non-Apple CPU
    if (vendor.includes("apple") && (proc.includes("amd") || proc.includes("ryzen"))) {
        newWarnings.push("一致性警告: 选择了 Apple 厂商，但处理器配置为 AMD。真实 Mac 通常使用 Intel 或 Apple Silicon。");
    }

    // Logic Check 2: Disk Vendor Mismatch
    if (diskModel.includes("samsung") && config.DiskSerialNumber.startsWith("WD")) {
        newWarnings.push("一致性警告: 硬盘型号显示为 Samsung，但序列号似乎符合 Western Digital 格式。");
    }

    // Logic Check 3: UUID Format
    if (config.DmiSystemUuid && !/^[0-9A-F-]{36}$/i.test(config.DmiSystemUuid)) {
        newWarnings.push("格式警告: 系统 UUID 似乎不符合标准格式 (8-4-4-4-12)。");
    }

    setWarnings(newWarnings);
  }, [config, vmConfig]);


  // --- CORE LOGIC: Host Script Generation (BAT/SH) ---

  const getHardwareScript = (type: 'bat' | 'sh') => {
    const lines: string[] = [];
    const isBat = type === 'bat';
    const cmt = isBat ? "REM" : "#";
    // Handle spaces in VM name correctly
    const vmRef = `"${vmName}"`; 
    const pre = `VBoxManage setextradata ${vmRef}`;
    const mod = `VBoxManage modifyvm ${vmRef}`;
    const now = new Date().toLocaleString();

    if (isBat) {
        lines.push("@echo off");
        lines.push(`${cmt} Generated by AntiVM WebGUI (antivmdetect.py compatible)`);
        lines.push(`${cmt} Timestamp: ${now}`);
        lines.push(`echo Configuring VM: ${vmName}...`);
        
        // [FIX] Robust Windows check using variable to handle spaces
        lines.push(`set "VM_NAME=${vmName}"`);
        lines.push(`VBoxManage list vms | findstr /C:"\\"%VM_NAME%\\"" >nul`);
        lines.push(`if %errorlevel% neq 0 ( echo [ERROR] VM "${vmName}" not found! & pause & exit /b )`);
    } else {
        lines.push("#!/bin/bash");
        lines.push(`${cmt} Generated by AntiVM WebGUI (antivmdetect.py compatible)`);
        lines.push(`${cmt} Timestamp: ${now}`);
        lines.push(`echo "Configuring VM: ${vmName}..."`);
        
        // [FIX] Robust Linux check using grep fixed string
        lines.push(`if ! VBoxManage list vms | grep -Fq "\\"^${vmName}\\"""; then echo "[ERROR] VM '${vmName}' not found!"; exit 1; fi`);
    }
    lines.push("");

    if (appendCreate) {
        lines.push(`${cmt} --- Create VM (Updated for spoofing) ---`);
        lines.push(`VBoxManage createvm --name ${vmRef} --ostype "${vmConfig.osType}" --register`);
        
        // [FIX] Logic to determine Bus Type and Chipset based on Controller selection
        const isIde = ["PIIX3", "PIIX4", "ICH6"].includes(vmConfig.storageController);
        const busType = isIde ? "ide" : "sata";
        // Use piix3 chipset for legacy/IDE compatibility, or ich9 for SATA default.
        // Also ensure firmware is BIOS for pcbios DMI spoofing.
        const chipset = isIde ? "piix3" : "ich9"; 
        
        // [FIX] Added --firmware bios
        lines.push(`VBoxManage modifyvm ${vmRef} --memory ${vmConfig.memorySize} --cpus ${vmConfig.cpuCount} --nic1 ${vmConfig.networkMode} --vram ${vmConfig.vramSize} --chipset ${chipset} --firmware bios --ioapic on --paravirtprovider default --audio none`);
        
        if (vmConfig.diskSize) {
             const diskCmd = `VBoxManage createhd --filename "${vmName}.vdi" --size ${vmConfig.diskSize}`;
             lines.push(diskCmd);
             
             // [FIX] Use correct bus type (sata vs ide)
             lines.push(`VBoxManage storagectl ${vmRef} --name "MainStorage" --add ${busType} --controller ${vmConfig.storageController}`);
             
             // [FIX] Attach to correct port/device. 
             // IDE: port 0 device 0 (Primary Master). SATA: port 0 device 0.
             lines.push(`VBoxManage storageattach ${vmRef} --storagectl "MainStorage" --port 0 --device 0 --type hdd --medium "${vmName}.vdi"`);
        }
        lines.push("");
    }

    lines.push(`${cmt} --- Hardware Spoofing (New Features) ---`);
    // MAC Address
    if (vmConfig.macAddress) {
        lines.push(`${mod} --macaddress1 ${vmConfig.macAddress.replace(/:/g, '')}`);
    }
    // NIC Type
    if (vmConfig.nicType) {
        lines.push(`${mod} --nictype1 ${vmConfig.nicType}`);
    }
    // CPUID Spoofing
    if (cpuidLeaves.length > 0) {
        lines.push(`${cmt} CPUID Leaves`);
        cpuidLeaves.forEach(leaf => {
            // [FIX] Sanitize CPUID values (remove 0x prefix)
            const clean = (val: string) => val.replace(/^0x/i, '');
            lines.push(`${mod} --cpuidset ${clean(leaf.leaf)} ${clean(leaf.eax)} ${clean(leaf.ebx)} ${clean(leaf.ecx)} ${clean(leaf.edx)}`);
        });
    }

    lines.push(`${cmt} --- Display & Canvas Spoofing ---`);
    // Video Mode & Resolution
    if (vmConfig.videoResolution) {
        const [w, h] = vmConfig.videoResolution.split('x');
        const depth = vmConfig.videoColorDepth || "32";
        lines.push(`${pre} "CustomVideoMode1" "${vmConfig.videoResolution}x${depth}"`);
        lines.push(`${pre} "GUI/LastGuestSizeHint" "${w},${h}"`);
    }

    lines.push("");
    lines.push(`${cmt} --- DMI Configuration (Type 0, 1, 2, 3, 4, 11) ---`);
    
    // 1. DMI Fields Mapping
    const DMI_MAP: Array<[string, keyof ConfigData]> = [
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBIOSVendor", "DmiBIOSVendor"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBIOSVersion", "DmiBIOSVersion"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBIOSReleaseDate", "DmiBIOSReleaseDate"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBIOSReleaseMajor", "DmiBIOSReleaseMajor"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBIOSReleaseMinor", "DmiBIOSReleaseMinor"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBIOSFirmwareMajor", "DmiBIOSFirmwareMajor"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBIOSFirmwareMinor", "DmiBIOSFirmwareMinor"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiSystemVendor", "DmiSystemVendor"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiSystemProduct", "DmiSystemProduct"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiSystemVersion", "DmiSystemVersion"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiSystemSerial", "DmiSystemSerial"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiSystemUuid", "DmiSystemUuid"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiSystemFamily", "DmiSystemFamily"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiSystemSKU", "DmiSystemSKU"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBoardVendor", "DmiBoardVendor"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBoardProduct", "DmiBoardProduct"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBoardVersion", "DmiBoardVersion"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBoardSerial", "DmiBoardSerial"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBoardAssetTag", "DmiBoardAssetTag"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBoardLocInChass", "DmiBoardLocInChass"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiBoardBoardType", "DmiBoardBoardType"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiChassisVendor", "DmiChassisVendor"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiChassisVersion", "DmiChassisVersion"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiChassisType", "DmiChassisType"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiChassisSerial", "DmiChassisSerial"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiChassisAssetTag", "DmiChassisAssetTag"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiProcManufacturer", "DmiProcManufacturer"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiProcVersion", "DmiProcVersion"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiOEMVBoxVer", "DmiOEMVBoxVer"],
        ["VBoxInternal/Devices/pcbios/0/Config/DmiOEMVBoxRev", "DmiOEMVBoxRev"],
    ];

    const STRING_FIELDS = new Set([
        "DmiBIOSVendor", "DmiBIOSVersion", "DmiBIOSReleaseDate",
        "DmiSystemVendor", "DmiSystemProduct", "DmiSystemVersion", "DmiSystemSerial", "DmiSystemFamily", "DmiSystemSKU",
        "DmiBoardVendor", "DmiBoardProduct", "DmiBoardVersion", "DmiBoardSerial", "DmiBoardAssetTag", "DmiBoardLocInChass",
        "DmiChassisVendor", "DmiChassisVersion", "DmiChassisSerial", "DmiChassisAssetTag",
        "DmiProcManufacturer", "DmiProcVersion",
        "DmiOEMVBoxVer", "DmiOEMVBoxRev"
    ]);

    for (const [path, key] of DMI_MAP) {
        let val = config[key];
        if (!val) continue; 
        if (STRING_FIELDS.has(key) && !val.startsWith("string:") && !val.includes("**")) {
            val = `string:${val}`;
        }
        lines.push(`${pre} "${path}" "${val}"`);
    }

    // 2. Storage Spoofing (Dual Controller)
    lines.push("");
    lines.push(`${cmt} --- Storage Controllers (Dual Write) ---`);
    
    const diskFields = [
        ["SerialNumber", config.DiskSerialNumber],
        ["ModelNumber", config.DiskModelNumber],
        ["FirmwareRevision", config.DiskFirmwareRevision]
    ];
    
    // Write to both possible controller locations
    const diskPrefixes = [
        "VBoxInternal/Devices/ahci/0/Config/Port0/",
        "VBoxInternal/Devices/piix3ide/0/Config/PrimaryMaster/"
    ];
    diskPrefixes.forEach(p => {
        diskFields.forEach(([k, v]) => {
            if(v) lines.push(`${pre} "${p}${k}" "${v}"`);
        });
    });

    const cdFields = [
        ["ATAPISerialNumber", config.ATAPISerialNumber],
        ["ATAPIRevision", config.ATAPIRevision],
        ["ATAPIProductId", config.ATAPIProductId],
        ["ATAPIVendorId", config.ATAPIVendorId]
    ];
    const cdPrefixes = [
        "VBoxInternal/Devices/ahci/0/Config/Port1/",
        "VBoxInternal/Devices/piix3ide/0/Config/PrimarySlave/"
    ];
    cdPrefixes.forEach(p => {
        cdFields.forEach(([k, v]) => {
            if(v) lines.push(`${pre} "${p}${k}" "${v}"`);
        });
    });

    // 3. ACPI / DSDT
    if (config.AcpiTablePath) {
        lines.push("");
        lines.push(`${cmt} --- ACPI Custom Table ---`);
        lines.push(`${pre} "VBoxInternal/Devices/acpi/0/Config/CustomTable" "${config.AcpiTablePath}"`);
    }

    // 4. Custom Fields
    if (customFields.length > 0) {
        lines.push("");
        lines.push(`${cmt} --- Custom Fields ---`);
        customFields.forEach(f => lines.push(`${pre} "${f.key}" "${f.value}"`));
    }

    if (appendCreate) {
        lines.push("");
        lines.push(`${cmt} --- Start VM ---`);
        lines.push(`VBoxManage startvm ${vmRef}`);
    }

    if (isBat) lines.push("pause");
    return lines.join("\n");
  };

  // --- CORE LOGIC: Guest Script Generation (PS1) ---

  const getGuestPs1 = () => {
    const now = new Date().toLocaleString();
    return `# AntiVM Guest Script - Generated by AntiVM WebGUI
# Behavior Compatible with antivmdetect.py ecosystem
# Generated at ${now}

Write-Host "Starting Anti-VM Configuration..." -ForegroundColor Cyan

# --- 1. Registry Spoofing (Hardened) ---
Write-Host "[-] Spoofing Registry Hardware Keys..."

# 1.1 BIOS & System
$RegBios = "HKLM:\\HARDWARE\\DESCRIPTION\\System\\BIOS"
if (Test-Path $RegBios) {
    Set-ItemProperty -Path $RegBios -Name "SystemBiosVersion" -Value "${config.DmiBIOSVendor} - ${config.DmiBIOSVersion}" -Force
    Set-ItemProperty -Path $RegBios -Name "VideoBiosVersion" -Value "${config.DmiBIOSVersion}" -Force
    Set-ItemProperty -Path $RegBios -Name "SystemBiosDate" -Value "${config.DmiBIOSReleaseDate}" -Force
}

$RegSys = "HKLM:\\HARDWARE\\DESCRIPTION\\System"
if (Test-Path $RegSys) {
    Set-ItemProperty -Path $RegSys -Name "SystemBiosVersion" -Value "${config.DmiBIOSVendor} - ${config.DmiBIOSVersion}" -Force
    Set-ItemProperty -Path $RegSys -Name "VideoBiosVersion" -Value "${config.DmiBIOSVersion}" -Force
    Set-ItemProperty -Path $RegSys -Name "SystemBiosDate" -Value "${config.DmiBIOSReleaseDate}" -Force
}

# 1.2 CPU (CentralProcessor)
$RegCpu = "HKLM:\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0"
if (Test-Path $RegCpu) {
    Set-ItemProperty -Path $RegCpu -Name "ProcessorNameString" -Value "${config.DmiProcVersion}" -Force
    Set-ItemProperty -Path $RegCpu -Name "Identifier" -Value "${config.DmiProcManufacturer} Family 6 Model 142 Stepping 10" -Force
    Set-ItemProperty -Path $RegCpu -Name "VendorIdentifier" -Value "${config.DmiProcManufacturer}" -Force
}

# 1.3 SCSI/HDD Identifier
$RegScsi = "HKLM:\\HARDWARE\\DEVICEMAP\\Scsi\\Scsi Port 0\\Scsi Bus 0\\Target Id 0\\Logical Unit Id 0"
if (Test-Path $RegScsi) {
    Set-ItemProperty -Path $RegScsi -Name "Identifier" -Value "${config.DiskModelNumber}" -Force
    Set-ItemProperty -Path $RegScsi -Name "SerialNumber" -Value "${config.DiskSerialNumber}" -Force
}

# --- 2. Randomize Product IDs ---
${security.randomizeProductIds ? `
Write-Host "[-] Randomizing ProductId..."
$RegNT = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion"
if (Test-Path $RegNT) {
    $rand = Get-Random -Minimum 100000000 -Maximum 999999999
    Set-ItemProperty -Path $RegNT -Name "ProductId" -Value "00330-80000-00000-$rand" -Force
}
` : '# ProductID Randomization skipped'}

# --- 3. Fake Files Generator ---
${security.generateFakeFiles ? `
Write-Host "[-] Generating Fake User Activity..."
$desktop = [Environment]::GetFolderPath("Desktop")
$docs = [Environment]::GetFolderPath("MyDocuments")
for ($i=0; $i -lt 5; $i++) {
    $name = [System.IO.Path]::GetRandomFileName().Split(".")[0]
    $content = [System.Convert]::ToBase64String([System.Guid]::NewGuid().ToByteArray())
    Set-Content -Path "$desktop\\$name.txt" -Value "Project Notes $content"
    Set-Content -Path "$docs\\$name.docx" -Value "Confidential $content"
}
` : '# Fake file generation skipped'}

# --- 4. Honeytokens ---
${security.injectHoneytokens ? `
Write-Host "[-] Injecting Clipboard Honeytokens..."
Set-Clipboard -Value "password123"
` : '# Honeytokens skipped'}

# --- 5. VBox Cleanup ---
${security.removeVBoxFiles ? `
Write-Host "[-] Removing VirtualBox Artifacts..."
$Drivers = @("VBoxMouse.sys", "VBoxGuest.sys", "VBoxSF.sys", "VBoxVideo.sys")
foreach ($drv in $Drivers) {
    $path = "C:\\Windows\\System32\\drivers\\$drv"
    if (Test-Path $path) { Remove-Item $path -Force -ErrorAction SilentlyContinue }
}
` : '# VBox Cleanup skipped'}

# --- 6. Region (Guest Environment) ---
Write-Host "[-] Setting Region: ${regionConfig.RegionLocale}..."
Set-WinSystemLocale -SystemLocale "${regionConfig.RegionLocale}"
Set-TimeZone -Id "${regionConfig.TimeZone}"
Set-WinUserLanguageList -LanguageList "${regionConfig.LanguageList}" -Force
Set-WinHomeLocation -GeoId ${regionConfig.GeoID}

Write-Host "[+] Configuration Complete. Please REBOOT." -ForegroundColor Green
Start-Sleep -Seconds 3
`;
  };

  // --- Effects ---

  useEffect(() => {
    if (previewType === 'bat') setPreviewContent(getHardwareScript('bat'));
    if (previewType === 'sh') setPreviewContent(getHardwareScript('sh'));
    if (previewType === 'ps1') setPreviewContent(getGuestPs1());
  }, [config, regionConfig, vmName, appendCreate, vmConfig, customFields, security, previewType, cpuidLeaves]);

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
    
    // Randomize MAC too
    setVmConfig(prev => ({...prev, macAddress: generateRandomMac("001422")}));
  };

  const applyPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    // @ts-ignore
    const preset = PRESETS[name];
    if (preset) {
        if (preset.config) setConfig(prev => ({ ...prev, ...preset.config }));
        if (preset.vmConfig) setVmConfig(prev => ({ ...prev, ...preset.vmConfig }));
        if (preset.regionConfig) setRegionConfig(prev => ({ ...prev, ...preset.regionConfig }));
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
        version: "3.4.0"
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
        {(field.includes("Serial") || field.includes("Uuid")) && (
          <button 
            onClick={() => updateField(field, field.includes("Uuid") ? crypto.randomUUID().toUpperCase() : generateRandomSerial(10, 20))}
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
                                    className="w-full border p-2 rounded font-mono text-sm"
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
                                        <input className="w-20 border p-1 rounded font-mono text-xs" placeholder="Leaf" value={leaf.leaf} onChange={e=>updateCpuidLeaf(idx, 'leaf', e.target.value)}/>
                                        <input className="flex-1 border p-1 rounded font-mono text-xs" placeholder="EAX" value={leaf.eax} onChange={e=>updateCpuidLeaf(idx, 'eax', e.target.value)}/>
                                        <input className="flex-1 border p-1 rounded font-mono text-xs" placeholder="EBX" value={leaf.ebx} onChange={e=>updateCpuidLeaf(idx, 'ebx', e.target.value)}/>
                                        <input className="flex-1 border p-1 rounded font-mono text-xs" placeholder="ECX" value={leaf.ecx} onChange={e=>updateCpuidLeaf(idx, 'ecx', e.target.value)}/>
                                        <input className="flex-1 border p-1 rounded font-mono text-xs" placeholder="EDX" value={leaf.edx} onChange={e=>updateCpuidLeaf(idx, 'edx', e.target.value)}/>
                                        <button onClick={()=>removeCpuidLeaf(idx)} className="text-red-500 font-bold px-2">×</button>
                                    </div>
                                ))}
                                <button onClick={addCpuidLeaf} className="text-xs text-blue-600 hover:underline">+ 添加 CPUID Leaf</button>
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
                         <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings/> 自定义字段</h2>
                         <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 text-center text-gray-500">
                            <p>自定义字段将直接附加到脚本末尾。</p>
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
                                <button onClick={() => setPreviewType('ps1')} className={`px-3 py-1 text-xs font-bold rounded ${previewType==='ps1'?'bg-blue-600 text-white':'bg-gray-200'}`}>PS1</button>
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