"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export interface ListState {
  page: number;
  search: string;
  type: string;
}

/**
 * Keeps page / search / type filter in the URL (?page=2&q=mail&type=MX) so a list view
 * survives refresh, can be shared, and works with the browser's back button.
 */
export function useListParams(): [ListState, (patch: Partial<ListState>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawPage = Number(searchParams.get("page"));
  const state: ListState = {
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
    search: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "",
  };

  const current = searchParams.toString();
  const update = useCallback(
    (patch: Partial<ListState>) => {
      const next = new URLSearchParams(current);
      const set = (key: string, value: string | number | undefined, empty: string | number) => {
        if (value === undefined) return;
        if (value === empty) next.delete(key);
        else next.set(key, String(value));
      };
      set("q", patch.search, "");
      set("type", patch.type, "");
      set("page", patch.page, 1);
      // Changing a filter always returns to the first page.
      if ((patch.search !== undefined || patch.type !== undefined) && patch.page === undefined) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [current, pathname, router],
  );

  return [state, update];
}
