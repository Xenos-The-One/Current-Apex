/**
 * NewSocialPost — Redirects to the AI SEO Portal Content page.
 * Social post creation is handled by the AI SEO Portal which provides
 * AI-generated captions, bulk generation, and scheduling.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function NewSocialPost() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/seo/content");
  }, [navigate]);

  return null;
}
