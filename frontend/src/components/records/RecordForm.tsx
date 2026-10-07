"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FormField } from "@/components/ui/FormField";
import { Choice, Input, Select } from "@/components/ui/Inputs";
import { ApiError } from "@/lib/api-client";
import {
  RECORD_TYPE_META,
  draftFromValues,
  emptyDraft,
  mapServerValueErrors,
  serializeDraft,
  validateDraft,
  type DraftErrors,
  type ValueDraft,
} from "@/lib/record-types";
import { RECORD_TYPES, type DnsRecord, type HostedZone, type RecordInput, type RecordType, type RoutingPolicy } from "@/lib/types";
import { validateHostname, validateIntInRange, validateRecordName, validateTtl } from "@/lib/validation";
import { displayName } from "@/lib/format";
import { RecordValueFields } from "./RecordValueFields";
import styles from "./RecordForm.module.css";

const TTL_PRESETS = [
  { label: "1 minute", seconds: 60 },
  { label: "5 minutes", seconds: 300 },
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86400 },
];

interface RecordFormProps {
  zone: HostedZone;
  record?: DnsRecord;
  submitting: boolean;
  serverError: ApiError | null;
  onSubmit: (input: RecordInput) => void;
  cancelHref: string;
}

type FieldErrors = Partial<Record<"name" | "ttl" | "alias" | "setId" | "weight", string>>;

function relativeName(record: DnsRecord | undefined, zone: HostedZone): string {
  if (!record || record.name === zone.name) return "";
  return record.name.slice(0, -(zone.name.length + 1));
}

