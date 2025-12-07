import { ConfigData, VmConfigData } from './types';

export const MAC_OUIS = {
  "VirtualBox (Default)": "080027",
  "Intel": "0007E9",
  "Dell": "001422",
  "HP": "001871",
  "Realtek": "00E04C",
  "Cisco": "00000C",
  "Apple": "0017F2"
};

export const NIC_TYPES = [
  "82540EM", // Intel PRO/1000 MT Desktop
  "82543GC", // Intel PRO/1000 T Server
  "82545EM", // Intel PRO/1000 MT Server
  "Am79C970A", // PCnet-PCI II
  "Am79C973", // PCnet-FAST III
  "virtio-net" // Paravirtualized Network
];

export const STORAGE_CONTROLLERS = [
  "IntelAhci", // SATA
  "PIIX4",     // IDE
  "ICH6",      // IDE
  "PIIX3"      // IDE
];

export const CPUID_PRESETS = {
  "Default": [],
  "Intel IvyBridge": [
    { leaf: "00000001", eax: "000306A9", ebx: "00100800", ecx: "7F9AE3BF", edx: "BFEBFBFF" }
  ],
  "Intel Skylake": [
    { leaf: "00000001", eax: "000506E3", ebx: "00100800", ecx: "7FFAFEBF", edx: "BFEBFBFF" }
  ],
  "AMD Ryzen": [
    { leaf: "00000001", eax: "00800F11", ebx: "00000000", ecx: "00000000", edx: "00000000" }
  ]
};

export const DEFAULT_TEMPLATE: ConfigData = {
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

export const PRESETS: Record<string, { config?: Partial<ConfigData>, vmConfig?: Partial<VmConfigData> }> = {
  "自定义 (Custom)": {},
  "Dell OptiPlex 7050": {
    config: {
        DmiBIOSVendor: "Dell Inc.",
        DmiBIOSVersion: "1.15.1",
        DmiBIOSReleaseDate: "06/02/2020",
        DmiSystemVendor: "Dell Inc.",
        DmiSystemProduct: "OptiPlex 7050",
        DmiBoardVendor: "Dell Inc.",
        DmiBoardProduct: "0F5C5X",
        DmiChassisVendor: "Dell Inc.",
        DmiProcManufacturer: "Intel(R) Corporation",
        DmiProcVersion: "Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz",
        DiskModelNumber: "Samsung SSD 860 EVO 500GB"
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
        DmiProcVersion: "Intel(R) Core(TM) i7-8565U CPU @ 1.80GHz",
        DiskModelNumber: "SAMSUNG MZVLB512HBHQ-000L7"
    },
    vmConfig: {
        nicType: "82545EM",
        videoResolution: "2560x1440",
        storageController: "IntelAhci"
    }
  },
  "HP EliteBook 840 G5": {
    config: {
        DmiBIOSVendor: "HP",
        DmiBIOSVersion: "Q78 Ver. 01.02.03",
        DmiSystemVendor: "HP",
        DmiSystemProduct: "HP EliteBook 840 G5",
        DmiBoardVendor: "HP",
        DmiBoardProduct: "83B2",
        DmiChassisVendor: "HP",
        DmiProcManufacturer: "Intel(R) Corporation",
        DmiProcVersion: "Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz",
        DiskModelNumber: "LITEON CA1-8D512"
    },
    vmConfig: {
        nicType: "82540EM",
        videoResolution: "1920x1080",
        storageController: "IntelAhci"
    }
  }
};
