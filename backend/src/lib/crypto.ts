import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// KEY must be 32 bytes (256 bits)
const KEY = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY || "", "base64");
if (KEY.length !== 32) {
  throw new Error("CREDENTIAL_ENCRYPTION_KEY must be base64 of 32 bytes");
}

export function encryptJSON(obj: any) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, { authTagLength: 16 });
  const plain = Buffer.from(JSON.stringify(obj));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store ciphertext + tag together or separately; we store as: ciphertext + tag
  const payload = Buffer.concat([ciphertext, tag]);
  return { encrypted: payload, iv };
}

export function decryptJSON(encrypted: Buffer, iv: Buffer) {
  // encrypted = ciphertext + tag (last 16 bytes tag)
  const tag = encrypted.slice(encrypted.length - 16);
  const ciphertext = encrypted.slice(0, encrypted.length - 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString("utf-8"));
}
