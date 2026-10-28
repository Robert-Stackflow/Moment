import { useFormState, type FormRules } from "@robert-stackflow/oneui";
import { useLayoutEffect } from "react";
/** Bridge domain models (autosaved drafts, server settings) to shared validation. */
export function useModelForm<T extends Record<string, unknown>>(
  values: T,
  rules?: FormRules<T>,
) {
  const controller = useFormState({ initialValues: values, rules });
  useLayoutEffect(() => {
    for (const key of Object.keys(values) as (keyof T)[])
      if (!Object.is(controller.values[key], values[key]))
        controller.setValue(key, values[key]);
  });
  return controller;
}
