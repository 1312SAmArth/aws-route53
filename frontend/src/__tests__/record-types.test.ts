import { describe, expect, it } from "vitest";
import { draftFromValues, emptyDraft, mapServerValueErrors, serializeDraft, validateDraft } from "@/lib/record-types";

describe("serializeDraft", () => {
  it("serializes one value per non-empty line and skips blanks", () => {
    const draft = { ...emptyDraft(), lines: " 192.0.2.1 \n\n198.51.100.2\n" };
    expect(serializeDraft("A", draft)).toEqual({ values: ["192.0.2.1", "198.51.100.2"], sourceIndex: [0, 1] });
  });

  it("serializes MX rows and ignores untouched ones", () => {
    const draft = {
      ...emptyDraft(),
      mx: [
        { priority: "10", host: "mail.example.com" },
        { priority: "10", host: "" },
        { priority: "20", host: "backup.example.com" },
      ],
    };
    const { values, sourceIndex } = serializeDraft("MX", draft);
    expect(values).toEqual(["10 mail.example.com", "20 backup.example.com"]);
    expect(sourceIndex).toEqual([0, 2]);
  });

  it("serializes SRV and CAA in the wire format the API expects", () => {
    const srv = { ...emptyDraft(), srv: [{ priority: "10", weight: "60", port: "5060", target: "sip.example.com" }] };
    expect(serializeDraft("SRV", srv).values).toEqual(["10 60 5060 sip.example.com"]);

    const caa = { ...emptyDraft(), caa: [{ flags: "0", tag: "issue", value: "letsencrypt.org" }] };
    expect(serializeDraft("CAA", caa).values).toEqual(['0 issue "letsencrypt.org"']);
  });
});

describe("draftFromValues (edit mode)", () => {
  it("round-trips structured types", () => {
    const mx = ["10 mail.example.com.", "20 backup.example.com."];
    expect(serializeDraft("MX", draftFromValues("MX", mx)).values).toEqual(mx);

    const srv = ["10 60 5060 sip.example.com."];
    expect(serializeDraft("SRV", draftFromValues("SRV", srv)).values).toEqual(srv);

    const caa = ['0 issue "letsencrypt.org"', '0 iodef "mailto:sec@example.com"'];
    expect(serializeDraft("CAA", draftFromValues("CAA", caa)).values).toEqual(caa);
  });

  it("shows TXT as plain text instead of the stored quoted chunks", () => {
    expect(draftFromValues("TXT", ['"v=spf1 -all"']).lines).toBe("v=spf1 -all");
    expect(draftFromValues("TXT", ['"first half, " "second half"']).lines).toBe("first half, second half");
    expect(draftFromValues("TXT", ['"say \\"hi\\""']).lines).toBe('say "hi"');
  });
});

describe("validateDraft", () => {
  it("requires at least one value", () => {
    expect(validateDraft("A", emptyDraft()).general).toEqual(["Enter at least one value."]);
    expect(validateDraft("MX", emptyDraft()).general).toEqual(["Enter at least one value."]);
  });

  it("reports the line number of an invalid line value", () => {
    const errors = validateDraft("A", { ...emptyDraft(), lines: "192.0.2.1\n999.1.1.1" });
    expect(errors.general).toHaveLength(1);
    expect(errors.general[0]).toMatch(/^Line 2:/);
  });

  it("limits CNAME and PTR to a single value", () => {
    const errors = validateDraft("CNAME", { ...emptyDraft(), lines: "a.example.com\nb.example.com" });
    expect(errors.general.join(" ")).toMatch(/exactly one value/);
  });

  it("keys structured errors by row and field", () => {
    const draft = { ...emptyDraft(), mx: [{ priority: "99999", host: "mail.example.com" }, { priority: "10", host: "bad host" }] };
    const errors = validateDraft("MX", draft);
    expect(Object.keys(errors.rows).sort()).toEqual(["0.priority", "1.host"]);
  });

  it("flags an unknown CAA tag", () => {
    const draft = { ...emptyDraft(), caa: [{ flags: "0", tag: "bogus", value: "x.org" }] };
    expect(validateDraft("CAA", draft).rows["0.tag"]).toBeDefined();
  });
});

describe("mapServerValueErrors", () => {
  it("maps values.N back to the originating row, even when blank rows were skipped", () => {
    const draft = { ...emptyDraft(), mx: [{ priority: "10", host: "" }, { priority: "10", host: "bad" }] };
    const serialized = serializeDraft("MX", draft);
    const mapped = mapServerValueErrors("MX", serialized, { "values.0": "Bad host." });
    expect(mapped.rows["1.row"]).toBe("Bad host.");
  });

  it("maps line errors for textarea types and passes through whole-field errors", () => {
    const serialized = serializeDraft("A", { ...emptyDraft(), lines: "1.1.1.1\nnope" });
    const mapped = mapServerValueErrors("A", serialized, { "values.1": "not an IP", values: "Enter a value." });
    expect(mapped.general).toEqual(expect.arrayContaining(["Line 2: not an IP", "Enter a value."]));
  });
});
