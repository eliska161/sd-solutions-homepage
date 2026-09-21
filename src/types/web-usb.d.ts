interface USBDevice {
  readonly opened: boolean;
  readonly productName?: string;
  readonly manufacturerName?: string;
  readonly vendorId: number;
  readonly productId: number;
  readonly configuration: USBConfiguration | null;
  readonly configurations: USBConfiguration[];
  open(): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBConfiguration {
  readonly configurationValue: number;
  readonly interfaces: USBInterface[];
}

interface USBInterface {
  readonly interfaceNumber: number;
  readonly claimed: boolean;
  readonly alternate: USBAlternateInterface;
  readonly alternates: USBAlternateInterface[];
}

interface USBAlternateInterface {
  readonly alternateSetting: number;
  readonly interfaceClass: number;
  readonly endpoints: USBEndpoint[];
}

interface USBEndpoint {
  readonly endpointNumber: number;
  readonly direction: "in" | "out";
  readonly type: "bulk" | "interrupt" | "isochronous" | "control";
  readonly packetSize: number;
}

interface USBOutTransferResult {
  readonly bytesWritten: number;
  readonly status: string;
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: {
    filters: Array<{ vendorId?: number; productId?: number; classCode?: number }>;
  }): Promise<USBDevice>;
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: "none" | "even" | "odd";
    bufferSize?: number;
    flowControl?: "none" | "hardware";
  }): Promise<void>;
  close(): Promise<void>;
  setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
}

interface Serial {
  getPorts(): Promise<SerialPort[]>;
  requestPort(options?: { filters?: Array<{ usbVendorId?: number }> }): Promise<SerialPort>;
}

interface Navigator {
  usb?: USB;
  serial?: Serial;
}
