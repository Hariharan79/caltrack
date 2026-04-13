import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";

import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { TextField } from "@/components/TextField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { signUp, validateAuthDraft, hasErrors, type AuthDraft, type AuthDraftErrors } from "@/lib/auth";

const EMPTY: AuthDraft = { email: "", password: "" };

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<AuthDraft>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const errors: AuthDraftErrors = validateAuthDraft(draft);
  const visible = submitted ? errors : {};

  const update = (key: keyof AuthDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    setInfoMessage(null);
    if (hasErrors(errors)) return;
    setFormError(null);
    setLoading(true);
    try {
      await signUp(draft);
      setInfoMessage("Account created. Check your email if confirmation is required, then sign in.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.sub}>Track your intake across devices.</Text>
        </View>

        <TextField
          label="Email"
          value={draft.email}
          onChangeText={(v) => update("email", v)}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          error={visible.email}
          testID="sign-up-email"
        />
        <TextField
          label="Password"
          value={draft.password}
          onChangeText={(v) => update("password", v)}
          placeholder="at least 6 characters"
          secureTextEntry
          textContentType="newPassword"
          error={visible.password}
          testID="sign-up-password"
        />

        {formError ? (
          <Text style={styles.formError} testID="sign-up-error">
            {formError}
          </Text>
        ) : null}
        {infoMessage ? (
          <Text style={styles.info} testID="sign-up-info">
            {infoMessage}
          </Text>
        ) : null}

        <PrimaryButton
          label="Create account"
          onPress={handleSubmit}
          loading={loading}
          testID="sign-up-submit"
          style={styles.submit}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable testID="sign-up-go-signin">
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  heading: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.display,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    marginTop: SPACING.xs,
  },
  submit: {
    marginTop: SPACING.md,
  },
  formError: {
    color: COLORS.protein,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: SPACING.sm,
  },
  info: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: SPACING.sm,
  },
  footer: {
    marginTop: SPACING.xl,
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
