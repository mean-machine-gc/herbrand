declare module "virtual:herbrand-specs" {
  export type SpecFile = {
    fileName: string;
    content: string;
  };
  export const specs: SpecFile[];
}
