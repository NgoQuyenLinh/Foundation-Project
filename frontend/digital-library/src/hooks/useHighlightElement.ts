// src/hooks/useHighlightElement.ts

import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useHighlightElement(paramName = "highlight_doc") {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get(paramName);

  useEffect(() => {
    if (highlightId) {
      const prefix = paramName.includes("group") ? "group-" : "doc-";
      
      const timer = setTimeout(() => {
        const element = document.getElementById(`${prefix}${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          element.classList.add(
            "ring-4",
            "ring-primary-400",
            "bg-primary-50",
            "transition-all",
            "duration-500"
          );

          setTimeout(() => {
            element.classList.remove("ring-4", "ring-primary-400", "bg-primary-50");
            searchParams.delete(paramName);
            setSearchParams(searchParams, { replace: true });
          }, 3000);
        }
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [highlightId, searchParams, setSearchParams, paramName]);
}