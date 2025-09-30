import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  article?: {
    publishedTime: string;
    modifiedTime?: string;
    author: string;
    section: string;
    tags: string[];
  };
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = '/og-image.jpg',
  article
}) => {
  const siteName = 'FindGreatStocks - Market Intelligence Platform';
  const siteUrl = 'https://findgreatstocks.com';
  const fullTitle = `${title} | ${siteName}`;
  const fullCanonicalUrl = canonicalUrl ? `${siteUrl}${canonicalUrl}` : undefined;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="FindGreatStocks Team" />
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* Canonical URL */}
      {fullCanonicalUrl && <link rel="canonical" href={fullCanonicalUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={article ? "article" : "website"} />
      <meta property="og:url" content={fullCanonicalUrl || siteUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      
      {/* Article specific meta tags */}
      {article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          {article.modifiedTime && (
            <meta property="article:modified_time" content={article.modifiedTime} />
          )}
          <meta property="article:author" content={article.author} />
          <meta property="article:section" content={article.section} />
          {article.tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullCanonicalUrl || siteUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />
      <meta name="twitter:creator" content="@findgreatstocks" />
      <meta name="twitter:site" content="@findgreatstocks" />
      
      {/* Additional SEO */}
      <meta name="theme-color" content="#2563eb" />
      <meta name="msapplication-TileColor" content="#2563eb" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": article ? "Article" : "WebSite",
          "name": fullTitle,
          "description": description,
          "url": fullCanonicalUrl || siteUrl,
          "image": `${siteUrl}${ogImage}`,
          "publisher": {
            "@type": "Organization",
            "name": siteName,
            "url": siteUrl,
            "logo": {
              "@type": "ImageObject",
              "url": `${siteUrl}/logo.png`
            }
          },
          ...(article && {
            "datePublished": article.publishedTime,
            "dateModified": article.modifiedTime || article.publishedTime,
            "author": {
              "@type": "Person",
              "name": article.author
            },
            "articleSection": article.section,
            "keywords": article.tags.join(", ")
          })
        })}
      </script>
    </Helmet>
  );
};

export default SEOHead;
