"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Eye,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Loader2,
  Variable,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EditorProvider,
  Editor,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnBulletList,
  BtnNumberedList,
  BtnLink,
  BtnUndo,
  BtnRedo,
  BtnClearFormatting,
  Separator,
  createButton,
  createDropdown,
} from "react-simple-wysiwyg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { Skeleton } from "@/components/ui/skeleton";
import useSettingsApi from "@/api/useSettingApi";



const variableOptions = [

  { label: "App Name", token: "{{$app_name}}" },
  { label: "App URL", token: "{{$app_url}}" },
  { label: "First Name", token: "{{$first_name}}" },
  { label: "Last Name", token: "{{$last_name" }
];

const paragraphOptions = [
  ["Paragraph", "formatBlock", "P"],
  ["Heading 1", "formatBlock", "H1"],
  ["Heading 2", "formatBlock", "H2"],
  ["Heading 3", "formatBlock", "H3"],
  ["Quote", "formatBlock", "BLOCKQUOTE"],
  ["Code", "formatBlock", "PRE"],
];

const fontOptions = [
  ["Arial", "fontName", "Arial"],
  ["Georgia", "fontName", "Georgia"],
  ["Times New Roman", "fontName", "Times New Roman"],
  ["Verdana", "fontName", "Verdana"],
  ["Courier New", "fontName", "Courier New"],
];

const fontSizeOptions = [
  ["10", "fontSize", "1"],
  ["12", "fontSize", "2"],
  ["14", "fontSize", "3"],
  ["16", "fontSize", "4"],
  ["18", "fontSize", "5"],
  ["24", "fontSize", "6"],
  ["32", "fontSize", "7"],
];

