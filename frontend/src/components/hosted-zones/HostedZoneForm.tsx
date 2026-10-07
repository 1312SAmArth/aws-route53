"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FormField } from "@/components/ui/FormField";
import { Choice, Input, Select, Textarea } from "@/components/ui/Inputs";
import { ApiError } from "@/lib/api-client";
import { displayName } from "@/lib/format";
import type { HostedZone, HostedZoneInput, ZoneType } from "@/lib/types";
import { validateZoneName } from "@/lib/validation";
import styles from "./HostedZoneForm.module.css";

const REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
];
const COMMENT_MAX = 256;

interface HostedZoneFormProps {
  /** Present when editing; domain name and type are immutable, as in Route 53. */
  zone?: HostedZone;
  submitting: boolean;
  serverError: ApiError | null;
  onSubmit: (input: HostedZoneInput) => void;
  cancelHref: string;
}

type Errors = Partial<Record<"name" | "vpc_id" | "vpc_region", string>>;

export function HostedZoneForm({ zone, submitting, serverError, onSubmit, cancelHref }: HostedZoneFormProps) {
  const editing = zone !== undefined;
  const [name, setName] = useState(zone ? displayName(zone.name) : "");
  const [comment, setComment] = useState(zone?.comment ?? "");
  const [type, setType] = useState<ZoneType>(zone?.type ?? "PUBLIC");
  const [vpcRegion, setVpcRegion] = useState(zone?.vpc_region ?? "us-east-1");
  const [vpcId, setVpcId] = useState(zone?.vpc_id ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [serverErrorsVisible, setServerErrorsVisible] = useState(true);
  const summaryRef = useRef<HTMLDivElement>(null);

  const server = serverErrorsVisible && serverError ? serverError.fieldErrors : {};
  const shown: Errors = {
    name: errors.name ?? server.name,
    vpc_id: errors.vpc_id ?? server.vpc_id,
    vpc_region: errors.vpc_region ?? server.vpc_region,
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setServerErrorsVisible(true);
    const next: Errors = {};
    if (!editing) {
      const nameError = validateZoneName(name);
      if (nameError) next.name = nameError;
      if (type === "PRIVATE") {
        if (!vpcId.trim()) next.vpc_id = "Enter the ID of the VPC to associate with this zone.";
        else if (!/^vpc-[0-9a-f]{8,17}$/i.test(vpcId.trim())) next.vpc_id = "VPC IDs look like vpc-0a1b2c3d4e5f67890.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    onSubmit({
      name: name.trim(),
      type,
      comment: comment.trim() || null,
      vpc_id: type === "PRIVATE" ? vpcId.trim() : null,
      vpc_region: type === "PRIVATE" ? vpcRegion : null,
    });
  };

  const hasClientErrors = Object.keys(errors).length > 0;
  const generalServerError = serverErrorsVisible && serverError && serverError.details.length === 0 ? serverError : null;

  return (
    <form onSubmit={submit} noValidate className={styles.form}>
      <div ref={summaryRef} tabIndex={-1} className={styles.summary}>
        {hasClientErrors && (
          <Alert type="error" header="There are problems with your configuration">
            Review the fields marked below and try again.
          </Alert>
        )}
        {generalServerError && (
          <Alert type="error" header={editing ? "Couldn't update the hosted zone" : "Couldn't create the hosted zone"}>
            {generalServerError.message}
          </Alert>
        )}
      </div>

      <Container title="Hosted zone configuration" description="A hosted zone is a container for the records that define how traffic is routed for a domain and its subdomains.">
        <div className={styles.fields}>
          <FormField
            id="zone-name"
            label="Domain name"
            description={editing ? "The domain name of a hosted zone can't be changed." : "This is the name of the domain that you want to route traffic for."}
            constraint={editing ? undefined : "Valid characters: a-z, 0-9 and - (hyphen). Labels are separated by dots."}
            error={shown.name}
          >
            {(props) => (
              <Input
                {...props}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setServerErrorsVisible(false);
                }}
                onBlur={() => !editing && name.trim() && setErrors((prev) => ({ ...prev, name: validateZoneName(name) ?? undefined }))}
                disabled={editing || submitting}
                placeholder="example.com"
                spellCheck={false}
                autoComplete="off"
                autoFocus={!editing}
                maxLength={253}
              />
            )}
          </FormField>

          <FormField
            id="zone-comment"
            label="Description"
            optional
            constraint={`${comment.length} / ${COMMENT_MAX} characters`}
            description="The description helps you distinguish this hosted zone from others."
          >
            {(props) => (
              <Textarea
                {...props}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submitting}
                rows={3}
                maxLength={COMMENT_MAX}
                placeholder="The hosted zone is used for…"
              />
            )}
          </FormField>

          <fieldset className={styles.fieldset} disabled={editing || submitting}>
            <legend className={styles.legend}>Type</legend>
            <p className={styles.help}>{editing ? "The type of a hosted zone can't be changed." : "The type indicates whether you want to route traffic on the internet or in an Amazon VPC."}</p>
            <div className={styles.choices}>
              <Choice
                type="radio"
                name="zone-type"
                label="Public hosted zone"
                description="A public hosted zone determines how traffic is routed on the internet."
                checked={type === "PUBLIC"}
                onChange={() => setType("PUBLIC")}
              />
              <Choice
                type="radio"
                name="zone-type"
                label="Private hosted zone"
                description="A private hosted zone determines how traffic is routed within an Amazon VPC."
                checked={type === "PRIVATE"}
                onChange={() => setType("PRIVATE")}
              />
            </div>
          </fieldset>

          {type === "PRIVATE" && (
            <div className={styles.vpc}>
              <h3 className={styles.vpcTitle}>VPCs to associate with the hosted zone</h3>
              <div className={styles.pair}>
                <FormField id="vpc-region" label="Region" error={shown.vpc_region}>
                  {(props) => (
                    <Select {...props} value={vpcRegion} onChange={(e) => setVpcRegion(e.target.value)} disabled={editing || submitting}>
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  )}
                </FormField>
                <FormField id="vpc-id" label="VPC ID" error={shown.vpc_id}>
                  {(props) => (
                    <Input
                      {...props}
                      value={vpcId}
                      onChange={(e) => {
                        setVpcId(e.target.value);
                        setServerErrorsVisible(false);
                      }}
                      disabled={editing || submitting}
                      placeholder="vpc-0a1b2c3d4e5f67890"
                      spellCheck={false}
                      maxLength={64}
                    />
                  )}
                </FormField>
              </div>
            </div>
          )}
        </div>
      </Container>

      <div className={styles.actions}>
        <LinkButton href={cancelHref} variant="link">
          Cancel
        </LinkButton>
        <Button type="submit" variant="primary" loading={submitting}>
          {editing ? "Save changes" : "Create hosted zone"}
        </Button>
      </div>
    </form>
  );
}
