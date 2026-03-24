declare module 'virtual:herbrand-specs' {
  export type SpecFile = {
    path: string;
    content: string;
  };
  export const specs: SpecFile[];
}
