import React from "react";
import {
  UseDocumentSeoOptions,
  useDocumentSeo,
} from "../hooks/useDocumentSeo";

const Seo: React.FC<UseDocumentSeoOptions> = (props) => {
  useDocumentSeo(props);
  return null;
};

export default Seo;
