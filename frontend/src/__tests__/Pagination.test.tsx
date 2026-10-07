import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination, pageWindow } from "@/components/ui/Pagination";

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses the middle of a long range around the current page", () => {
    expect(pageWindow(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("keeps the leading and trailing pages visible near the ends", () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, "gap", 20]);
    expect(pageWindow(20, 20)).toEqual([1, "gap", 17, 18, 19, 20]);
  });
});

describe("<Pagination>", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination page={1} pageCount={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the current page, disables the edges and reports changes", async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pageCount={3} onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onChange).toHaveBeenLastCalledWith(2);
    await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onChange).toHaveBeenLastCalledWith(3);
  });
});
