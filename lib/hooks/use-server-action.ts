"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/utils/result";

type Success<T> = Extract<ActionResult<T>, { ok: true }>;

/**
 * Drives a <form> with a server action: shows toasts, keeps what the user
 * typed (inputs are never reset on error), surfaces per-field errors and
 * moves focus to the first invalid field.
 */
export function useServerForm<T = undefined>(
  action: (fd: FormData) => Promise<ActionResult<T>>,
  opts: { onSuccess?: (r: Success<T>) => void; resetOnSuccess?: boolean } = {},
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      let res: ActionResult<T>;
      try {
        res = await action(fd);
      } catch {
        const msg = "Something went wrong. Please check your connection and try again.";
        setFormError(msg);
        toast.error(msg);
        return;
      }
      if (res.ok) {
        if (res.message) toast.success(res.message);
        if (opts.resetOnSuccess) form.reset();
        opts.onSuccess?.(res);
        if (res.redirectTo) router.push(res.redirectTo);
        else router.refresh();
      } else {
        setFieldErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        toast.error(res.error);
        requestAnimationFrame(() => {
          form
            .querySelector<HTMLElement>('[aria-invalid="true"]')
            ?.focus();
        });
      }
    });
  }

  return { onSubmit, pending, fieldErrors, formError };
}

/** For buttons (approve, delete, publish…) that call an action directly. */
export function useServerAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run<T = undefined>(
    fn: () => Promise<ActionResult<T>>,
    opts: { onSuccess?: (r: Success<T>) => void; onError?: (message: string) => void } = {},
  ) {
    startTransition(async () => {
      let res: ActionResult<T>;
      try {
        res = await fn();
      } catch {
        const msg = "Something went wrong. Please try again.";
        toast.error(msg);
        opts.onError?.(msg);
        return;
      }
      if (res.ok) {
        if (res.message) toast.success(res.message);
        opts.onSuccess?.(res);
        if (res.redirectTo) router.push(res.redirectTo);
        else router.refresh();
      } else {
        toast.error(res.error);
        opts.onError?.(res.error);
      }
    });
  }

  return { run, pending };
}
