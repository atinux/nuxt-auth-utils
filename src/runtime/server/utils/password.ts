// TODO: change once https://github.com/bruceharrison1984/bcrypt-edge/issues/28 is resolved
import { hashSync, compareSync } from 'bcrypt-edge/dist/bcrypt-edge'
import { HashedPassword } from '#auth-utils';

/**
 * @see https://stackoverflow.com/questions/16173328/what-unicode-normalization-and-other-processing-is-appropriate-for-passwords-w
 */
function normalizePassword(password: string): string {
  return password.normalize('NFKC');
}

interface HashPasswordOptions {
  /**
   * Number of rounds to use for hashing. Should be at least 10.
   *
   * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
   */
  rounds: number;
}

export function hashPassword(password: string, options: HashPasswordOptions): HashedPassword {
  const normalizedPassword = normalizePassword(password);

  return hashSync(normalizedPassword, options.rounds) as HashedPassword;
}

export function comparePassword(hash: HashedPassword, password: string): boolean {
  const normalizedPassword = normalizePassword(password);

  return compareSync(normalizedPassword, hash);
}
