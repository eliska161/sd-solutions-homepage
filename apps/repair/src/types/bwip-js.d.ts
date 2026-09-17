declare module "bwip-js" {
  export function toBuffer(opts: {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    backgroundcolor?: string;
  }): Promise<Buffer>;
  const bwipjs: { toBuffer: typeof toBuffer };
  export default bwipjs;
}

declare module "bwip-js/node" {
  export function toBuffer(opts: {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    backgroundcolor?: string;
  }): Promise<Buffer>;
  const bwipjs: { toBuffer: typeof toBuffer };
  export default bwipjs;
}
