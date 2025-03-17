import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode"; // ✅ Correct import

interface UserPayload {
  id: string;
  username: string;
  role: string;
  exp: number; // JWT expiration time
}

const useAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true); // ✅ Add loading state

  // ✅ Detect if running inside a PWA
  const isPWA = (): boolean => {
    if (typeof window === "undefined") return false;

    return (
      // iOS PWA check
      (window.navigator as any).standalone === true ||
      // Android PWA check
      window.matchMedia("(display-mode: standalone)").matches
    );
  };

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const decoded: UserPayload = jwtDecode(token); // ✅ Decode JWT properly

        // ✅ Check if token is expired
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
          console.warn("Token expired, logging out...");
          localStorage.removeItem("token");
          setUser(null);
          setLoading(false);
          
          // ✅ Redirect to correct login page based on environment
          router.push(isPWA() ? "/login-mobile" : "/login-desktop");
          return;
        }

        setUser(decoded);
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem("token"); // Clear invalid token
        setUser(null);

        // ✅ Redirect based on PWA detection
        router.push(isPWA() ? "/login-mobile" : "/login-desktop");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { user, loading }; // ✅ Return user and loading state
};

export default useAuth;

