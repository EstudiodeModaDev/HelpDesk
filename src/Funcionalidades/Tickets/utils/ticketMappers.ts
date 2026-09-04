export const first = (...vals: any[]) =>
  vals.find((v) => v !== undefined && v !== null && v !== "");

export type AttachmentRow = {
  name: string;
  link: string;
};
