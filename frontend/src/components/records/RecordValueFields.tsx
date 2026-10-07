"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input, Select, Textarea } from "@/components/ui/Inputs";
import {
  RECORD_TYPE_META,
  emptyCaa,
  emptyMx,
  emptySrv,
  type CaaRow,
  type DraftErrors,
  type MxRow,
  type SrvRow,
  type ValueDraft,
} from "@/lib/record-types";
import { CAA_TAGS } from "@/lib/validation";
import type { RecordType } from "@/lib/types";
import styles from "./RecordValueFields.module.css";

interface Props {
  type: RecordType;
  draft: ValueDraft;
  errors: DraftErrors;
  disabled?: boolean;
  onChange: (draft: ValueDraft) => void;
}

function rowError(errors: DraftErrors, row: number): string | null {
  const key = Object.keys(errors.rows).find((k) => k.startsWith(`${row}.`));
  return key ? errors.rows[key] : null;
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item));
}

interface RowsProps<T> {
  rows: T[];
  onRows: (rows: T[]) => void;
  blank: () => T;
  addLabel: string;
  errors: DraftErrors;
  disabled?: boolean;
  render: (row: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  headers: string[];
  columns: string;
}

function RepeatableRows<T>({ rows, onRows, blank, addLabel, errors, disabled, render, headers, columns }: RowsProps<T>) {
  return (
    <div className={styles.rows}>
      <div className={styles.headerRow} style={{ gridTemplateColumns: columns }} aria-hidden="true">
        {headers.map((h) => (
          <span key={h}>{h}</span>
        ))}
        <span />
      </div>
      {rows.map((row, i) => {
        const error = rowError(errors, i);
        return (
          <div key={i} className={styles.rowWrap}>
            <div className={styles.row} style={{ gridTemplateColumns: columns }}>
              {render(row, (patch) => onRows(replaceAt(rows, i, { ...row, ...patch })), i)}
              <Button
                variant="icon"
                icon="close"
                aria-label={`Remove row ${i + 1}`}
                disabled={disabled || rows.length === 1}
                onClick={() => onRows(rows.filter((_, j) => j !== i))}
              />
            </div>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
          </div>
        );
      })}
      <div>
        <Button variant="link" icon="plus" disabled={disabled} onClick={() => onRows([...rows, blank()])}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

/** Renders the value inputs that match the selected record type. */
export function RecordValueFields({ type, draft, errors, disabled, onChange }: Props) {
  const meta = RECORD_TYPE_META[type];

  if (meta.kind === "lines") {
    return (
      <FormField
        id="record-values"
        label={meta.label}
        description={meta.help}
        error={errors.general.length ? errors.general.join(" ") : null}
      >
        {(props) => (
          <Textarea
            {...props}
            value={draft.lines}
            rows={4}
            placeholder={meta.placeholder}
            disabled={disabled}
            spellCheck={false}
            className="mono"
            onChange={(e) => onChange({ ...draft, lines: e.target.value })}
          />
        )}
      </FormField>
    );
  }

  const generalError = errors.general.length ? errors.general.join(" ") : null;

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{meta.label}</legend>
      <p className={styles.help}>{meta.help}</p>
      {meta.kind === "mx" && (
        <RepeatableRows<MxRow>
          rows={draft.mx}
          onRows={(mx) => onChange({ ...draft, mx })}
          blank={emptyMx}
          addLabel="Add another mail server"
          errors={errors}
          disabled={disabled}
          headers={["Priority", "Mail server"]}
          columns="90px 1fr 32px"
          render={(row, update, i) => (
            <>
              <Input aria-label={`Priority, row ${i + 1}`} inputMode="numeric" value={row.priority} disabled={disabled} onChange={(e) => update({ priority: e.target.value })} aria-invalid={errors.rows[`${i}.priority`] ? true : undefined} />
              <Input aria-label={`Mail server, row ${i + 1}`} value={row.host} placeholder={meta.placeholder} disabled={disabled} spellCheck={false} onChange={(e) => update({ host: e.target.value })} aria-invalid={errors.rows[`${i}.host`] ? true : undefined} />
            </>
          )}
        />
      )}
      {meta.kind === "srv" && (
        <RepeatableRows<SrvRow>
          rows={draft.srv}
          onRows={(srv) => onChange({ ...draft, srv })}
          blank={emptySrv}
          addLabel="Add another service"
          errors={errors}
          disabled={disabled}
          headers={["Priority", "Weight", "Port", "Target"]}
          columns="80px 80px 80px 1fr 32px"
          render={(row, update, i) => (
            <>
              <Input aria-label={`Priority, row ${i + 1}`} inputMode="numeric" value={row.priority} disabled={disabled} onChange={(e) => update({ priority: e.target.value })} aria-invalid={errors.rows[`${i}.priority`] ? true : undefined} />
              <Input aria-label={`Weight, row ${i + 1}`} inputMode="numeric" value={row.weight} disabled={disabled} onChange={(e) => update({ weight: e.target.value })} aria-invalid={errors.rows[`${i}.weight`] ? true : undefined} />
              <Input aria-label={`Port, row ${i + 1}`} inputMode="numeric" value={row.port} placeholder="5060" disabled={disabled} onChange={(e) => update({ port: e.target.value })} aria-invalid={errors.rows[`${i}.port`] ? true : undefined} />
              <Input aria-label={`Target, row ${i + 1}`} value={row.target} placeholder={meta.placeholder} disabled={disabled} spellCheck={false} onChange={(e) => update({ target: e.target.value })} aria-invalid={errors.rows[`${i}.target`] ? true : undefined} />
            </>
          )}
        />
      )}
      {meta.kind === "caa" && (
        <RepeatableRows<CaaRow>
          rows={draft.caa}
          onRows={(caa) => onChange({ ...draft, caa })}
          blank={emptyCaa}
          addLabel="Add another authority"
          errors={errors}
          disabled={disabled}
          headers={["Flags", "Tag", "Value"]}
          columns="70px 130px 1fr 32px"
          render={(row, update, i) => (
            <>
              <Input aria-label={`Flags, row ${i + 1}`} inputMode="numeric" value={row.flags} disabled={disabled} onChange={(e) => update({ flags: e.target.value })} aria-invalid={errors.rows[`${i}.flags`] ? true : undefined} />
              <Select aria-label={`Tag, row ${i + 1}`} value={row.tag} disabled={disabled} onChange={(e) => update({ tag: e.target.value })}>
                {CAA_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <Input aria-label={`Value, row ${i + 1}`} value={row.value} placeholder={meta.placeholder} disabled={disabled} spellCheck={false} onChange={(e) => update({ value: e.target.value })} />
            </>
          )}
        />
      )}
      {generalError && (
        <div className={styles.error} role="alert">
          {generalError}
        </div>
      )}
    </fieldset>
  );
}
