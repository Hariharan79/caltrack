import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";

import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { TextField } from "@/components/TextField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { signIn, validateAuthDraft, hasErrors, type AuthDraft, type AuthDraftErrors } from "@/lib/auth";
import { COPY } from "@/lib/copy";

const EMPTY: AuthDraft = { email: "", password: "" };

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<AuthDraft>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors: AuthDraftErrors = validateAuthDraft(draft);
  const visible = submitted ? errors : {};

  const update = (key: keyof AuthDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setFormError(null);
    setLoading(true);
    try {
      await signIn(draft);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : COPY.auth.signIn.genericError);
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
          <Text style={styles.heading}>{COPY.auth.signIn.title}</Text>
          <Text style={styles.sub}>{COPY.auth.signIn.subtitle}</Text>
        </View>

        <TextField
          label={COPY.auth.signIn.emailLabel}
          value={draft.email}
          onChangeText={(v) => update("email", v)}
          placeholder={COPY.auth.signIn.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          error={visible.email}
          testID="sign-in-email"
        />
        <TextField
          label={COPY.auth.signIn.passwordLabel}
          value={draft.password}
          onChangeText={(v) => update("password", v)}
          placeholder={COPY.auth.signIn.passwordPlaceholder}
          secureTextEntry
          textContentType="password"
          error={visible.password}
          testID="sign-in-password"
        />

        {formError ? (
          <Text style={styles.formError} testID="sign-in-error">
            {formError}
          </Text>
        ) : null}

        <PrimaryButton
          label={COPY.auth.signIn.submit}
          onPress={handleSubmit}
          loading={loading}
          testID="sign-in-submit"
          style={styles.submit}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{COPY.auth.signIn.footerPrompt}</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable testID="sign-in-go-signup">
              <Text style={styles.footerLink}>{COPY.auth.signIn.footerAction}</Text>
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
