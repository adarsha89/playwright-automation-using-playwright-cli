import { faker } from '@faker-js/faker';

/**
 * SauceDemo's own publicly documented demo accounts (confirmed on-page, see
 * `docs/exploration/saucedemo-login-cart-exploration.md` E-1). These are not
 * secrets and are not environment-specific, so they're literal constants
 * here rather than `.env` values (framework-guidelines principle i).
 */
export const SAUCEDEMO_USERS = {
  standardUser: { username: 'standard_user', password: 'secret_sauce' },
  lockedOutUser: { username: 'locked_out_user', password: 'secret_sauce' },
};

/**
 * A guaranteed-wrong password for `standard_user`, Faker-backed so no
 * hardcoded "wrong" literal drifts into looking like a real password
 * (mirrors `data/builders/example.builder.ts`'s pattern). Regenerates on the
 * astronomically unlikely chance Faker produces the real password.
 */
export function buildWrongPassword(): string {
  let password = faker.internet.password({ length: 12 });
  while (password === SAUCEDEMO_USERS.standardUser.password) {
    password = faker.internet.password({ length: 12 });
  }
  return password;
}
