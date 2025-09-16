export interface Article {
  id: number;
  title: string;
  url: string;
  imageUrl: string;
  fullText: string;
  biasSeverity: number;
  source: string;
  analysis?: ArticleAnalysis;
}

export interface ArticleAnalysis {
  score: number;
  analysisSummary: string;
  detectedTerms: { term: string; explanation: string; }[];
  keishaTranslation: string;
}