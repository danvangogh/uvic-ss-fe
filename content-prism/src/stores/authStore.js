import { ref } from "vue";
import { supabase } from "../supabase";
import Cookies from "js-cookie";

const user = ref(null);
const loading = ref(true);

// Initialize user on page load
supabase.auth.getSession().then(({ data: { session } }) => {
  user.value = session?.user ?? null;
  loading.value = false;
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_, session) => {
  user.value = session?.user ?? null;
  if (session?.user) {
    // Set cookies for backward compatibility
    Cookies.set("username", session.user.email, { expires: 30 });
    // You'll need to set the role based on your Supabase user metadata or claims
    const role = session.user.user_metadata.role || "uvicSS";
    Cookies.set("role", role, { expires: 30 });
  } else {
    // Clear cookies on logout
    Cookies.remove("username");
    Cookies.remove("role");
  }
});

export function useAuth() {
  async function signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        console.error("Signup error:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Unexpected error during signup:", error);
      return { data: null, error };
    }
  }

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
