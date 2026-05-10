/**
 * Type-level proof tests for the SnakeKeyed mapper (Fix #5).
 *
 * These run at compile time — there are no runtime assertions, only
 * `expectTypeOf` checks. If a Drizzle camelCase column name does not
 * convert to the SQL snake_case the Supabase REST client returns, the
 * file fails to compile and `npm test` fails too (vitest typechecks
 * each test file before running it).
 */
import { describe, it, expectTypeOf } from "vitest";
import type { Row, Tables } from "./database.types";

describe("SnakeKeyed → applications", () => {
  it("converts userId → user_id, createdAt → created_at, etc.", () => {
    type A = Row<"applications">;

    // Keys we depended on in the four hand-rolled ApplicationRow interfaces.
    expectTypeOf<A["id"]>().toEqualTypeOf<string>();
    expectTypeOf<A["user_id"]>().toEqualTypeOf<string>();
    expectTypeOf<A["company_id"]>().toEqualTypeOf<string | null>();
    expectTypeOf<A["created_at"]>().toEqualTypeOf<string>();
    expectTypeOf<A["updated_at"]>().toEqualTypeOf<string>();
  });

  it("never has a camelCase key on the snake_cased Row", () => {
    type A = Row<"applications">;
    // @ts-expect-error camelCase keys must not survive the mapper.
    const _camel: A = { userId: "" } as A;
    void _camel;
  });
});

describe("Tables interface", () => {
  it("indexes by snake_case table name", () => {
    expectTypeOf<Tables["applications"]>().toEqualTypeOf<Row<"applications">>();
    expectTypeOf<Tables["user_profiles"]>().toEqualTypeOf<Row<"user_profiles">>();
    expectTypeOf<Tables["agent_dispatches"]>().toEqualTypeOf<
      Row<"agent_dispatches">
    >();
  });
});
