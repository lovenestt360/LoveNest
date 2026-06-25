const COMMON_WEAK_PASSWORDS = new Set([
  "123456", "12345678", "123456789", "1234567890", "12345", "1234567",
  "password", "password1", "qwerty", "qwerty123", "abc123", "abcd1234",
  "senha", "senha123", "senha1234", "111111", "000000", "iloveyou",
  "admin", "letmein", "welcome", "monkey", "dragon", "football",
]);

// Validação mínima de força — não substitui a política de password do
// Supabase Auth (essa é que é a barreira real do lado do servidor).
export function getPasswordError(password: string): string | null {
  if (password.length < 8) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  if (/^\d+$/.test(password)) {
    return "A senha não pode ter só números.";
  }
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return "Essa senha é muito comum e fácil de adivinhar. Escolhe outra.";
  }
  return null;
}
