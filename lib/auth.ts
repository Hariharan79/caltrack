import { supabase } from "@/lib/supabase";
import { COPY } from "@/lib/copy";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthDraft {
  email: string;
  password: string;
}

export interface AuthDraftErrors {
  email?: string;
  password?: string;
}

export function validateAuthDraft(draft: AuthDraft): AuthDraftErrors {
  const errors: AuthDraftErrors = {};
  const email = draft.email.trim();
  if (!email) {
    errors.email = COPY.auth.validation.required;
  } else if (!EMAIL_RE.test(email)) {
    errors.email = COPY.auth.validation.invalidEmail;
  }
  if (!draft.password) {
    errors.password = COPY.auth.validation.required;
  } else if (draft.password.length < 6) {
    errors.password = COPY.auth.validation.shortPassword;
  }
  return errors;
}

export function hasErrors(errors: AuthDraftErrors): boolean {
  return Object.keys(errors).length > 0;
}

export async function signIn(draft: AuthDraft): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: draft.email.trim(),
    password: draft.password,
  });
  if (error) throw error;
}

export async function signUp(draft: AuthDraft): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: draft.email.trim(),
    password: draft.password,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
