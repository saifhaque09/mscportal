"use client";

import { useState } from "react";
import { UploadDocumentsModal } from "./UploadDocumentsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const MOCK_DOCUMENTS = [
  {
    id: "1",
    category: "Income",
    taxCategory: "Salaried",
    description: "T4 Slip",
  },
  {
    id: "2",
    category: "Deductions",
    taxCategory: "RRSP",
    description: "RRSP Contribution Receipt",
  },
];

export function DocumentChecklist() {
  const [uploadRow, setUploadRow] = useState(null);
  const [rowsState, setRowsState] = useState({}); // {checklistId: {status, remark, files: []}}

  // 2. We now use the mock array directly instead of useMemo filtering
  const rows = MOCK_DOCUMENTS;

  const handleSaveUpload = ({ checklistId, remark, files }) => {
    setRowsState((prev) => ({
      ...prev,
      [checklistId]: {
        status: files.length
          ? "Uploaded"
          : prev[checklistId]?.status || "Pending",
        remark: remark || prev[checklistId]?.remark || "",
        files: [...(prev[checklistId]?.files || []), ...files],
      },
    }));
  };

  const getRowState = (id) =>
    rowsState[id] || { status: "Pending", remark: "", files: [] };

  const renderStatusBadge = (status) => {
    if (status === "Uploaded") {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-red-400 text-red-600">
        Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Input placeholder="Filter tasks..." className="max-w-xs" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" disabled />
              </th>
              <th className="px-4 py-3">Documents Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Remark</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const state = getRowState(row.id);
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3 align-top">
                    <input type="checkbox" />
                  </td>
                  <td className="px-4 py-3 align-top font-medium">
                    {row.category}
                    <div className="text-xs text-muted-foreground capitalize">
                      {row.taxCategory}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {row.description}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {renderStatusBadge(state.status)}
                  </td>
                  <td className="px-4 py-3 align-top text-xs">
                    {state.files.length === 0
                      ? "---"
                      : state.files.map((f) => (
                        <div key={f.id} className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">
                            {f.name}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            🗑
                          </button>
                        </div>
                      ))}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Input
                      defaultValue={state.remark}
                      placeholder="Remark"
                      onBlur={(e) =>
                        setRowsState((prev) => ({
                          ...prev,
                          [row.id]: {
                            ...getRowState(row.id),
                            remark: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Button size="sm" onClick={() => setUploadRow(row)}>
                      Upload
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{rows.length} row(s)</span>
        <span>Rows per page 10 · Page 1 of 1</span>
      </div>

      {uploadRow && (
        <UploadDocumentsModal
          open={!!uploadRow}
          checklistRow={uploadRow}
          onClose={() => setUploadRow(null)}
          onSave={handleSaveUpload}
        />
      )}
    </div>
  );
}
