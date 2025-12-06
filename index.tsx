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
  HardDrive
} from 'lucide-react';

// --- Constants & Types ---

const PRESETS = {
  "自定义 (Custom)": {},
  "Dell OptiPlex 7050": {
    DmiBIOSVendor: "Dell Inc.",
    DmiBIOSVersion: "1.15.1",
    DmiSystemVendor: "Dell Inc.",
    DmiSystemProduct: "OptiPlex 7050",
    DmiBoardVendor: "Dell Inc.",
    DmiBoardProduct: "0F5C5X",
    DmiChassisVendor: "Dell Inc.",
    DmiProcManufacturer: "Intel(R) Corporation",
    DmiProcVersion: "Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz"
  }
};

// 字段命名完全对齐 antivmdetect.py 的逻辑需求
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

// 这里的 Security 选项已重构为 antivmdetection 原项目相关的伪装行为
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
  isoPath: ""
};

// 保留 Region 配置作为附加功能，但不干扰核心逻辑
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

VERSION = "WebGUI-Compat-1.0"

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

// --- React App Components ---

const App = () => {
  const [config, setConfig] = useState<ConfigData>({ ...DEFAULT_TEMPLATE, DmiSystemUuid: crypto.randomUUID().toUpperCase() });
  const [security, setSecurity] = useState<SecurityData>({ ...DEFAULT_SECURITY });
  const [vmConfig, setVmConfig] = useState<VmConfigData>({...DEFAULT_VM_CONFIG});
  const [regionConfig, setRegionConfig] = useState<RegionConfigData>({...DEFAULT_REGION_CONFIG});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [activeTab, setActiveTab] = useState("BIOS");
  const [vmName, setVmName] = useState("MyVM");
  const [appendCreate, setAppendCreate] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState<'bat' | 'sh' | 'ps1'>('bat');
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

  // --- CORE LOGIC: Host Script Generation (BAT/SH) ---

  const getHardwareScript = (type: 'bat' | 'sh') => {
    const lines: string[] = [];
    const isBat = type === 'bat';
    const cmt = isBat ? "REM" : "#";
    // Handle spaces in VM name correctly
    const vmRef = isBat ? `"${vmName}"` : `"${vmName}"`; 
    const pre = `VBoxManage setextradata ${vmRef}`;
    const now = new Date().toLocaleString();

    if (isBat) {
        lines.push("@echo off");
        lines.push(`${cmt} Generated by AntiVM WebGUI (antivmdetect.py compatible)`);
        lines.push(`${cmt} Timestamp: ${now}`);
        lines.push(`echo Configuring VM: ${vmName}...`);
        // Fixed: Robust Windows check using literal string search to handle spaces
        lines.push(`VBoxManage list vms | findstr /C:"\\"${vmName}\\"" >nul`);
        lines.push(`if %errorlevel% neq 0 ( echo [ERROR] VM "${vmName}" not found! & pause & exit /b )`);
    } else {
        lines.push("#!/bin/bash");
        lines.push(`${cmt} Generated by AntiVM WebGUI (antivmdetect.py compatible)`);
        lines.push(`${cmt} Timestamp: ${now}`);
        lines.push(`echo "Configuring VM: ${vmName}..."`);
        // Fixed: Linux grep check for exact match
        lines.push(`if ! VBoxManage list vms | grep -q "\\"^${vmName}\\"""; then echo "[ERROR] VM '${vmName}' not found!"; exit 1; fi`);
    }
    lines.push("");

    if (appendCreate) {
        lines.push(`${cmt} --- Create VM (antivmdetect compatible settings) ---`);
        // Original creates with PIIX3 and IOAPIC on
        lines.push(`VBoxManage createvm --name ${vmRef} --ostype "${vmConfig.osType}" --register`);
        lines.push(`VBoxManage modifyvm ${vmRef} --memory ${vmConfig.memorySize} --cpus ${vmConfig.cpuCount} --nic1 ${vmConfig.networkMode} --vram ${vmConfig.vramSize} --chipset piix3 --ioapic on --paravirtprovider default --audio none`);
        if (vmConfig.diskSize) {
             const diskCmd = `VBoxManage createhd --filename "${vmName}.vdi" --size ${vmConfig.diskSize}`;
             lines.push(diskCmd);
             // Create BOTH SATA and IDE controllers to match storage spoofing logic
             lines.push(`VBoxManage storagectl ${vmRef} --name "SATA" --add sata --controller IntelAHCI`);
             lines.push(`VBoxManage storageattach ${vmRef} --storagectl "SATA" --port 0 --device 0 --type hdd --medium "${vmName}.vdi"`);
             lines.push(`VBoxManage storagectl ${vmRef} --name "IDE" --add ide --controller PIIX4`);
        }
        lines.push("");
    }

    lines.push(`${cmt} --- DMI Configuration (Type 0, 1, 2, 3, 4, 11) ---`);
    
    // 1. DMI Fields Mapping
    // This map ensures we output the exact keys expected by VBoxInternal
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

    // FIX A1: Strict string prefix logic based on antivmdetect.py
    // Numeric fields (Major/Minor/Type) are excluded.
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
        if (!val) continue; // Skip empty fields

        // Logic: If field is in String List AND doesn't already start with string:, add it.
        // We also allow the user to manually type "string:" without double-prefixing.
        if (STRING_FIELDS.has(key) && !val.startsWith("string:") && !val.includes("**")) {
            val = `string:${val}`;
        }
        lines.push(`${pre} "${path}" "${val}"`);
    }

    // 2. Storage Spoofing (Dual Controller: AHCI + PIIX3)
    // FIX A3: Write to both controllers to ensure compatibility
    lines.push("");
    lines.push(`${cmt} --- Storage Controllers (AHCI + PIIX3) ---`);
    
    // FIX: Field names matched to antivmdetect.py requirements
    const diskFields = [
        ["SerialNumber", config.DiskSerialNumber],
        ["ModelNumber", config.DiskModelNumber],
        ["FirmwareRevision", config.DiskFirmwareRevision] // Key name is FirmwareRevision, not Revision
    ];
    
    // Write to AHCI Port 0 AND PIIX3 PrimaryMaster
    const diskPrefixes = [
        "VBoxInternal/Devices/ahci/0/Config/Port0/",
        "VBoxInternal/Devices/piix3ide/0/Config/PrimaryMaster/"
    ];
    diskPrefixes.forEach(p => {
        diskFields.forEach(([k, v]) => {
            if(v) lines.push(`${pre} "${p}${k}" "${v}"`);
        });
    });

    // CDROM
    // FIX: Field names matched to antivmdetect.py requirements
    const cdFields = [
        ["ATAPISerialNumber", config.ATAPISerialNumber],
        ["ATAPIRevision", config.ATAPIRevision],
        ["ATAPIProductId", config.ATAPIProductId],
        ["ATAPIVendorId", config.ATAPIVendorId]
    ];
    // Write to AHCI Port 1 AND PIIX3 PrimarySlave
    const cdPrefixes = [
        "VBoxInternal/Devices/ahci/0/Config/Port1/",
        "VBoxInternal/Devices/piix3ide/0/Config/PrimarySlave/"
    ];
    cdPrefixes.forEach(p => {
        cdFields.forEach(([k, v]) => {
            if(v) lines.push(`${pre} "${p}${k}" "${v}"`);
        });
    });

    // 3. ACPI / DSDT (FIX A4)
    if (config.AcpiTablePath) {
        lines.push("");
        lines.push(`${cmt} --- ACPI Custom Table ---`);
        // We only generate the command. The user must provide the binary file path on Host.
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
# FIX B3: Correct Registry Paths for Hardware Spoofing inside Guest
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
# Matches antivmdetect target keys
$RegScsi = "HKLM:\\HARDWARE\\DEVICEMAP\\Scsi\\Scsi Port 0\\Scsi Bus 0\\Target Id 0\\Logical Unit Id 0"
if (Test-Path $RegScsi) {
    Set-ItemProperty -Path $RegScsi -Name "Identifier" -Value "${config.DiskModelNumber}" -Force
    Set-ItemProperty -Path $RegScsi -Name "SerialNumber" -Value "${config.DiskSerialNumber}" -Force
}

# --- 2. Randomize Product IDs (FIX B1) ---
${security.randomizeProductIds ? `
Write-Host "[-] Randomizing ProductId..."
$RegNT = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion"
if (Test-Path $RegNT) {
    $rand = Get-Random -Minimum 100000000 -Maximum 999999999
    Set-ItemProperty -Path $RegNT -Name "ProductId" -Value "00330-80000-00000-$rand" -Force
}
` : '# ProductID Randomization skipped'}

# --- 3. Fake Files Generator (FIX B1) ---
${security.generateFakeFiles ? `
Write-Host "[-] Generating Fake User Activity (Desktop/Documents)..."
$desktop = [Environment]::GetFolderPath("Desktop")
$docs = [Environment]::GetFolderPath("MyDocuments")
for ($i=0; $i -lt 5; $i++) {
    $name = [System.IO.Path]::GetRandomFileName().Split(".")[0]
    $content = [System.Convert]::ToBase64String([System.Guid]::NewGuid().ToByteArray())
    Set-Content -Path "$desktop\\$name.txt" -Value "Project Notes $content"
    Set-Content -Path "$docs\\$name.docx" -Value "Confidential $content"
}
` : '# Fake file generation skipped'}

# --- 4. Honeytokens (FIX B1) ---
${security.injectHoneytokens ? `
Write-Host "[-] Injecting Clipboard Honeytokens..."
Set-Clipboard -Value "password123"
` : '# Honeytokens skipped'}

# --- 5. VBox Cleanup (FIX B1) ---
${security.removeVBoxFiles ? `
Write-Host "[-] Removing VirtualBox Artifacts..."
$Drivers = @("VBoxMouse.sys", "VBoxGuest.sys", "VBoxSF.sys", "VBoxVideo.sys")
foreach ($drv in $Drivers) {
    $path = "C:\\Windows\\System32\\drivers\\$drv"
    if (Test-Path $path) { Remove-Item $path -Force -ErrorAction SilentlyContinue }
}
` : '# VBox Cleanup skipped'}

# --- 6. Region (Optional) ---
Write-Host "[-] Setting Region: ${regionConfig.RegionLocale}..."
Set-WinSystemLocale -SystemLocale "${regionConfig.RegionLocale}"
Set-TimeZone -Id "${regionConfig.TimeZone}"

Write-Host "[+] Configuration Complete. Please REBOOT." -ForegroundColor Green
Start-Sleep -Seconds 3
`;
  };

  // --- Effects ---

  useEffect(() => {
    if (previewType === 'bat') setPreviewContent(getHardwareScript('bat'));
    if (previewType === 'sh') setPreviewContent(getHardwareScript('sh'));
    if (previewType === 'ps1') setPreviewContent(getGuestPs1());
  }, [config, regionConfig, vmName, appendCreate, vmConfig, customFields, security, previewType]);

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
  };

  const applyPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    // @ts-ignore
    const preset = PRESETS[name];
    if (preset) {
        setConfig(prev => ({ ...prev, ...preset }));
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
        customFields,
        vmName,
        appendCreate,
        version: "3.3.0"
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
                <p className="text-xs text-slate-400">Strict Compatibility Mode: antivmdetect.py</p>
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
                        { id: "Storage", icon: Disc, label: "存储设备" },
                        { id: "VM", icon: Box, label: "虚拟机设置" },
                        { id: "Region", icon: Map, label: "地区与语言" },
                        { id: "Security", icon: Shield, label: "Guest 伪装" },
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
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Code size={16}/> ACPI Custom Table (ACPI Spoof)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={config.AcpiTablePath} 
                                        onChange={e=>updateField('AcpiTablePath', e.target.value)}
                                        placeholder="C:\Path\To\acpi_table.bin"
                                        className="flex-1 border p-2 rounded font-mono text-sm"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    用于加载自定义 DSDT/SSDT 表。你需要先在宿主机 Dump ACPI 表并修改。<br/>
                                    <strong>Command:</strong> VBoxInternal/Devices/acpi/0/Config/CustomTable
                                </p>
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
                            </div>
                             <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                                <h3 className="font-bold text-gray-600 mb-4 uppercase text-xs tracking-wide">光驱 (ATAPI)</h3>
                                {renderInput("序列号 (Serial)", "ATAPISerialNumber")}
                                {renderInput("修订号 (Revision)", "ATAPIRevision")}
                                {renderInput("产品 ID (Product ID)", "ATAPIProductId")}
                                {renderInput("厂商 ID (Vendor ID)", "ATAPIVendorId")}
                            </div>
                        </div>
                        
                        <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800 flex gap-2">
                             <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                             <p>存储信息将同时写入 <strong>AHCI (Port 0/1)</strong> 和 <strong>PIIX3 (Primary Master/Slave)</strong> 控制器以确保兼容原项目行为。</p>
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Map/> 地区与语言 (可选)</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                             <div><label className="block text-xs font-bold text-gray-500 mb-1">区域语言 (e.g., zh-CN)</label>
                            <input className="w-full border p-2 rounded" value={regionConfig.RegionLocale} onChange={e=>updateRegionConfig('RegionLocale', e.target.value)}/></div>
                            
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">时区 (e.g., China Standard Time)</label>
                            <input className="w-full border p-2 rounded" value={regionConfig.TimeZone} onChange={e=>updateRegionConfig('TimeZone', e.target.value)}/></div>
                            
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">GeoID (244=US, 208=TW, 45=CN)</label>
                            <input className="w-full border p-2 rounded" value={regionConfig.GeoID} onChange={e=>updateRegionConfig('GeoID', e.target.value)}/></div>
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