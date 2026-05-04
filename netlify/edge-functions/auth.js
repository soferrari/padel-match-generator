export default async (request, context) => {
    const auth = request.headers.get("Authorization");
    
    const credentials = Netlify.env.get("BASIC_AUTH_CREDENTIALS");
  
    if (!credentials) {
      console.error("Error: Variable BASIC_AUTH_CREDENTIALS no definida en Netlify.");
      return context.next(); 
    }
  
    const expectedAuth = `Basic ${btoa(credentials)}`;
  
    if (auth !== expectedAuth) {
      return new Response("No autorizado", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Acceso Restringido"' },
      });
    }
  
    return context.next();
  };