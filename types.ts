export interface ConfigData {
  DmiBIOSVendor: string;
  DmiBIOSVersion: string;
  DmiBIOSReleaseDate: string;
  DmiBIOSReleaseMajor: string | number;
  DmiBIOSReleaseMinor: string | number;
  DmiBIOSFirmwareMajor: string | number;
  DmiBIOSFirmwareMinor: string | number;
  DmiSystemVendor: string;
  DmiSystemProduct: string;
  DmiSystemVersion: string;
  DmiSystemSerial: string;
  DmiSystemUuid: string;
  DmiSystemFamily: string;
  DmiSystemSKU: string;
  DmiBoardVendor: string;
  DmiBoardProduct: string;
  DmiBoardVersion: string;
  DmiBoardSerial: string;
  DmiBoardAssetTag: string;
  DmiBoardLocInChass: string;
  DmiBoardBoardType: string | number;
  DmiChassisVendor: string;
  DmiChassisVersion: string;
  DmiChassisType: string | number;
  DmiChassisSerial: string;
  DmiChassisAssetTag: string;
  DmiProcManufacturer: string;
  DmiProcVersion: string;
  DmiOEMVBoxVer: string;
  DmiOEMVBoxRev: string;
  DiskSerialNumber: string;
  DiskModelNumber: string;
  DiskFirmwareRevision: string;
  ATAPISerialNumber: string;
  ATAPIRevision: string;
  ATAPIProductId: string;
  ATAPIVendorId: string;
  AcpiTablePath: string;
  [key: string]: string | number;
}

export interface SecurityData {
  spoofRegistry: boolean;
  generateFakeFiles: boolean;
  injectHoneytokens: boolean;
  randomizeVolumeId: boolean;
  removeVBoxFiles: boolean;
  randomizeProductIds: boolean;
}

export interface VmConfigData {
  osType: string;
  cpuCount: string;
  memorySize: string;
  vramSize: string;
  diskSize: string;
  networkMode: string;
  isoPath: string;
  macAddress: string;
  nicType: string;
  storageController: string;
  videoResolution: string;
  videoColorDepth: string;
}

export interface RegionConfigData {
  RegionLocale: string;
  TimeZone: string;
  LanguageList: string;
  GeoID: string;
}

export interface CustomField {
  key: string;
  value: string;
}

export interface CpuidLeaf {
  leaf: string;
  eax: string;
  ebx: string;
  ecx: string;
  edx: string;
}