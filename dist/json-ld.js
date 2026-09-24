function K(z){return JSON.stringify(z).replaceAll("&","\\u0026").replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("\u2028","\\u2028").replaceAll("\u2029","\\u2029")}import{jsx as V}from"react/jsx-runtime";function $({data:z,id:Q}){return V("script",{dangerouslySetInnerHTML:{__html:K(z)},id:Q,type:"application/ld+json"})}export{$ as JsonLdScript};

//# debugId=C6DA3D85A9D4CB5964756E2164756E21
