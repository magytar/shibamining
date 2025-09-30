import { supabase } from "@/lib/supabase";

export async function POST(parms) {
    const { email, senha } = await parms.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
    });
    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ user: data.user }), { status: 200 });
}