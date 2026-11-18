import { describe, expect, test } from "bun:test"
import * as AtomRef from "effect/reactivity/AtomRef"
import { useAtomRef, useAtomRefProp, useAtomRefPropValue } from "../src/Hooks.ts"
import { withHook } from "./harness.ts"

describe("useAtomRef helpers", () => {
  test("useAtomRefProp and useAtomRefPropValue track nested fields", () => {
    const form = AtomRef.make({ name: "Roland", email: "r@example.com" })

    withHook(
      () => ({
        nameRef: useAtomRefProp(() => form, "name"),
        name: useAtomRefPropValue(() => form, "name"),
        email: useAtomRef(() => form.prop("email"))
      }),
      (api) => {
        expect(api.name()).toBe("Roland")
        expect(api.email()).toBe("r@example.com")

        api.nameRef().set("Effect")
        expect(api.name()).toBe("Effect")
        expect(form.value.name).toBe("Effect")
      }
    )
  })
})
