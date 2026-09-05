export type LocalDemoAttachment = {
  applicationId?: string;
  kind: 'hospital_certificate';
  file: File;
  objectUrl: string;
  mimeType: string;
  displayName: string;
};

export type AttachmentView = Pick<LocalDemoAttachment, 'applicationId' | 'kind' | 'objectUrl' | 'mimeType' | 'displayName'>;

// 预留统一接口：当前实现仅使用浏览器内存，未来替换为受鉴权的服务器附件服务时无需改动预览界面。
export interface AttachmentProvider {
  putPending(file: File): void;
  bind(applicationId: string): void;
  get(applicationId: string): AttachmentView | undefined;
  clear(applicationId?: string): void;
}

export const DEMO_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
export const DEMO_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
