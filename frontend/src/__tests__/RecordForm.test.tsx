import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecordForm } from "@/components/records/RecordForm";
import { ApiError } from "@/lib/api-client";
import type { DnsRecord, HostedZone } from "@/lib/types";

const zone: HostedZone = {
  id: "ZTEST",
  name: "example.com.",
  type: "PUBLIC",
  comment: null,
  vpc_id: null,
  vpc_region: null,
  created_by: "Route 53",
  record_count: 2,
  name_servers: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function setup(overrides: Partial<React.ComponentProps<typeof RecordForm>> = {}) {
  const onSubmit = vi.fn();
  render(<RecordForm zone={zone} submitting={false} serverError={null} onSubmit={onSubmit} cancelHref="/hosted-zones/ZTEST" {...overrides} />);
  return { onSubmit, user: userEvent.setup() };
}

describe("<RecordForm> dynamic fields", () => {
  it("starts as an A record with a single value box and a TTL", () => {
    setup();
    expect(screen.getByLabelText("Record type")).toHaveValue("A");
    expect(screen.getByLabelText("Value")).toBeInTheDocument();
    expect(screen.getByLabelText("TTL (seconds)")).toHaveValue("300");
    expect(screen.getByText(".example.com")).toBeInTheDocument();
  });

  it("swaps the value inputs when the record type changes", async () => {
    const { user } = setup();
    const type = screen.getByLabelText("Record type");

    await user.selectOptions(type, "MX");
    expect(screen.getByLabelText("Priority, row 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Mail server, row 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Value")).not.toBeInTheDocument();

    await user.selectOptions(type, "SRV");
    for (const field of ["Priority, row 1", "Weight, row 1", "Port, row 1", "Target, row 1"]) {
      expect(screen.getByLabelText(field)).toBeInTheDocument();
    }

    await user.selectOptions(type, "CAA");
    expect(screen.getByLabelText("Flags, row 1")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Tag, row 1")).getAllByRole("option").map((o) => o.textContent)).toEqual(["issue", "issuewild", "iodef"]);
  });

  it("offers alias only for the types that support it", async () => {
    const { user } = setup();
    expect(screen.getByRole("checkbox", { name: /Alias/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Record type"), "TXT");
    expect(screen.queryByRole("checkbox", { name: /Alias/ })).not.toBeInTheDocument();
  });

  it("replaces value and TTL fields with a target when alias is on", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("checkbox", { name: /Alias/ }));
    expect(screen.getByLabelText("Route traffic to")).toBeInTheDocument();
    expect(screen.queryByLabelText("TTL (seconds)")).not.toBeInTheDocument();
  });

  it("asks for weight and record ID under weighted routing", async () => {
    const { user } = setup();
    expect(screen.queryByLabelText("Weight")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Routing policy"), "WEIGHTED");
    expect(screen.getByLabelText("Weight")).toBeInTheDocument();
    expect(screen.getByLabelText("Record ID")).toBeInTheDocument();
  });
});

describe("<RecordForm> submission", () => {
  it("blocks submit and shows inline errors for invalid input", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText("Value"), "999.1.1.1");
    await user.click(screen.getByRole("button", { name: "Create records" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Line 1:.*not a valid IPv4/)).toBeInTheDocument();
    expect(screen.getByText("There are problems with your configuration")).toBeInTheDocument();
  });

  it("submits a valid A record with the API payload shape", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText("Record name"), "www");
    await user.type(screen.getByLabelText("Value"), "192.0.2.1");
    await user.click(screen.getByRole("button", { name: "Create records" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "www",
      type: "A",
      ttl: 300,
      values: ["192.0.2.1"],
      routing_policy: "SIMPLE",
      set_identifier: null,
      weight: null,
      alias_target: null,
      evaluate_target_health: false,
      comment: null,
    });
  });

  it("submits MX rows in canonical text form", async () => {
    const { user, onSubmit } = setup();
    await user.selectOptions(screen.getByLabelText("Record type"), "MX");
    await user.type(screen.getByLabelText("Mail server, row 1"), "mail.example.com");
    await user.click(screen.getByRole("button", { name: "Add another mail server" }));
    await user.clear(screen.getByLabelText("Priority, row 2"));
    await user.type(screen.getByLabelText("Priority, row 2"), "20");
    await user.type(screen.getByLabelText("Mail server, row 2"), "backup.example.com");
    await user.click(screen.getByRole("button", { name: "Create records" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: "MX", values: ["10 mail.example.com", "20 backup.example.com"] }));
  });

  it("sends an alias with no values and no TTL", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("checkbox", { name: /Alias/ }));
    await user.type(screen.getByLabelText("Route traffic to"), "d1.cloudfront.net");
    await user.click(screen.getByRole("button", { name: "Create records" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ values: [], ttl: null, alias_target: "d1.cloudfront.net" }));
  });

  it("requires a record ID and weight for weighted routing", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText("Value"), "192.0.2.1");
    await user.selectOptions(screen.getByLabelText("Routing policy"), "WEIGHTED");
    await user.click(screen.getByRole("button", { name: "Create records" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter a record ID/)).toBeInTheDocument();
  });

  it("disables the form controls and the submit button while saving", () => {
    setup({ submitting: true });
    expect(screen.getByRole("button", { name: "Create records" })).toBeDisabled();
    expect(screen.getByLabelText("Value")).toBeDisabled();
  });

  it("shows server field errors next to the field", () => {
    const error = new ApiError(409, "RECORD_ALREADY_EXISTS", "A record with this name, type and record ID already exists.", [
      { field: "name", message: "A record with this name and type already exists." },
    ]);
    setup({ serverError: error });
    expect(screen.getByText("A record with this name and type already exists.")).toBeInTheDocument();
  });
});

describe("<RecordForm> editing", () => {
  const record: DnsRecord = {
    id: 7,
    hosted_zone_id: "ZTEST",
    name: "mail.example.com.",
    type: "MX",
    ttl: 600,
    values: ["10 smtp.example.com."],
    routing_policy: "SIMPLE",
    set_identifier: null,
    weight: null,
    alias_target: null,
    evaluate_target_health: false,
    comment: null,
    is_system: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("prefills from the record and locks name and type", () => {
    setup({ record });
    expect(screen.getByLabelText("Record name")).toHaveValue("mail");
    expect(screen.getByLabelText("Record name")).toBeDisabled();
    expect(screen.getByLabelText("Record type")).toBeDisabled();
    expect(screen.getByLabelText("Mail server, row 1")).toHaveValue("smtp.example.com.");
    expect(screen.getByLabelText("TTL (seconds)")).toHaveValue("600");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
