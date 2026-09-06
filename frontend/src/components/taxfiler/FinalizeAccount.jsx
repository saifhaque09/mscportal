"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useTaxfilerApi from "@/api/useTaxfilerApi";
import useDocumentApi from "@/api/useDocumentApi";

import Step1AllSubcategory from "./FinalizeSteps/Step1AllSubcategory";
import Step2AllDocuments from "./FinalizeSteps/Step2AllDocuments";
import Step3CodeSummary from "./FinalizeSteps/Step3CodeSummary";
import Step4TaxReturnForm from "./FinalizeSteps/Step4TaxReturnForm";
import ListingPageLayout from "@/components/layout/ListingPageLayout";

const STEPS = [
  { id: 1, label: "All Subcategory" },
  { id: 2, label: "All Documents" },
  { id: 3, label: "Code Summary" },
  { id: 4, label: "Tax Return Form" },
];

const FinalizeAccount = () => {
  const params = useSearchParams();
  const {
    getAllAccountantCategories,
    accountantCategory,
    dashboardLoader,
    getUserCategories,
    userCategoryData,
    loader,
    getSubcategoryDocuments,
    saveSubcategoryCodes,
    subcategoryDocuments,
    subcategoryDocsInfo,
    subcategoryDocsLoader,
    getSubcategoryCodesList,
    subcategoryCodesList,
    subcategoryCodesListMeta,
    subcategoryCodesInfo,
    subcategoryCodesListLoader,
    updateSubcategoryCode,
    deleteSubcategoryCode,
    uploadIncomeTaxReturn,
    downloadSubcategoryZip,
  } = useTaxfilerApi();
  const { downloadDocument, loading: downloadLoading } = useDocumentApi();

  const [role, setRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [step, setStep] = useState(1);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  const taxFilerGuidParam = params.get("taxFilerGuid");
  const userIdParam = params.get("userId");
  const [effectiveTaxFilerGuid, setEffectiveTaxFilerGuid] = useState("");

  useEffect(() => {
    setRole(localStorage.getItem("userRole") || "");

    if (taxFilerGuidParam) {
      setEffectiveTaxFilerGuid(String(taxFilerGuidParam));
    } else {
      const stored = sessionStorage.getItem("activeTaxFilerGuid") || "";
      if (stored) setEffectiveTaxFilerGuid(stored);
    }
  }, [taxFilerGuidParam]);

  useEffect(() => {
    if (!role) return;
    if (role === "accountant" || role === "admin") {
      if (userIdParam) getAllAccountantCategories(userIdParam);
      return;
    }
    if (role === "taxfiler") {
      getUserCategories();
    }
  }, [role, userIdParam]);

  const yearOptions = useMemo(
    () => [
      String(new Date().getFullYear()),
      String(new Date().getFullYear() - 1),
      String(new Date().getFullYear() - 2),
    ],
    [],
  );

  const categoryData = role === "accountant" || role === "admin" ? accountantCategory : userCategoryData;
  const categoryLoading = role === "accountant" || role === "admin" ? dashboardLoader : loader;

  const rows = useMemo(() => {
    const list = Array.isArray(categoryData) ? categoryData : [];
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((item) => String(item?.name || "").toLowerCase().includes(term));
  }, [categoryData, searchTerm]);

  const handleNext = useCallback(() => setStep((prev) => Math.min(prev + 1, 4)), []);
  const handleBack = useCallback(() => setStep((prev) => Math.max(prev - 1, 1)), []);

  const handleSelectSubcategory = useCallback((subcategory) => {
    setSelectedSubcategory(subcategory);
    if (userIdParam) getSubcategoryDocuments(userIdParam, subcategory.id);
    setStep(2);
  }, [userIdParam, getSubcategoryDocuments]);

  const handleSaveCodes = useCallback(
    (subTaxCategoryId, pairs) => saveSubcategoryCodes(userIdParam, subTaxCategoryId, pairs),
    [saveSubcategoryCodes, userIdParam]
  );

  const handleUpdateSubcategoryCode = useCallback(
    (id, code, value, subTaxCategoryId) => updateSubcategoryCode(userIdParam, id, code, value, subTaxCategoryId),
    [updateSubcategoryCode, userIdParam]
  );

  const handleDeleteSubcategoryCode = useCallback(
    (id) => deleteSubcategoryCode(userIdParam, id),
    [deleteSubcategoryCode, userIdParam]
  );

  const handleUploadIncomeTaxReturn = useCallback(
    (file, title, year) => uploadIncomeTaxReturn(userIdParam, file, title, year),
    [uploadIncomeTaxReturn, userIdParam]
  );

  const handleDownloadSubcategoryZip = useCallback(
    (subCategoryId) => downloadSubcategoryZip(userIdParam, subCategoryId, selectedYear),
    [downloadSubcategoryZip, userIdParam, selectedYear]
  );

  const handleFinishSuccess = useCallback(() => {
    setStep(1);
    if (role === "accountant" || role === "admin") {
      if (userIdParam) getAllAccountantCategories(userIdParam);
    } else if (role === "taxfiler") {
      getUserCategories();
    }
  }, [role, userIdParam, getAllAccountantCategories, getUserCategories]);

  return (
    <ListingPageLayout
      title={`Finalize Account - Step ${step}`}
      subtitle={effectiveTaxFilerGuid ? `TaxFilerGuid: ${effectiveTaxFilerGuid}` : "Oliva Martin (Criteria Selected - Student)"}
      bordered={false}
    >
      <div className="flex w-full items-center">
        {STEPS.map((s, idx) => {
          const isActive = s.id === step;
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                className={`relative flex flex-1 flex-col items-start rounded-md border bg-card px-4 py-3 text-left cursor-default ${
                  isActive ? "border-foreground" : "border-input opacity-60"
                }`}
              >
                <div className="text-2xl font-bold leading-none">
                  {String(s.id).padStart(2, "0")}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {s.label}
                </div>
                <span
                  className={`absolute right-4 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border ${
                    isActive
                      ? "bg-foreground border-foreground"
                      : "bg-card border-muted-foreground"
                  }`}
                />
              </button>
              {idx < STEPS.length - 1 ? (
                <div className="flex flex-1 justify-center px-4">
                  <div
                    className={`h-px w-full ${isActive ? "bg-foreground" : "bg-border"}`}
                  />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      {step === 1 && (
        <Step1AllSubcategory
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          yearOptions={yearOptions}
          effectiveTaxFilerGuid={effectiveTaxFilerGuid}
          downloadDocument={downloadDocument}
          downloadLoading={downloadLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          rows={rows}
          loading={categoryLoading}
          onSelectSubcategory={handleSelectSubcategory}
          onNext={handleNext}
        />
      )}
      {step === 2 && (
        <Step2AllDocuments
          selectedSubcategory={selectedSubcategory}
          documents={subcategoryDocuments}
          docsInfo={subcategoryDocsInfo}
          docsLoading={subcategoryDocsLoader}
          onSaveCodes={handleSaveCodes}
          onBack={handleBack}
          onSave={handleNext}
          userId={userIdParam}
          getSubcategoryCodesList={getSubcategoryCodesList}
          subcategoryCodesList={subcategoryCodesList}
          subcategoryCodesInfo={subcategoryCodesInfo}
          subcategoryCodesListLoader={subcategoryCodesListLoader}
          updateSubcategoryCode={handleUpdateSubcategoryCode}
          deleteSubcategoryCode={handleDeleteSubcategoryCode}
          downloadSubcategoryZip={handleDownloadSubcategoryZip}
        />
      )}
      {step === 3 && (
        <Step3CodeSummary
          userId={userIdParam}
          selectedSubcategory={selectedSubcategory}
          codesData={subcategoryCodesList}
          codesMeta={subcategoryCodesListMeta}
          codesInfo={subcategoryCodesInfo}
          codesLoading={subcategoryCodesListLoader}
          onFetch={getSubcategoryCodesList}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}
      {step === 4 && (
        <Step4TaxReturnForm
          onBack={handleBack}
          onUpload={handleUploadIncomeTaxReturn}
          onSuccess={handleFinishSuccess}
        />
      )}
    </ListingPageLayout>
  );
};

export default FinalizeAccount;
