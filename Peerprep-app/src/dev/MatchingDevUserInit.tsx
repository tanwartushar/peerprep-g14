import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { syncMatchingDevUserFromSearch } from "./matchingDevUser";

/** DEV: reads `?user=` and stores it for matching `x-user-id` override. */
export function MatchingDevUserInit(): null {
  const location = useLocation();

  useEffect(() => {
    syncMatchingDevUserFromSearch(location.search);
  }, [location.search]);

  return null;
}
