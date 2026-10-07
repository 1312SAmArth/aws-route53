import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog title="Delete thing" onConfirm={onConfirm} onCancel={onCancel} {...props}>
      <p>Are you sure?</p>
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel };
}

describe("<ConfirmDialog>", () => {
  it("is an accessible modal dialog named by its title", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Delete thing" })).toHaveAttribute("aria-modal", "true");
  });

  it("confirms and cancels", async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const { onCancel } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("does not close on Escape while a request is in flight", async () => {
    const { onCancel } = setup({ loading: true });
    await userEvent.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("keeps Tab focus inside the dialog", async () => {
    setup();
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("returns focus to the element that opened it", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(
      <ConfirmDialog title="x" onConfirm={() => {}} onCancel={() => {}}>
        body
      </ConfirmDialog>,
    );
    expect(trigger).not.toHaveFocus();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  describe("with typed confirmation", () => {
    it("only enables the confirm button once the word is typed", async () => {
      const { onConfirm } = setup({ requireText: "delete" });
      const confirm = screen.getByRole("button", { name: "Delete" });
      expect(confirm).toBeDisabled();

      const input = screen.getByRole("textbox");
      expect(input).toHaveFocus();
      await userEvent.type(input, "delet");
      expect(confirm).toBeDisabled();
      await userEvent.type(input, "e");
      expect(confirm).toBeEnabled();

      await userEvent.click(confirm);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("submits with Enter only when confirmed", async () => {
      const { onConfirm } = setup({ requireText: "delete" });
      const input = screen.getByRole("textbox");
      await userEvent.type(input, "nope{Enter}");
      expect(onConfirm).not.toHaveBeenCalled();
      await userEvent.clear(input);
      await userEvent.type(input, "delete{Enter}");
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a server error inside the dialog", () => {
    setup({ error: "The hosted zone is not empty." });
    expect(screen.getByRole("alert")).toHaveTextContent("The hosted zone is not empty.");
  });
});
