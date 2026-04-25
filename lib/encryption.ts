import crypto from "node:crypto";
import { env } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const getKey = (): Buffer => {
  const value = env.ENCRYPTION_KEY;
  if (/^[a-fA-F0-9]{64}$/.test(value)) {
    return Buffer.from(value, "hex");
  }
  return crypto.createHash("sha256").update(value).digest();
};

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(ciphertext: string): string {
  const [iv, authTag, encrypted] = ciphertext.split(":");
  if (!iv || !authTag || !encrypted) {
    throw new Error("Invalid ciphertext");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
