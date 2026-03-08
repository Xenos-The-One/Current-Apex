/**
 * SEOPortal - Redirects to the full AI SEO Portal at /seo.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SEOPortal() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/seo");
  }, [navigate]);

  return null;
}
