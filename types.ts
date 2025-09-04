export interface ArticleAnalysis {
  score: number;
  analysisSummary: string;
  detectedTerms: { term: string; explanation: string; }[];
  keishaTranslation: string;
}

export interface Article {
  id: number;
  title: string;
  url: string;
  imageUrl: string;
  fullText: string;
  biasSeverity: number;
  source: string;
  // Analysis is now an optional part of the Article object
  analysis?: ArticleAnalysis;
}