interface USBDevice {
  readonly opened: boolean;
  readonly configuration: USBConfiguration | null;
  open(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBConfiguration {
  readonly interfaces: USBInterface[];
}

interface USBInterface {
  readonly interfaceNumber: number;
  readonly claimed: boolean;
  readonly alternate: USBAlternateInterface;
}

interface USBAlternateInterface {
  readonly endpoints: USBEndpoint[];
}

interface USBEndpoint {
  readonly endpointNumber: number;
  readonly direction: "in" | "out";
  readonly type: "bulk" | "interrupt" | "isochronous" | "control";
}

interface USBOutTransferResult {
  readonly bytesWritten: number;
  readonly status: string;
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: { filters: Array<{ vendorId?: number; classCode?: number }> }): Promise<USBDevice>;
}

interface Navigator {
  usb?: USB;
}
