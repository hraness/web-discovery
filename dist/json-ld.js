function q(z){return JSON.stringify(z).replaceAll("&","\\u0026").replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("\u2028","\\u2028").replaceAll("\u2029","\\u2029")}import{jsx as H}from"react/jsx-runtime";function V({data:z,id:F}){return H("script",{dangerouslySetInnerHTML:{__html:q(z)},id:F,type:"application/ld+json"})}export{V as JsonLdScript};

//# debugId=4F79D2CD0B8919DD64756E2164756E21
