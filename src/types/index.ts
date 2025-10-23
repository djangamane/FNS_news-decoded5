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
  analysis?: ArticleAnalysis;
}

export interface BlogEntry {
  id: string;
  title: string;
  newsletter: string;
  relatedArticles?: string;
  publishedAt?: string | null;
}

export interface BlogPost {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  slug: string;
  relatedArticles?: string;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
}