export function RecordForm({ zone, record, submitting, serverError, onSubmit, cancelHref }: RecordFormProps) {
  const editing = record !== undefined;
  const locked = record?.is_system ?? false; // default NS/SOA: only TTL (and NS values) can change
  const initialType = (record && record.type !== "SOA" ? record.type : "A") as RecordType;

  const [name, setName] = useState(relativeName(record, zone));
  const [type, setType] = useState<RecordType>(initialType);
  const [alias, setAlias] = useState(Boolean(record?.alias_target));
  const [aliasTarget, setAliasTarget] = useState(record?.alias_target ? displayName(record.alias_target) : "");
  const [evaluateHealth, setEvaluateHealth] = useState(record?.evaluate_target_health ?? false);
  const [draft, setDraft] = useState<ValueDraft>(() => (record && !record.alias_target ? draftFromValues(initialType, record.values) : emptyDraft()));
  const [ttl, setTtl] = useState(String(record?.ttl ?? 300));
  const [policy, setPolicy] = useState<RoutingPolicy>(record?.routing_policy ?? "SIMPLE");
  const [setId, setSetId] = useState(record?.set_identifier ?? "");
  const [weight, setWeight] = useState(record?.weight != null ? String(record.weight) : "");
  const [comment, setComment] = useState(record?.comment ?? "");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [valueErrors, setValueErrors] = useState<DraftErrors>({ rows: {}, general: [] });
  const [showServerErrors, setShowServerErrors] = useState(true);
  const summaryRef = useRef<HTMLDivElement>(null);

  const meta = RECORD_TYPE_META[type];
  const isAlias = alias && meta.aliasable;
  const suffix = displayName(zone.name);

  // Server-side field errors (the authority) are shown next to the same fields as client-side ones.
  const server = showServerErrors && serverError ? serverError.fieldErrors : {};
  const serialized = serializeDraft(type, draft);
  const serverValueErrors = mapServerValueErrors(type, serialized, server);
  const errors: FieldErrors = {
    name: fieldErrors.name ?? server.name,
    ttl: fieldErrors.ttl ?? server.ttl,
    alias: fieldErrors.alias ?? server.alias_target,
    setId: fieldErrors.setId ?? server.set_identifier,
    weight: fieldErrors.weight ?? server.weight,
  };
  const shownValueErrors: DraftErrors = {
    rows: { ...serverValueErrors.rows, ...valueErrors.rows },
    general: valueErrors.general.length ? valueErrors.general : serverValueErrors.general,
  };

  const changeType = (next: RecordType) => {
    setType(next);
    setDraft(emptyDraft());
    setValueErrors({ rows: {}, general: [] });
    if (!RECORD_TYPE_META[next].aliasable) setAlias(false);
    setShowServerErrors(false);
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const nameError = editing ? null : validateRecordName(name);
    if (nameError) next.name = nameError;
    if (isAlias) {
      const aliasError = aliasTarget.trim() ? validateHostname(aliasTarget) : "Enter the DNS name this record should route traffic to.";
      if (aliasError) next.alias = aliasError;
    } else if (record?.type !== "SOA") {
      const ttlError = validateTtl(ttl);
      if (ttlError) next.ttl = ttlError;
    }
    if (policy === "WEIGHTED") {
      if (!setId.trim()) next.setId = "Enter a record ID to tell weighted records apart.";
      const weightError = validateIntInRange(weight, "Weight", 0, 255);
      if (weightError) next.weight = weightError;
    }
    const values = isAlias || record?.type === "SOA" ? { rows: {}, general: [] } : validateDraft(type, draft);
    setFieldErrors(next);
    setValueErrors(values);
    return Object.keys(next).length === 0 && Object.keys(values.rows).length === 0 && values.general.length === 0;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setShowServerErrors(true);
    if (!validate()) {
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    onSubmit({
      name: name.trim(),
      type,
      ttl: isAlias ? null : Number(ttl),
      values: isAlias ? [] : serialized.values,
      routing_policy: policy,
      set_identifier: policy === "WEIGHTED" ? setId.trim() : null,
      weight: policy === "WEIGHTED" ? Number(weight) : null,
      alias_target: isAlias ? aliasTarget.trim() : null,
      evaluate_target_health: isAlias && evaluateHealth,
      comment: comment.trim() || null,
    });
  };

  const clientErrorCount = Object.keys(fieldErrors).length + Object.keys(valueErrors.rows).length + valueErrors.general.length;
  const hasUnmappedServerError = serverError && showServerErrors && serverError.details.length === 0;

  return (
    <form onSubmit={submit} noValidate className={styles.form}>
      <div ref={summaryRef} tabIndex={-1} className={styles.summary}>
        {clientErrorCount > 0 && (
          <Alert type="error" header="There are problems with your configuration">
            Review the fields marked below and try again.
          </Alert>
        )}
        {hasUnmappedServerError && (
          <Alert type="error" header={editing ? "Couldn't update the record" : "Couldn't create the record"}>
            {serverError.message}
          </Alert>
        )}
        {serverError && showServerErrors && serverError.details.length > 0 && clientErrorCount === 0 && (
          <Alert type="error" header={serverError.message}>
            Review the fields marked below.
          </Alert>
        )}
      </div>

      <Container title="Record configuration">
        <div className={styles.fields}>
          <FormField
            id="record-name"
            label="Record name"
            description={editing ? "The name of an existing record can't be changed." : "Leave blank to create a record for the root domain."}
            error={errors.name}
          >
            {(props) => (
              <div className={styles.nameRow}>
                <Input {...props} value={name} onChange={(e) => setName(e.target.value)} disabled={editing || submitting} spellCheck={false} placeholder="www" maxLength={253} />
                <span className={styles.suffix}>.{suffix}</span>
              </div>
            )}
          </FormField>

          <FormField id="record-type" label="Record type" description={editing ? "The type of an existing record can't be changed." : undefined}>
            {(props) => (
              <Select {...props} value={record?.type ?? type} onChange={(e) => changeType(e.target.value as RecordType)} disabled={editing || submitting}>
                {record?.type === "SOA" && <option value="SOA">SOA – Start of authority</option>}
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t} – {RECORD_TYPE_META[t].description}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          {meta.aliasable && !locked && (
            <Choice
              type="checkbox"
              label="Alias"
              description="Route traffic to another DNS name, such as an AWS resource, without specifying a value or TTL."
              checked={alias}
              disabled={submitting}
              onChange={(e) => {
                setAlias(e.target.checked);
                setShowServerErrors(false);
              }}
            />
          )}

          {isAlias ? (
            <>
              <FormField id="alias-target" label="Route traffic to" description="Enter the DNS name of the target, for example d111111abcdef8.cloudfront.net." error={errors.alias}>
                {(props) => <Input {...props} value={aliasTarget} onChange={(e) => setAliasTarget(e.target.value)} disabled={submitting} spellCheck={false} />}
              </FormField>
              <Choice type="checkbox" label="Evaluate target health" description="Route 53 stops routing to the target if it is unhealthy." checked={evaluateHealth} disabled={submitting} onChange={(e) => setEvaluateHealth(e.target.checked)} />
            </>
          ) : (
            <>
              {record?.type === "SOA" ? (
                <FormField id="soa-value" label="Value" description="The SOA record is managed by Route 53 and can't be edited.">
                  {(props) => <Input {...props} value={record.values[0] ?? ""} readOnly className="mono" />}
                </FormField>
              ) : (
                <RecordValueFields type={type} draft={draft} errors={shownValueErrors} disabled={submitting} onChange={setDraft} />
              )}

              <FormField id="record-ttl" label="TTL (seconds)" description="Recommended values: 60 to 172800 (two days)." error={errors.ttl}>
                {(props) => (
                  <div className={styles.ttl}>
                    <Input {...props} value={ttl} inputMode="numeric" onChange={(e) => setTtl(e.target.value)} disabled={submitting} className={styles.ttlInput} />
                    <div className={styles.presets} role="group" aria-label="TTL presets">
                      {TTL_PRESETS.map((p) => (
                        <Button key={p.seconds} variant="link" disabled={submitting} onClick={() => setTtl(String(p.seconds))}>
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </FormField>
            </>
          )}

          {!locked && (
            <>
              <FormField id="routing-policy" label="Routing policy" description="Weighted routing splits traffic between several records that share a name and type.">
                {(props) => (
                  <Select {...props} value={policy} onChange={(e) => setPolicy(e.target.value as RoutingPolicy)} disabled={submitting}>
                    <option value="SIMPLE">Simple routing</option>
                    <option value="WEIGHTED">Weighted</option>
                  </Select>
                )}
              </FormField>

              {policy === "WEIGHTED" && (
                <div className={styles.pair}>
                  <FormField id="record-weight" label="Weight" description="A number from 0 to 255." error={errors.weight}>
                    {(props) => <Input {...props} value={weight} inputMode="numeric" onChange={(e) => setWeight(e.target.value)} disabled={submitting} />}
                  </FormField>
                  <FormField id="record-set-id" label="Record ID" description="A unique label for this weighted record." error={errors.setId}>
                    {(props) => <Input {...props} value={setId} onChange={(e) => setSetId(e.target.value)} disabled={submitting} maxLength={128} />}
                  </FormField>
                </div>
              )}

              <FormField id="record-comment" label="Comment" optional constraint="Maximum 256 characters.">
                {(props) => <Input {...props} value={comment} onChange={(e) => setComment(e.target.value)} disabled={submitting} maxLength={256} />}
              </FormField>
            </>
          )}
        </div>
      </Container>

      <div className={styles.actions}>
        <LinkButton href={cancelHref} variant="link">
          Cancel
        </LinkButton>
        <Button type="submit" variant="primary" loading={submitting}>
          {editing ? "Save" : "Create records"}
        </Button>
      </div>
    </form>
  );
}
