/**
 * Typed REST client for the gesture customization endpoints.
 *
 * Backend reference: Streaming-App/app/api/gesture_routes.py.
 * Decision records:
 *   - decisions/004-knn-gesture-templates.md (why k-NN templates)
 *
 * Auth: all routes except /actions require a Bearer api_key. We pull
 * it from the in-memory auth store maintained by `lib/auth`.
 */
import { readApiKeyFromMemory } from './auth';
import { config } from './config';

export interface ActionPickerEntry {
  key: string;
  label: string;
  category: 'effect' | 'control';
}

export interface BuiltinRow {
  gesture: string;          // e.g. "peace"
  default_action: string;   // the hardcoded built-in action
  action: string;           // effective action (override or default)
  is_overridden: boolean;
  mapping_id: number | null; // override row id, null when not overridden
}

export interface TemplateRow {
  id: number;
  user_id: string;
  name: string;
  action: string;          // can be "unmapped" until the user assigns one
  handedness: 'Left' | 'Right' | 'Any';
  sample_count: number;
  created_at: string;
  // The backend also returns landmarks[]; the FE Gesture Library doesn't
  // need them so we leave the type off rather than pulling KBs across
  // the wire for nothing.
}

export class GestureApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'GestureApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { requireAuth?: boolean } = {},
): Promise<T> {
  const { requireAuth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (requireAuth) {
    const apiKey = readApiKeyFromMemory();
    if (!apiKey) {
      throw new GestureApiError('Not signed in', 401);
    }
    finalHeaders.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch(`${config.API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const msg =
      (body as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new GestureApiError(msg, res.status, body);
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listActions(): Promise<{ actions: ActionPickerEntry[] }> {
  return request('/api/v1/gestures/actions', { requireAuth: false });
}

export async function listBuiltins(): Promise<{ builtins: BuiltinRow[] }> {
  return request('/api/v1/gestures/builtins');
}

export async function setBuiltinOverride(
  gesture: string,
  action: string,
): Promise<{ mapping: { id: number; gesture: string; action: string } }> {
  return request('/api/v1/gestures', {
    method: 'POST',
    body: JSON.stringify({ gesture, action }),
  });
}

export async function resetBuiltinToDefault(mappingId: number): Promise<void> {
  await request(`/api/v1/gestures/${mappingId}`, { method: 'DELETE' });
}

export async function listTemplates(): Promise<{ templates: TemplateRow[] }> {
  return request('/api/v1/gestures/templates');
}

export async function setTemplateAction(
  templateId: number,
  action: string,
): Promise<{ template: TemplateRow }> {
  return request(`/api/v1/gestures/templates/${templateId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export async function deleteTemplate(templateId: number): Promise<void> {
  await request(`/api/v1/gestures/templates/${templateId}`, { method: 'DELETE' });
}
