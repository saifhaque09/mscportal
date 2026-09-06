"use client"
import React, { useState } from "react";
import UploadDocuments from "../../UploadDocuments";
import { useSearchParams } from "next/navigation";
// import UploadDocuments from "../../uploadDocuments";
const ViewDocument = () => {
  const urlParam=useSearchParams()
  const id=urlParam.get('id')
  return (
    <>
      <UploadDocuments id={id}/>
    </>
  );
};

export default ViewDocument
