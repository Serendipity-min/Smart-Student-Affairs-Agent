import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AttachmentProvider, AttachmentView, LocalDemoAttachment } from './types';

type LocalAttachmentContextValue = AttachmentProvider & {
  pending?: AttachmentView;
  reset(): void;
};

const LocalAttachmentContext = createContext<LocalAttachmentContextValue | undefined>(undefined);

function toView(attachment?: LocalDemoAttachment): AttachmentView | undefined {
  if (!attachment) return undefined;
  const { applicationId, kind, objectUrl, mimeType, displayName } = attachment;
  return { applicationId, kind, objectUrl, mimeType, displayName };
}

function toViews(attachments: Record<string, LocalDemoAttachment>): Record<string, AttachmentView> {
  return Object.fromEntries(Object.entries(attachments).map(([id, attachment]) => [id, toView(attachment)!]));
}

export function LocalSessionAttachmentProvider({ children }: { children: ReactNode }) {
  const pendingRef = useRef<LocalDemoAttachment | undefined>(undefined);
  const attachmentsRef = useRef<Record<string, LocalDemoAttachment>>({});
  const [pending, setPending] = useState<AttachmentView>();
  const [attachments, setAttachments] = useState<Record<string, AttachmentView>>({});

  const revoke = (attachment?: LocalDemoAttachment) => {
    if (attachment) URL.revokeObjectURL(attachment.objectUrl);
  };
  const clearPending = useCallback(() => {
    revoke(pendingRef.current);
    pendingRef.current = undefined;
    setPending(undefined);
  }, []);
  const putPending = useCallback((file: File) => {
    // 文件仅保留在当前浏览器内存；替换时立即回收旧 object URL，避免演示过程中的资源泄漏。
    revoke(pendingRef.current);
    const attachment: LocalDemoAttachment = {
      kind: 'hospital_certificate', file, objectUrl: URL.createObjectURL(file), mimeType: file.type, displayName: file.name
    };
    pendingRef.current = attachment;
    setPending(toView(attachment));
  }, []);
  const bind = useCallback((applicationId: string) => {
    const current = pendingRef.current;
    if (!current) return;
    revoke(attachmentsRef.current[applicationId]);
    const attachment = { ...current, applicationId };
    pendingRef.current = undefined;
    attachmentsRef.current = { ...attachmentsRef.current, [applicationId]: attachment };
    setPending(undefined);
    setAttachments(toViews(attachmentsRef.current));
  }, []);
  const clear = useCallback((applicationId?: string) => {
    if (!applicationId) return clearPending();
    const attachment = attachmentsRef.current[applicationId];
    if (!attachment) return;
    revoke(attachment);
    const { [applicationId]: _, ...remaining } = attachmentsRef.current;
    attachmentsRef.current = remaining;
    setAttachments(toViews(remaining));
  }, [clearPending]);
  const reset = useCallback(() => {
    clearPending();
    Object.values(attachmentsRef.current).forEach(revoke);
    attachmentsRef.current = {};
    setAttachments({});
  }, [clearPending]);
  useEffect(() => () => {
    // Provider 卸载等同结束演示会话，统一回收所有 blob URL。
    revoke(pendingRef.current);
    Object.values(attachmentsRef.current).forEach(revoke);
  }, []);

  const value = useMemo<LocalAttachmentContextValue>(() => ({
    pending,
    putPending,
    bind,
    get: (applicationId) => attachments[applicationId],
    clear,
    reset
  }), [attachments, bind, clear, pending, putPending, reset]);
  return <LocalAttachmentContext.Provider value={value}>{children}</LocalAttachmentContext.Provider>;
}

export function useLocalAttachments() {
  const value = useContext(LocalAttachmentContext);
  if (!value) throw new Error('LocalSessionAttachmentProvider is required');
  return value;
}
