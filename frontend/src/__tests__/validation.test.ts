import { describe, expect, it } from "vitest";
import { validateHostname, validateIPv4, validateIPv6, validateIntInRange, validateRecordName, validateTtl, validateZoneName } from "@/lib/validation";

describe("validateZoneName", () => {
  it.each(["example.com", "Example.COM", "sub.example.co.uk.", "10.in-addr.arpa", "a-b.io"])("accepts %s", (name) => {
    expect(validateZoneName(name)).toBeNull();
  });

  it.each(["", "localhost", "-bad.com", "bad-.com", "a..com", "under_score.com", "exa mple.com", `${"a".repeat(64)}.com`])(
    "rejects %j",
    (name) => {
      expect(validateZoneName(name)).not.toBeNull();
    },
  );
});

describe("validateRecordName", () => {
  it.each(["", "@", "www", "a.b", "_sip._tcp", "*.wild", "mail-1"])("accepts %j", (name) => {
    expect(validateRecordName(name)).toBeNull();
  });

  it.each(["a..b", "-x", "ex ample", "*", "a.*.b"])("rejects %j", (name) => {
    expect(validateRecordName(name)).not.toBeNull();
  });
});

describe("IP validation", () => {
  it("validates IPv4", () => {
    expect(validateIPv4("192.0.2.1")).toBeNull();
    for (const bad of ["256.1.1.1", "1.2.3", "1.2.3.4.5", "01.2.3.4x", "2001:db8::1", ""]) expect(validateIPv4(bad)).not.toBeNull();
  });

  it("validates IPv6", () => {
    for (const ok of ["2001:db8::1", "::1", "2001:0db8:85a3:0:0:8a2e:0370:7334", "::ffff:192.0.2.1"]) expect(validateIPv6(ok)).toBeNull();
    for (const bad of ["192.0.2.1", "2001:db8:::1", "gggg::1", "", "12345::1"]) expect(validateIPv6(bad)).not.toBeNull();
  });
});

describe("numeric validation", () => {
  it("checks TTL bounds", () => {
    expect(validateTtl("300")).toBeNull();
    expect(validateTtl("0")).toBeNull();
    expect(validateTtl("2147483647")).toBeNull();
    for (const bad of ["", "-1", "1.5", "abc", "2147483648"]) expect(validateTtl(bad)).not.toBeNull();
  });

  it("checks integer ranges", () => {
    expect(validateIntInRange("65535", "Port", 0, 65535)).toBeNull();
    expect(validateIntInRange("65536", "Port", 0, 65535)).toMatch(/between 0 and 65535/);
    expect(validateIntInRange("x", "Port", 0, 65535)).not.toBeNull();
  });
});

describe("validateHostname", () => {
  it("accepts names with underscores and trailing dots, rejects malformed ones", () => {
    expect(validateHostname("_dmarc.example.com.")).toBeNull();
    expect(validateHostname("mail.example.com")).toBeNull();
    expect(validateHostname("not a host")).not.toBeNull();
    expect(validateHostname("a..b")).not.toBeNull();
  });
});
