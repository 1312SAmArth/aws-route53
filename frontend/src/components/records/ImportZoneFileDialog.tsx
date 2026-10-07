"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Inputs";
import { Modal } from "@/components/ui/Modal";
import { useImportRecords } from "@/hooks/useRecords";
import { ApiError } from "@/lib/api-client";
import { plural } from "@/lib/format";
import styles from "./ImportZoneFileDialog.module.css";

const MAX_BYTES = 256 * 1024;

export function ImportZoneFileDialog({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const importRecords = useImportRecords(zoneId);
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const result = importRecords.data;
  const error = importRecords.error instanceof ApiError ? importRecords.error.message : importRecords.error ? "The zone file couldn't be imported." : null;

  const onFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFileError(`Zone files are limited to ${MAX_BYTES / 1024} KB.`);
      return;
    }
    setContent(await file.text());
  };

  if (result) {
    return (
      <Modal title="Import zone file" onClose={onClose} footer={<Button variant="primary" onClick={onClose} data-autofocus>Done</Button>}>
        <Alert type={result.created > 0 ? "success" : "warning"} header={`Imported ${plural(result.created, "record set")}`}>
          {result.skipped.length > 0 ? `${plural(result.skipped.length, "line")} could not be imported.` : "Every record in the file was imported."}
        </Alert>
        {result.skipped.length > 0 && (
          <ul className={styles.skipped} aria-label="Skipped lines">
            {result.skipped.map((s, i) => (
              <li key={i}>
                <span className={styles.line}>Line {s.line}</span> {s.reason}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      title="Import zone file"
      onClose={onClose}
      dismissible={!importRecords.isPending}
      footer={
        <>
          <Button variant="link" onClick={onClose} disabled={importRecords.isPending}>
            Cancel
          </Button>
          <Button variant="primary" loading={importRecords.isPending} disabled={!content.trim()} onClick={() => importRecords.mutate(content)}>
            Import
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <p>Paste a BIND zone file or choose one from your computer. Records are validated like any other record; lines that fail are reported and skipped. Existing records are never overwritten.</p>
        <div>
          <input ref={fileInput} type="file" accept=".zone,.txt,.db,text/plain" className="sr-only" aria-label="Zone file" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button icon="upload" onClick={() => fileInput.current?.click()}>
            Choose file
          </Button>
        </div>
        <FormField id="zone-file-content" label="Zone file contents" error={fileError}>
          {(props) => (
            <Textarea
              {...props}
              className="mono"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder={"$ORIGIN example.com.\n$TTL 300\nwww IN A 192.0.2.1"}
              data-autofocus
            />
          )}
        </FormField>
        {error && (
          <Alert type="error" header="Couldn't import the zone file">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
