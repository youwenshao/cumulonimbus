import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/route.ts:5',message:'NextAuth init',data:{url:process.env.NEXTAUTH_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
// #endregion

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
