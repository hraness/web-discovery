function K(z){return JSON.stringify(z).replaceAll("&","\\u0026").replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("\u2028","\\u2028").replaceAll("\u2029","\\u2029")}import{jsx as Y}from"react/jsx-runtime";function j({data:z,id:Q}){return Y("script",{dangerouslySetInnerHTML:{__html:K(z)},id:Q,type:"application/ld+json"})}export{j as JsonLdScript};

//# debugId=1E5B0B80D4F9423164756E2164756E21