const BtnParagraph = createDropdown("Paragraph", paragraphOptions);
const BtnFont = createDropdown("Font", fontOptions);
const BtnFontSize = createDropdown("Size", fontSizeOptions);
const BtnAlignLeft = createButton(
  "Align left",
  <AlignLeft className="size-4" />,
  "justifyLeft"
);
const BtnAlignCenter = createButton(
  "Align center",
  <AlignCenter className="size-4" />,
  "justifyCenter"
);
const BtnAlignRight = createButton(
  "Align right",
  <AlignRight className="size-4" />,
  "justifyRight"
);
const BtnAlignJustify = createButton(
  "Justify",
  <AlignJustify className="size-4" />,
  "justifyFull"
);
const findClosestTag = (node, tagName) => {
  let current = node;
  while (current && current !== document) {
    if (
      current.nodeType === 1 &&
      current.tagName === tagName
    ) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const indentCommand = ({ $selection, $el }) => {
  if ($el && document.activeElement !== $el) {
    $el.focus();
  }
  const inListItem = findClosestTag($selection, "LI");
  if (inListItem) {
    document.execCommand("indent");
    return;
  }
  const inBlockquote = findClosestTag($selection, "BLOCKQUOTE");
  if (!inBlockquote) {
    document.execCommand("formatBlock", false, "BLOCKQUOTE");
    return;
  }
  document.execCommand("indent");
};

const outdentCommand = ({ $selection, $el }) => {
  if ($el && document.activeElement !== $el) {
    $el.focus();
  }
  const inListItem = findClosestTag($selection, "LI");
  if (inListItem) {
    document.execCommand("outdent");
    return;
  }
  const inBlockquote = findClosestTag($selection, "BLOCKQUOTE");
  if (inBlockquote) {
    document.execCommand("formatBlock", false, "P");
    return;
  }
  document.execCommand("outdent");
};

const BtnIndent = createButton(
  "Indent",
  <IndentIncrease className="size-4" />,
  indentCommand
);
const BtnOutdent = createButton(
  "Outdent",
  <IndentDecrease className="size-4" />,
  outdentCommand
);
const BtnImage = createButton(
  "Insert image",
  <ImageIcon className="size-4" />,
  () => {
    // eslint-disable-next-line no-alert
    const url = prompt("Image URL", "");
    if (url) {
      document.execCommand("insertImage", false, url);
    }
  }
);

const defaultBody = `
<p>Hi {{username}},</p>
<p>We are following up on your request to use the secure client portal offered by {{Firm Name}}.</p>
<p><strong>Turn on Your Portal Access</strong></p>
<p>To finish registering for your portal, kindly click the link below:</p>
<p>{{Portal Login Link}}</p>
<p>After activation, you will have the ability to:</p>
<ul>
  <li>Safely upload documents</li>
  <li>Get and pay invoices</li>
  <li>Interact with our team directly</li>
  <li>View financial data and updates</li>
</ul>
<p>Warm regards,</p>
<p>{{Accountant Name}}</p>
`;

const EmailTemplateSettings = () => {
  const [selectedTemplate, setSelectedTemplate] = useState("Re-Invite Email");
  const { getAllEmailTemplates, allTemplatesData, loader, saveEmailTemplate, saving } =
    useSettingsApi();
  const [templates, setTemplates] = useState([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [subject, setSubject] = useState(
    "Please Activate Your Client Portal Access"
  );
  const [body, setBody] = useState(defaultBody);
  useEffect(() => {
    getAllEmailTemplates();
  }, []);
  const previewTitle = useMemo(() => {
    if (selectedTemplate === "Re-Invite Email") return "Reinvite Client";
    return selectedTemplate;
  }, [selectedTemplate]);

  const insertVariable = (token) => {
    setBody((prev) => `${prev}${token}`);
  };
  useEffect(() => {
    if (allTemplatesData?.length) {
      setTemplates(allTemplatesData);
      setSelectedTemplate(allTemplatesData[0].name);
    }
  }, [allTemplatesData]);

  useEffect(() => {
    if (!templates?.length || !selectedTemplate) return;

    const selected = templates.find(
      (template) => template.name === selectedTemplate
    );

    if (selected) {
      setSubject(selected.subject || "");
      setBody(selected.body || "");
    }
  }, [selectedTemplate, templates]);

  const openRenameDialog = () => {
    setRenameValue(selectedTemplate || "");
    setRenameOpen(true);
  };

  const handleRenameSave = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;

    setTemplates((prev) =>
      prev.map((template) =>
        template.name === selectedTemplate
          ? { ...template, name: trimmed }
          : template
      )
    );
    setSelectedTemplate(trimmed);
    setRenameOpen(false);
  };
  const handleSaveTemplate = async () => {
    const selected = templates.find(
      (template) => template.name === selectedTemplate
    );
    const templateId = selected?.id ?? selected?.template_id ?? selected?.guid;
    if (!templateId) {
      toast.error("Unable to find template id");
      return;
    }
    const success = await saveEmailTemplate({
      templateId,
      name: selectedTemplate,
      subject,
      body,
    });
    if (success) {
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === templateId || template.template_id === templateId
            ? { ...template, name: selectedTemplate, subject, body }
            : template
        )
      );
    }
  };
  console.log(body, 'llll')
  return (
    <>
      {loader ? (
        <Card className="w-full">
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-1/3" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-64" />
              </div>
            </div>
            <div className="space-y-4 pt-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-24 pt-4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-16 pt-4" />
              <Skeleton className="h-80 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {previewTitle}
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  className="bg-black text-white hover:bg-gray-900"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="mr-2 size-4" />
                  Preview
                </Button>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger className="w-[260px] bg-white">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {templates?.map((option) => (
                      <SelectItem key={option?.name} value={option?.name}>
                        {option?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 grid gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Select Template
                </Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((option) => (
                      <SelectItem key={option.id} value={option.name}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:underline"
                  onClick={openRenameDialog}
                >
                  Rename Template
                </button>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Subject</Label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Email subject"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Body</Label>
                <div className="rounded-md border border-gray-200 bg-white">
                  <EditorProvider>
                    <Toolbar className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 py-2">
                      <BtnUndo />
                      <BtnRedo />
                      <Separator />
                      <BtnParagraph />
                      <BtnFont />
                      <BtnFontSize />
                      <Separator />
                      <BtnBold />
                      <BtnItalic />
                      <BtnUnderline />
                      <BtnStrikeThrough />
                      <Separator />
                      <BtnAlignLeft />
                      <BtnAlignCenter />
                      <BtnAlignRight />
                      <BtnAlignJustify />
                      <Separator />
                      <BtnBulletList />
                      <BtnNumberedList />
                      <BtnOutdent />
                      <BtnIndent />
                      <Separator />
                      <BtnLink />
                      {/* <BtnImage /> */}
                      {/* <BtnClearFormatting /> */}
                      <div className="ml-auto">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-8 border-gray-200 bg-white text-xs"
                            >
                              <Variable className="mr-2 size-3.5" />
                              Dynamic Variables
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {variableOptions.map((variable) => (
                              <DropdownMenuItem
                                key={variable.token}
                                onClick={() => insertVariable(variable.token)}
                              >
                                {variable.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Toolbar>
                    <Editor
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      className="min-h-[320px] w-full px-3 py-3 text-sm text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    />
                  </EditorProvider>
                </div>
              </div>

              <div>
                <Button

                  onClick={handleSaveTemplate}
                  disabled={saving}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>

          <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
            <DialogContent
              showCloseButton={false}
              className="max-w-[360px] rounded-lg border border-gray-200 p-5"
            >
              <DialogHeader className="gap-1">
                <DialogTitle className="text-sm font-semibold text-gray-900">
                  Rename Email Template
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-gray-700">
                  Template Name
                </Label>
                <Input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="h-9"
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="h-8 border-gray-200"
                  onClick={() => setRenameOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="h-8 bg-black text-white hover:bg-gray-900"
                  onClick={handleRenameSave}
                >
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-[520px] rounded-lg border border-gray-200 p-0">
              <DialogHeader className="px-6 pt-5">
                <DialogTitle className="text-sm font-semibold text-gray-900">
                  {previewTitle}
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-5">
                <div className="rounded-md border border-gray-200 bg-white shadow-sm">
                  <div className="rounded-t-md bg-black px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">
                    <h2 class="text-lg font-bold text-white">MSC <span class="text-blue-600">Portal</span></h2>
                    {/* MSC <span className="text-blue-600">Portal</span> */}
                  </div>
                  <div className="space-y-4 px-5 py-4 text-sm text-gray-700">
                    <h3 className="text-base font-semibold text-gray-900">
                      {subject}
                    </h3>
                    <div
                      className="prose prose-sm max-w-none text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                      dangerouslySetInnerHTML={{ __html: body }}
                    />
                  </div>
                  <div className="rounded-b-md bg-black px-4 py-3 text-center text-[11px] text-white">
                    © 2026 MSC Portal. All rights reserved.
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    className="h-8 border-gray-200"
                    onClick={() => setPreviewOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Card>

      )}
    </>
  );
};

export default EmailTemplateSettings;
