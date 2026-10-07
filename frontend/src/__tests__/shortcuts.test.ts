import { describe, expect, it } from "vitest";
import { createTargetFor } from "@/components/layout/KeyboardShortcuts";

describe("createTargetFor", () => {
  it("creates a hosted zone from the zone list", () => {
    expect(createTargetFor("/hosted-zones")).toBe("/hosted-zones/new");
  });

  it("creates a record from a zone's page", () => {
    expect(createTargetFor("/hosted-zones/ZABC123")).toBe("/hosted-zones/ZABC123/records/new");
  });

  it("does nothing where there is nothing to create", () => {
    for (const path of ["/dashboard", "/hosted-zones/new", "/hosted-zones/ZABC123/edit", "/hosted-zones/ZABC123/records/new", "/resolver"]) {
      expect(createTargetFor(path)).toBeNull();
    }
  });
});
