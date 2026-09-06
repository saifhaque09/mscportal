import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import { FileText, Download, Trash2, Plus, Loader2 } from "lucide-react";

const getDocTypeLabel = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "Img";
  if (mimeType === "application/pdf") return "Pdf";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "Zip";
  if (mimeType.includes("word") || mimeType.includes("document")) return "Doc";
  return "File";
};

const formatBytes = (bytes) => {
  const n = Number(bytes);
  if (!n) return "—";
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}kb`;
  return `${(n / (1024 * 1024)).toFixed(2)}mb`;
};

const EMPTY_FIELD = () => ({ id: Date.now(), dbId: null, code: "", value: "" });

const Step2AllDocuments = ({
  selectedSubcategory,
  documents,
  docsInfo,
  docsLoading,
  onSaveCodes,
  onBack,
  onSave,
  userId,
  getSubcategoryCodesList,
  subcategoryCodesList,
  subcategoryCodesInfo,
  subcategoryCodesListLoader,
  updateSubcategoryCode,
  deleteSubcategoryCode,
  downloadSubcategoryZip,
}) => {
  const [fields, setFields] = useState([EMPTY_FIELD()]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    setFields([EMPTY_FIELD()]);
    if (selectedSubcategory?.id && userId) {
      const alreadyLoaded =
        subcategoryCodesInfo?.sub_tax_category_id === selectedSubcategory.id &&
        subcategoryCodesList?.length > 0;
      if (!alreadyLoaded) {
        getSubcategoryCodesList?.(userId, selectedSubcategory.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategory?.id]);

  useEffect(() => {
    if (subcategoryCodesListLoader) return;
    if (subcategoryCodesList?.length) {
      setFields(
        subcategoryCodesList.map((item) => ({
          id: item.id,
          dbId: item.id,
          code: item.code ?? "",
          value: item.value ?? "",
        }))
      );
    }
  }, [subcategoryCodesList, subcategoryCodesListLoader]);

  const addField = () => {
    setFields((prev) => [...prev, EMPTY_FIELD()]);
  };

  const updateField = (id, key, val) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: val } : f))
    );
  };

  const handleDelete = async (fieldId) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    if (!field.dbId) {
      setFields((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== fieldId) : prev));
      return;
    }

    setDeletingId(fieldId);
    const result = await deleteSubcategoryCode?.(field.dbId);
    setDeletingId(null);
    if (result?.success) {
      setFields((prev) => {
        const next = prev.filter((f) => f.id !== fieldId);
        return next.length ? next : [EMPTY_FIELD()];
      });
    }
  };

  const handleSave = async () => {
    if (!selectedSubcategory?.id) return;

    const newFields = fields.filter((f) => !f.dbId && f.code.trim() && f.value.trim());
    const existingFields = fields.filter((f) => f.dbId && f.code.trim() && f.value.trim());

    if (!newFields.length && !existingFields.length) return;

    setSaving(true);
    const ops = [];

    if (newFields.length) {
      ops.push(onSaveCodes?.(selectedSubcategory.id, newFields));
    }
    existingFields.forEach((f) => {
      ops.push(updateSubcategoryCode?.(f.dbId, f.code, f.value, selectedSubcategory.id));
    });

    const results = await Promise.all(ops);
    setSaving(false);

    if (results.every((r) => r?.success)) {
      onSave?.();
    }
  };

  const title = docsInfo?.sub_category_name ?? selectedSubcategory?.name ?? "Subcategory";

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">{title}</h3>

      <div className="flex items-center justify-between gap-4">
        <Input className="max-w-[300px] h-9" placeholder="Search Doc Name" readOnly />
        <Button
          className="h-9 gap-2"
          disabled={downloadingZip}
          onClick={async () => {
            if (!selectedSubcategory?.id) return;
            setDownloadingZip(true);
            await downloadSubcategoryZip?.(selectedSubcategory.id);
            setDownloadingZip(false);
          }}
        >
          {downloadingZip ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloadingZip ? "Downloading…" : "Download Zip"}
        </Button>
      </div>

      <div className="flex gap-6 h-[500px]">
        {/* Left — Documents list */}
        <div className="w-[300px] flex-shrink-0 flex flex-col border rounded-md bg-card overflow-hidden">
          <div className="bg-foreground text-background px-4 py-3 font-medium text-sm">
            Documents
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {docsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <div className="h-6 w-6 bg-gray-200 rounded animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : !documents?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No documents found</p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 p-3 rounded-md hover:bg-accent border border-transparent hover:border-border transition-colors"
                >
                  <FileText className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{doc.document_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Type - {getDocTypeLabel(doc.document_type)} | {formatBytes(doc.document_size)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — Code / Value inputs */}
        <div className="flex-1 flex flex-col border rounded-md bg-card p-6 overflow-y-auto">
          {subcategoryCodesListLoader ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {fields.map((field) => (
                <div key={field.id} className="flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-semibold">Code</label>
                    <Input
                      placeholder="Enter Code"
                      className="h-10"
                      value={field.code}
                      onChange={(e) => updateField(field.id, "code", e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-semibold">Value</label>
                    <Input
                      placeholder="Enter Value"
                      className="h-10"
                      value={field.value}
                      onChange={(e) => updateField(field.id, "value", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-8">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-red-500"
                      onClick={() => handleDelete(field.id)}
                      disabled={deletingId === field.id}
                    >
                      {deletingId === field.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground"
                      onClick={addField}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <BackLink onClick={onBack} />
        <Button className="h-9 gap-2" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default Step2AllDocuments;
