function K(z){return JSON.stringify(z).replaceAll("&","\\u0026").replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("\u2028","\\u2028").replaceAll("\u2029","\\u2029")}import{jsx as V}from"react/jsx-runtime";function j({data:z,id:Q}){return V("script",{dangerouslySetInnerHTML:{__html:K(z)},id:Q,type:"application/ld+json"})}export{j as JsonLdScript};

//# debugId=68E9FD61D297F6FC64756E2164756E21
