"use client"
import React, { useState } from "react";
// import UploadDocuments from "../../UploadDocuments";
import { useSearchParams } from "next/navigation";
import UploadDocuments from "@/app/(authenticated)/documents/UploadDocuments";
import UploadCategoryDocuments from "@/components/individualclient/documents/upload/UploadCategoryDocuments";
// import UploadDocuments from "../../uploadDocuments";
const ViewDocument = () => {
  const urlParam=useSearchParams()
  const id=urlParam.get('id')
  const userCategory=urlParam.get('userCategory')
  return (
    
     
      <>
<UploadCategoryDocuments id={id} userCategory={userCategory}/>
    </>
  );
};

export default ViewDocument
